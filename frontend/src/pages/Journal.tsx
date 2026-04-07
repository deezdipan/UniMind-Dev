import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth0 } from "@auth0/auth0-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useNavigate } from "react-router-dom";

interface JournalEntry {
  id?: string;
  mood: string;
  mood_text: string;
  date: string;
}

const Journal: React.FC = () => {
  const { user } = useAuth0(); // ✅ must be inside component
  const navigate = useNavigate();

  const userId = user?.sub || "guest_user"; // fallback for dev/test
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [mood, setMood] = useState("");
  const [moodText, setMoodText] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  // ✅ Fetch entries from Flask
  const fetchEntries = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/api/journal?user_id=${userId}&days=90`
      );
      const sorted = (res.data.entries || []).sort(
        (a: any, b: any) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setEntries(sorted);
    } catch (err) {
      console.error("Error fetching journal entries:", err);
    }
  };

  useEffect(() => {
    if (userId) fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ✅ Add entry
  const submitEntry = async () => {
    if (!mood) return alert("Please select a mood!");
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/journal`, {
        user_id: userId,
        mood,
        mood_text: moodText,
        date: date || new Date().toISOString().split("T")[0],
      });
      setMood("");
      setMoodText("");
      setDate("");
      fetchEntries();
    } catch (err) {
      console.error("Error submitting journal entry:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Delete entry
  const confirmDelete = async () => {
    if (!entryToDelete) return;
    try {
      await axios.delete(`${API_URL}/api/journal/${entryToDelete.id}?user_id=${userId}`);
      setEntryToDelete(null);
      fetchEntries();
    } catch (err) {
      console.error("Error deleting entry:", err);
    }
  };

  //below to show chronological order in the chart
  const displayedEntries = showAll ? entries : entries.slice(0, 3);
  const chartData = entries
  .filter((entry) => {
    const today = new Date();
    const entryDate = new Date(entry.date);
    const diffDays =
      (today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 7; // only last 7 days
  })
  .map((e) => ({
    ...e,
    date: new Date(e.date).toISOString().split("T")[0], // normalize date format
  }))
  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // chronological


  return (
    <div className="p-6 max-w-3xl mx-auto relative">
      {/* Back Button */}
      <button
        onClick={() => navigate("/")}
        className="absolute right-4 top-4 text-gray-500 hover:text-purple-700 text-xl"
        title="Back to Dashboard"
      >
        ← Back
      </button>

      <h1 className="text-3xl font-semibold mb-6 text-purple-800">📝 Mood Journal</h1>

      {/* Mood Selector */}
      <div className="flex gap-3 mb-3">
        {["happy", "neutral", "sad", "stressed"].map((m) => (
          <button
            key={m}
            onClick={() => setMood(m)}
            className={`px-4 py-2 rounded-lg border capitalize ${
              mood === m
                ? "bg-purple-200 border-purple-600"
                : "bg-white border-gray-300 hover:bg-purple-50"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Date Picker */}
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="border rounded-lg p-2 mb-3 w-full"
      />

      {/* Reflection box */}
      <textarea
        placeholder="Write a short reflection..."
        value={moodText}
        onChange={(e) => setMoodText(e.target.value)}
        className="w-full border rounded-lg p-3 mb-3"
        rows={3}
      />

      <button
        onClick={submitEntry}
        disabled={loading}
        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
      >
        {loading ? "Saving..." : "Save Entry"}
      </button>

      {/* Journal History */}
      <h2 className="text-xl font-semibold mt-8 mb-3">📅 Recent Entries</h2>

      <ul className="space-y-3">
        {displayedEntries.map((entry) => (
          <li
            key={entry.id}
            className="p-4 border rounded-lg bg-gray-50 flex flex-col gap-1 relative"
          >
            <button
              onClick={() => setEntryToDelete(entry)}
              className="absolute top-2 right-2 text-gray-400 hover:text-red-600"
              title="Delete Entry"
            >
              ✕
            </button>
            <span className="font-medium capitalize text-purple-700">
              Mood: {entry.mood}
            </span>
            <span className="text-gray-700">
              {entry.mood_text || "(no reflection)"}
            </span>
            <span className="text-sm text-gray-500">{entry.date}</span>
          </li>
        ))}
      </ul>

      {/* Show More / Less */}
      {entries.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-4 text-purple-700 hover:underline"
        >
          {showAll ? "Show Less" : "Show More"}
        </button>
      )}

      {/* Mood Trend Chart */}
      {entries.length > 0 && (() => {
        const moodScore: Record<string, number> = { happy: 4, neutral: 3, sad: 2, stressed: 1 };
        const moodColor: Record<string, string> = {
          happy: "#10B981",
          neutral: "#6B7280",
          sad: "#3B82F6",
          stressed: "#EF4444",
        };
        const moodLabel: Record<string, string> = {
          happy: "😊 Happy",
          neutral: "😐 Neutral",
          sad: "😢 Sad",
          stressed: "😤 Stressed",
        };

        const chartData = entries
          .filter((e) => {
            const diffDays = (Date.now() - new Date(e.date).getTime()) / (1000 * 60 * 60 * 24);
            return diffDays <= 7;
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map((e) => ({
            date: new Date(e.date).toLocaleDateString([], { month: "short", day: "numeric" }),
            score: moodScore[e.mood] ?? 3,
            mood: e.mood,
          }));

        return (
          <>
            <h2 className="text-xl font-semibold mt-8 mb-3">📈 Mood Trends (Last 7 Days)</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={[1, 4]} hide />
                <Tooltip
                  formatter={(_: any, __: any, props: any) => [
                    moodLabel[props.payload.mood] || props.payload.mood,
                    "Mood",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#8B5CF6"
                  strokeWidth={3}
                  dot={(props: any) => {
                    const color = moodColor[props.payload.mood] || "#8B5CF6";
                    return (
                      <circle
                        key={props.index}
                        cx={props.cx}
                        cy={props.cy}
                        r={6}
                        fill={color}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    );
                  }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-3 text-sm text-gray-600">
              {Object.entries(moodColor).map(([m, c]) => (
                <div key={m} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
                  <span className="capitalize">{m}</span>
                </div>
              ))}
            </div>
          </>
        );
      })()}


      {/* Delete Confirmation Modal */}
      {entryToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Are you sure you want to delete this entry?
            </h3>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEntryToDelete(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Journal;
export {};
