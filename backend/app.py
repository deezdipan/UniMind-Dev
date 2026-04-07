import json
import os
from datetime import datetime, timedelta

import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["http://localhost:5001", "http://localhost:3000"])

# ─── Firebase Admin ────────────────────────────────────────────────────────────
cred_path = os.getenv(
    "FIREBASE_CREDENTIALS",
    os.path.join(os.path.dirname(__file__), "firebase_credentials.json"),
)
if not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
db = firestore.client()

# ─── OpenRouter (LLM) ─────────────────────────────────────────────────────────
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "openai/gpt-3.5-turbo"


def call_llm(messages: list, max_tokens: int = 500) -> str:
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    resp = requests.post(
        OPENROUTER_URL,
        json={"model": MODEL, "messages": messages, "max_tokens": max_tokens},
        headers=headers,
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


# ─── Journal ───────────────────────────────────────────────────────────────────

@app.route("/api/journal", methods=["GET"])
def get_journal():
    user_id = request.args.get("user_id")
    days = int(request.args.get("days", 90))
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    cutoff = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    docs = (
        db.collection("journal_entries")
        .where("user_id", "==", user_id)
        .stream()
    )
    entries = [
        {"id": d.id, **d.to_dict()}
        for d in docs
        if d.to_dict().get("date", "") >= cutoff
    ]
    return jsonify({"entries": entries})


@app.route("/api/journal", methods=["POST"])
def add_journal():
    body = request.get_json()
    user_id = body.get("user_id")
    mood = body.get("mood")
    if not user_id or not mood:
        return jsonify({"error": "user_id and mood required"}), 400

    _, ref = db.collection("journal_entries").add({
        "user_id": user_id,
        "mood": mood,
        "mood_text": body.get("mood_text", ""),
        "date": body.get("date") or datetime.utcnow().strftime("%Y-%m-%d"),
        "created_at": datetime.utcnow().isoformat(),
    })
    return jsonify({"id": ref.id, "status": "created"}), 201


@app.route("/api/journal/<entry_id>", methods=["DELETE"])
def delete_journal(entry_id):
    user_id = request.args.get("user_id")
    doc_ref = db.collection("journal_entries").document(entry_id)
    doc = doc_ref.get()
    if not doc.exists:
        return jsonify({"error": "not found"}), 404
    if doc.to_dict().get("user_id") != user_id:
        return jsonify({"error": "forbidden"}), 403
    doc_ref.delete()
    return jsonify({"status": "deleted"})


# ─── Chat ──────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = (
    "You are UniMind, a warm and supportive AI mental wellness companion for university students. "
    "Keep responses concise (2-4 sentences), empathetic, and non-clinical. "
    "You can reference the user's upcoming calendar events when relevant. "
    "Never diagnose or replace professional mental health care."
)


@app.route("/api/chat/history", methods=["GET"])
def chat_history():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"messages": []})

    docs = (
        db.collection("chat_history")
        .where("user_id", "==", user_id)
        .limit(50)
        .stream()
    )
    messages = sorted([d.to_dict() for d in docs], key=lambda m: m.get("timestamp", ""))
    return jsonify({"messages": messages})


@app.route("/api/chat", methods=["POST"])
def chat():
    body = request.get_json()
    user_message = body.get("message", "").strip()
    user_id = body.get("user_id", "guest")
    calendar_events = body.get("calendar_events", [])

    if not user_message:
        return jsonify({"error": "message required"}), 400

    events_context = ""
    if calendar_events:
        lines = "\n".join(
            f"- {e['title']} on {e['date']} at {e['time']}" for e in calendar_events
        )
        events_context = f"\n\nUser's upcoming events:\n{lines}"

    ai_reply = call_llm([
        {"role": "system", "content": SYSTEM_PROMPT + events_context},
        {"role": "user", "content": user_message},
    ])

    timestamp = datetime.utcnow().isoformat()
    db.collection("chat_history").add({
        "user_id": user_id,
        "user_message": user_message,
        "ai_response": ai_reply,
        "timestamp": timestamp,
    })
    return jsonify({"response": ai_reply, "timestamp": timestamp})


# ─── Resources ─────────────────────────────────────────────────────────────────

GLOBAL_RESOURCES = [
    {
        "name": "Crisis Text Line",
        "url": "https://www.crisistextline.org",
        "description": "Text HOME to 741741 for free, 24/7 crisis support.",
    },
    {
        "name": "988 Suicide & Crisis Lifeline",
        "url": "https://988lifeline.org",
        "description": "Call or text 988 for immediate mental health support.",
    },
    {
        "name": "NAMI Helpline",
        "url": "https://www.nami.org/help",
        "description": "Call 1-800-950-6264 for guidance, referrals, and support.",
    },
    {
        "name": "The Jed Foundation",
        "url": "https://jedfoundation.org",
        "description": "Mental health resources specifically for college students.",
    },
]


@app.route("/api/resources", methods=["GET"])
def get_resources():
    school = request.args.get("school", "").strip()
    school_resources = []

    if school and OPENROUTER_API_KEY:
        prompt = (
            f"List 4 mental health or counseling resources specifically available at or near {school}. "
            "For each provide: name, a one-sentence description, and official URL if known. "
            'Respond as a JSON array only: [{"name": "", "description": "", "url": ""}].'
        )
        try:
            raw = call_llm([{"role": "user", "content": prompt}], max_tokens=600)
            clean = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
            school_resources = json.loads(clean)
        except Exception as e:
            print(f"Resources AI error: {e}")
            school_resources = [
                {
                    "name": f"{school} Counseling Center",
                    "description": "Contact your campus counseling center for support.",
                    "url": "",
                }
            ]

    return jsonify({"global": GLOBAL_RESOURCES, "school_specific": school_resources})


# ─── UniBoard ──────────────────────────────────────────────────────────────────

MOVE_MESSAGES = [
    "Take a 5-minute stretch break between study sessions.",
    "Drink a glass of water and step outside for fresh air.",
    "Write down one thing you're proud of today.",
    "Send a kind message to a friend or classmate.",
    "Close your eyes and take 5 deep breaths.",
    "Plan tomorrow's top 3 priorities tonight.",
    "Do a 10-minute walk — no phone, just you.",
]

DEFAULT_BOARD = {
    "xp": {"total": 0, "goal": 500},
    "badges": 0,
    "board_pos": 0,
    "progress": {
        "academics": 1,
        "mental_health": 1,
        "life_balance": 1,
        "connection": 1,
        "creativity": 1,
    },
}


def get_uniboard_doc(user_id: str) -> dict:
    ref = db.collection("uniboard").document(user_id)
    doc = ref.get()
    if not doc.exists:
        ref.set({"user_id": user_id, **DEFAULT_BOARD})
        return {"user_id": user_id, **DEFAULT_BOARD}
    return doc.to_dict()


@app.route("/api/uniboard", methods=["GET"])
def get_uniboard():
    user_id = request.args.get("user_id", "demo_user")
    data = get_uniboard_doc(user_id)
    day_index = datetime.utcnow().timetuple().tm_yday % len(MOVE_MESSAGES)
    return jsonify({**data, "move_message": MOVE_MESSAGES[day_index]})


@app.route("/api/xp", methods=["POST"])
def award_xp():
    body = request.get_json()
    user_id = body.get("user_id", "demo_user")
    amount = int(body.get("amount", 10))

    data = get_uniboard_doc(user_id)
    new_total = data["xp"]["total"] + amount
    new_badges = new_total // 100   # 1 badge per 100 XP
    new_pos = min(14, new_total // 35)  # advance board position

    db.collection("uniboard").document(user_id).update({
        "xp.total": new_total,
        "badges": new_badges,
        "board_pos": new_pos,
    })
    return jsonify({"xp_total": new_total, "badges": new_badges, "board_pos": new_pos})


if __name__ == "__main__":
    app.run(debug=True, port=8000)
