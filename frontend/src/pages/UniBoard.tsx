import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

interface UniBoardData {
  move_message: string;
  progress: Record<string, number>;
  xp: { total: number; goal: number };
  badges: number;
  board_pos: number;
}

const API_URL = ""; // same as before

// pool of wellbeing challenges
const WEEKLY_CHALLENGES = [
  "Do a 5-minute breathing exercise after classes.",
  "Journal about one thing that stressed you and one thing that went well.",
  "Text or call someone you trust and check in.",
  "Take a 20-minute walk without headphones.",
  "Declutter your study space for 10 minutes.",
  "Try a guided meditation from YouTube (5–10 mins).",
  "Go to bed 30 minutes earlier than usual tonight.",
  "Write down 3 things you’re grateful for.",
  "Do a screen break: no phone for 30 minutes.",
  "Plan your week to lower academic stress.",
  "Drink water before coffee in the morning.",
  "Watch or listen to something that makes you laugh.",
];

function getWeekOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff =
    (date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + start.getDay();
  return Math.floor(diff / 7);
}

const UniBoard: React.FC = () => {
  const { user } = useAuth0();
  const userId = user?.sub || "demo_user";
  const [data, setData] = useState<UniBoardData | null>(null);
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  // figure out this week
  const today = new Date();
  const week = getWeekOfYear(today);
  const year = today.getFullYear();
  const storageKey = `unimind_weekly_challenges_${year}_${week}`;

  // pick 3 for this week deterministically
  const primaryIndex = week % WEEKLY_CHALLENGES.length;
  const secondIndex = (week + 3) % WEEKLY_CHALLENGES.length;
  const thirdIndex = (week + 6) % WEEKLY_CHALLENGES.length;
  const thisWeeksChallenges = [
    { id: 0, text: WEEKLY_CHALLENGES[primaryIndex] },
    { id: 1, text: WEEKLY_CHALLENGES[secondIndex] },
    { id: 2, text: WEEKLY_CHALLENGES[thirdIndex] },
  ];

  // track which of the 3 the user completed (in localStorage for the week)
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const [confirmUncomplete, setConfirmUncomplete] = useState<number | null>(null);

  useEffect(() => {
    // load board
    const fetchBoard = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/uniboard`, { params: { user_id: userId } });
        setData(res.data);
      } catch (err) {
        console.error("Error fetching UniBoard:", err);
      }
    };
    fetchBoard();

    // load completed challenges for this week
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setCompletedIds(JSON.parse(saved));
      } catch {
        setCompletedIds([]);
      }
    }
  }, [storageKey, userId]);

  const handleUncompleteChallenge = async (challengeId: number) => {
    try {
      await axios.post(`${API_URL}/api/xp/deduct`, { user_id: userId, amount: 15 });
      setData((prev) =>
        prev ? { ...prev, xp: { ...prev.xp, total: Math.max(0, prev.xp.total - 15) } } : prev
      );
      const updated = completedIds.filter((id) => id !== challengeId);
      setCompletedIds(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setCompletionMessage("Challenge marked incomplete. 15 XP removed.");
      setTimeout(() => setCompletionMessage(null), 3500);
    } catch (err) {
      console.error("Error deducting XP:", err);
    } finally {
      setConfirmUncomplete(null);
    }
  };

  const handleCompleteChallenge = async (challengeId: number) => {
    if (completedIds.includes(challengeId)) return;

    try {
      // award XP on backend
      await axios.post(`${API_URL}/api/xp`, {
        user_id: userId,
        amount: 15,
      });

      // update UI XP instantly if we have board data
      setData((prev) =>
        prev
          ? {
              ...prev,
              xp: {
                ...prev.xp,
                total: prev.xp.total + 15,
              },
            }
          : prev
      );

      // mark as completed locally
      const updated = [...completedIds, challengeId];
      setCompletedIds(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));

      setCompletionMessage("Nice — challenge completed! You gained 15 XP 🌱");
      setTimeout(() => setCompletionMessage(null), 3500);
    } catch (err) {
      console.error("Error posting XP:", err);
      setCompletionMessage("Couldn't record XP right now.");
      setTimeout(() => setCompletionMessage(null), 3500);
    }
  };

  if (!data)
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        Loading Wellness Board...
      </div>
    );

  const progressColors = {
    academics: "bg-purple-400",
    mental_health: "bg-green-400",
    life_balance: "bg-blue-400",
    connection: "bg-pink-400",
    creativity: "bg-yellow-400",
  };

  const progressItems = Object.entries(data.progress);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-8 flex justify-center">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-6xl p-8 border border-purple-100">
        {/* message bubble */}
        {completionMessage && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            {completionMessage}
          </div>
        )}

        {/* Today's Move */}
        <div className="flex items-center gap-4 mb-8 bg-purple-50 p-5 rounded-2xl shadow-sm">
          <div className="text-5xl">🧘‍♀️</div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Today's Move</h2>
            <p className="text-gray-600 text-sm">{data.move_message}</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Game Board */}
          <div className="col-span-2 flex justify-center">
            <div className="relative w-[340px] h-[340px] rounded-2xl bg-purple-100 border-4 border-purple-300 flex flex-wrap justify-between p-4">
              {[
                "Self-Care",
                "Routine Master",
                "Mom",
                "Self-Care Session",
                "Career Plan",
                "Curious Circle",
                "Financial Step",
                "Mental Health",
                "Support Circle",
                "Family Care",
                "Campus Circle",
                "Curious Summer",
                "Refrocat",
                "Creative Outlet",
                "Wellness Board",
              ].map((label, i) => (
                <div
                    key={i}
                    className={`w-[65px] h-[65px] bg-white border border-purple-200 rounded-xl text-[10px] font-medium text-center flex items-center justify-center shadow-sm ${
                      i === data.board_pos ? "bg-yellow-100 border-yellow-300" : ""
                    }`}
                  >
                    {label}
                  </div>
              ))}

              {/* 🔴 removed bouncing emoji in center */}
            </div>
          </div>

          {/* Right Panel */}
          <div className="col-span-1 space-y-6">
            {/* Progress Tracker */}
            <div>
              <h3 className="font-semibold text-lg text-purple-700 mb-3">
                Progress Tracker
              </h3>
              <div className="space-y-3">
                {progressItems.map(([k, v]) => (
                  <div key={k} className="bg-purple-50 p-3 rounded-lg">
                    <div className="flex justify-between text-sm font-medium text-gray-700 capitalize">
                      <span>{k.replace("_", " ")}</span>
                      <span>{v}/5</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className={`${
                          progressColors[k as keyof typeof progressColors]
                        } h-2 rounded-full`}
                        style={{ width: `${(v / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* XP Tracker */}
            <div>
              <h3 className="font-semibold text-lg text-purple-700 mb-3">
                Semester XP
              </h3>
              <div className="bg-gray-200 rounded-full h-4 mb-2">
                <div
                  className="bg-purple-500 h-4 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      (data.xp.total / data.xp.goal) * 100
                    )}%`,
                  }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                {data.xp.total}/{data.xp.goal} XP
              </p>
            </div>

            {/* Badges */}
            <div>
              <h3 className="font-semibold text-lg text-purple-700 mb-3">
                Badges Earned 🏅
              </h3>
              <div className="flex gap-2 flex-wrap text-3xl">
                {Array.from({ length: Math.max(1, data.badges) }).map((_, i) => (
                  <span key={i}>
                    {i % 3 === 0 ? "🥇" : i % 3 === 1 ? "🥈" : "🥉"}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Challenges */}
        <div className="mt-10 mb-8 bg-white border border-purple-100 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-purple-700 mb-2">
            🌿 Weekly Wellbeing Challenges
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            Week {week + 1} — complete one to earn XP ✨
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {thisWeeksChallenges.map((challenge) => {
              const isDone = completedIds.includes(challenge.id);
              return (
                <div
                  key={challenge.id}
                  className={`bg-purple-50 rounded-lg p-4 border ${
                    isDone ? "border-green-200 bg-green-50" : "border-purple-100"
                  } flex flex-col justify-between gap-3`}
                >
                  <p className="text-sm text-gray-700 flex-1">{challenge.text}</p>
                  <button
                    onClick={() =>
                      isDone
                        ? setConfirmUncomplete(challenge.id)
                        : handleCompleteChallenge(challenge.id)
                    }
                    className={`px-3 py-2 rounded-md text-sm font-semibold transition ${
                      isDone
                        ? "bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600 border border-green-200"
                        : "bg-purple-600 text-white hover:bg-purple-700"
                    }`}
                  >
                    {isDone ? "Completed ✅" : "Mark Complete (+15 XP)"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reflection prompt */}
        <div className="text-center bg-purple-50 p-6 rounded-xl border border-purple-100 shadow-sm">
          <p className="text-gray-700 mb-3">
            You’ve been consistent with reflection!
            How are you feeling about your balance this week?
          </p>
          <button
            onClick={() => navigate("/journal")}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            Log Reflection
          </button>
        </div>
      </div>

      {/* Uncomplete confirmation modal */}
      {confirmUncomplete !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Mark as incomplete?</h3>
            <p className="text-sm text-gray-600 mb-6">
              This will remove <span className="font-semibold text-red-600">15 XP</span> from your total. Are you sure?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmUncomplete(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
              >
                Keep it
              </button>
              <button
                onClick={() => handleUncompleteChallenge(confirmUncomplete)}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-semibold"
              >
                Yes, remove XP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniBoard;
