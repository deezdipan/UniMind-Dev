# UniMind

An AI-powered mental wellness companion for university students. UniMind helps students track their mood, manage their schedule, discover mental health resources, and stay motivated through a gamified wellness board.

## Features

- **AI Chat** — A supportive wellness companion powered by OpenRouter (GPT-3.5). Responds empathetically to check-ins and can reference your upcoming calendar events.
- **Mood Journal** — Log daily moods and short reflections. Visualize emotional trends over the past 7 days with a line chart.
- **Calendar** — Full month/week/day calendar backed by Firestore. Create, edit, and delete events with a clean modal interface.
- **Mental Health Resources** — Global crisis resources (988 Lifeline, Crisis Text Line, NAMI, Jed Foundation) plus AI-generated campus-specific resources for any university.
- **UniBoard** — A gamified wellness board where students earn XP and badges by completing weekly wellbeing challenges. Tracks progress across academics, mental health, life balance, connection, and creativity.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS |
| Auth | Auth0 |
| Backend | Python, Flask |
| Database | Firebase Firestore |
| AI | OpenRouter (GPT-3.5-turbo) |
| Calendar UI | react-big-calendar |
| Charts | Recharts |

## Project Structure

```
UniMindv2/
├── frontend/               # React + TypeScript app
│   ├── src/
│   │   ├── components/     # Dashboard, EventsCalendar, EventModal
│   │   ├── pages/          # Journal, Calendar, Resources, UniBoard, Login
│   │   ├── App.tsx         # Routing and sidebar layout
│   │   └── firebaseConfig.ts
│   └── package.json
├── backend/                # Flask API
│   ├── app.py              # All API routes
│   ├── requirements.txt
│   └── .env.example
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- A Firebase project with Firestore enabled
- An Auth0 account
- An OpenRouter API key

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Fill in your keys in .env
python app.py
```

Runs on `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm start
```

Runs on `http://localhost:5001`.

### Environment Variables

**`backend/.env`**

```
OPENROUTER_API_KEY=your_key
FIREBASE_CREDENTIALS=firebase_credentials.json
```

**`frontend/.env.local`**

```
REACT_APP_API_URL=http://localhost:8000
REACT_APP_AUTH0_DOMAIN=your_auth0_domain
REACT_APP_AUTH0_CLIENT_ID=your_auth0_client_id
```

### Firebase Setup

1. Create a Firebase project and enable Firestore.
2. Download the service account key (Project Settings → Service Accounts → Generate new private key) and save it as `backend/firebase_credentials.json`.
3. Set Firestore rules to allow read/write during development.

## API Routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/journal` | Fetch journal entries for a user |
| POST | `/api/journal` | Add a new journal entry |
| DELETE | `/api/journal/<id>` | Delete a journal entry |
| GET | `/api/chat/history` | Fetch chat history for a user |
| POST | `/api/chat` | Send a message to the AI companion |
| GET | `/api/resources` | Get global + school-specific mental health resources |
| GET | `/api/uniboard` | Get a user's wellness board state |
| POST | `/api/xp` | Award XP to a user |
