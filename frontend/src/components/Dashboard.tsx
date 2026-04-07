import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

import { app } from '../firebaseConfig';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

const API_URL = '';

interface Message {
  user_message?: string;
  ai_response?: string;
  timestamp: string;
}

interface CalendarEvent {
  title: string;
  date: string;
  time: string;
  type: string;
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth0();
  const userId = user?.sub || 'demo_user';

  const [history, setHistory] = useState<Message[]>([]);       // past sessions from backend
  const [activeMessages, setActiveMessages] = useState<Message[]>([]); // this session only
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedMood, setSelectedMood] = useState<string>('');
  const db = getFirestore(app);
  const navigate = useNavigate();

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchCalendarEvents();
    if (user) fetchChatHistory();
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  const fetchChatHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/chat/history?user_id=${user?.sub}`);
      setHistory(res.data.messages || []);
    } catch (err) {
      console.error('Error loading chat history:', err);
    }
  };

  const fetchCalendarEvents = async () => {
    try {
      const q = query(collection(db, 'events'), where('user_id', '==', userId));
      const snapshot = await getDocs(q);
      const retrieved: CalendarEvent[] = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        const dateObj = new Date(data.start);
        return {
          title: data.title,
          date: dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' }),
          time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'custom',
        };
      });
      retrieved.sort((a, b) =>
        new Date(a.date + ' ' + a.time).getTime() - new Date(b.date + ' ' + b.time).getTime()
      );
      setEvents(retrieved.slice(0, 3));
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    const userMsg = inputMessage;
    setInputMessage('');
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/chat`, {
        message: userMsg,
        user_id: user?.sub || 'guest_user',
        calendar_events: events,
      });
      const newMessage: Message = {
        user_message: userMsg,
        ai_response: response.data.response,
        timestamp: response.data.timestamp,
      };
      setActiveMessages((prev) => [...prev, newMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMoodSelect = async (mood: string) => {
    setSelectedMood(mood);
    try {
      await addDoc(collection(db, 'journals'), {
        user_id: userId,
        mood,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error saving mood:', error);
    }
    try {
      await axios.post(`${API_URL}/api/journal`, { user_id: userId, mood, mood_text: '' });
    } catch (error) {
      console.error('Error logging mood to Flask:', error);
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return ts;
    }
  };

  const moods = [
    { emoji: '😔', value: 'sad' },
    { emoji: '😐', value: 'neutral' },
    { emoji: '😊', value: 'happy' },
    { emoji: '😁', value: 'excited' },
  ];

  return (
    <div className="flex-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-4xl font-bold text-sage-800">
          Welcome, {user?.given_name || user?.name || 'Friend'} 😌
        </h2>
        <div className="flex items-center gap-4">
          {user?.picture ? (
            <img src={user.picture} alt="Profile" className="w-10 h-10 rounded-full border border-sage-300 shadow-sm" />
          ) : (
            <div className="w-10 h-10 bg-lavender-300 rounded-full flex items-center justify-center text-white">👤</div>
          )}
        </div>
      </div>

      <h3 className="text-3xl font-semibold text-sage-700 mb-6">AI-Powered Mental Wellness Companion</h3>

      {/* Top row: Upcoming Events + Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        {/* Upcoming Events */}
        <div className="lg:col-span-1 bg-sage-50 rounded-xl p-6 border border-sage-200">
          <h4 className="text-lg font-semibold text-sage-800 mb-4">Upcoming Events</h4>
          <div className="space-y-3 mb-4">
            {events.length === 0 && (
              <p className="text-sm text-sage-500">No upcoming events.</p>
            )}
            {events.map((event, index) => (
              <div key={index} className="bg-white rounded-lg p-3">
                <p className="font-medium text-sage-800">{event.title}</p>
                <p className="text-sm text-sage-600">{event.date} - {event.time}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate('/calendar')}
            className="w-full px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 transition"
          >
            View Full Calendar
          </button>
        </div>

        {/* Chat panel: history sidebar + active chat */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-lavender-200 flex overflow-hidden" style={{ minHeight: '380px' }}>

          {/* Chat History Sidebar */}
          <div className="w-48 flex-shrink-0 border-r border-lavender-100 bg-lavender-50 flex flex-col">
            <div className="px-4 py-3 border-b border-lavender-100">
              <p className="text-xs font-semibold text-lavender-700 uppercase tracking-wide">History</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {history.length === 0 && (
                <p className="text-xs text-sage-400 p-4">No past conversations yet.</p>
              )}
              {history.map((msg, i) => (
                <div key={i} className="px-3 py-3 border-b border-lavender-100 hover:bg-lavender-100 transition">
                  {msg.user_message && (
                    <p className="text-xs font-medium text-sage-800 truncate">
                      You: {msg.user_message}
                    </p>
                  )}
                  {msg.ai_response && (
                    <p className="text-xs text-sage-500 truncate mt-0.5">
                      🤖 {msg.ai_response}
                    </p>
                  )}
                  <p className="text-[10px] text-sage-400 mt-1">{formatTimestamp(msg.timestamp)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Active Chat */}
          <div className="flex-1 flex flex-col p-5">
            <div className="flex items-center mb-4">
              <div className="text-2xl mr-2">💬</div>
              <h4 className="text-lg font-semibold text-lavender-800">Quick Check-In</h4>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {activeMessages.length === 0 && (
                <div className="text-center py-8 text-sage-500">
                  <p>Start a new conversation...</p>
                  <p className="text-sm mt-1">How are you feeling today?</p>
                </div>
              )}
              {activeMessages.map((msg, index) => (
                <div key={index}>
                  {msg.user_message && (
                    <div className="bg-lavender-100 rounded-lg p-3 mb-2 ml-8">
                      <p className="text-sage-800">{msg.user_message}</p>
                    </div>
                  )}
                  {msg.ai_response && (
                    <div className="bg-sage-100 rounded-lg p-3 mr-8">
                      <div className="flex items-start">
                        <span className="text-2xl mr-2">🤖</span>
                        <p className="text-sage-800 flex-1">{msg.ai_response}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a response..."
                className="flex-1 px-4 py-3 border border-sage-300 rounded-lg focus:outline-none focus:border-lavender-400"
                disabled={loading}
              />
              <button
                onClick={handleSendMessage}
                disabled={loading}
                className="px-6 py-3 bg-lavender-500 text-white rounded-lg hover:bg-lavender-600 disabled:opacity-50"
              >
                {loading ? '...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mood + UniQuest */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mood Tracker */}
        <div className="bg-gold-50 rounded-xl p-6 border border-gold-200">
          <h4 className="text-lg font-semibold text-gold-800 mb-4">Log your mood</h4>
          <p className="text-sage-700 mb-4">How are you feeling?</p>
          <div className="flex gap-4 justify-center">
            {moods.map((mood) => (
              <button
                key={mood.value}
                onClick={() => handleMoodSelect(mood.value)}
                className={`text-4xl hover:scale-110 transition-transform ${selectedMood === mood.value ? 'scale-125' : ''}`}
              >
                {mood.emoji}
              </button>
            ))}
          </div>
          {selectedMood && (
            <p className="text-center mt-4 text-sage-600">Mood logged! Keep tracking your emotional journey.</p>
          )}
        </div>

        {/* UniQuest Board Preview */}
        <div
          onClick={() => {
            localStorage.setItem('unimind_last_uniboard_open', Date.now().toString());
            navigate('/uniboard');
          }}
          className="bg-lavender-50 rounded-xl p-6 border border-lavender-200 cursor-pointer hover:shadow-md transition"
        >
          <h4 className="text-lg font-semibold text-lavender-800 mb-4">UniQuest Board</h4>
          <div className="text-center py-8">
            <div className="text-5xl mb-4">🏆</div>
            <p className="text-sage-700">Track personal progress</p>
            <p className="text-sm text-sage-600 mt-2">Complete wellness actions to advance on your journey</p>
            <p className="mt-3 text-sm text-lavender-700 underline">Open UniBoard →</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
