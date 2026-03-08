// src/App.tsx
import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  Outlet,
} from "react-router-dom";

import DashboardPage from "./components/Dashboard";
import Resources from "./pages/Resources";
import Login from "./pages/Login";
import Journal from "./pages/Journal";
import Calendar from "./pages/Calendar";
// 👇 add this line — you already have src/pages/UniBoard.tsx
import UniBoard from "./pages/UniBoard";

import "./App.css";

// ---- MainLayout stays the same, we just add a UniBoard link ----
const MainLayout: React.FC = () => {
  const { logout, user } = useAuth0();
  const navigate = useNavigate();
  const path = window.location.pathname;

  const NavLink = ({
    to,
    label,
    onClick,
  }: {
    to: string;
    label: string;
    onClick: () => void;
  }) => (
    <div
      onClick={onClick}
      className={`px-4 py-3 rounded-lg font-medium cursor-pointer transition ${
        path === to || (to === "/" && path === "/")
          ? "bg-sage-100 text-sage-800"
          : "text-sage-600 hover:bg-sage-50"
      }`}
    >
      {label}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 via-lavender-50 to-gold-50">
      <div className="flex">
        <aside className="w-64 bg-white border-r border-sage-200 min-h-screen p-6">
          <div className="flex items-center mb-8">
            <div className="text-3xl mr-2">🧠</div>
            <h1 className="text-2xl font-bold text-sage-800">UniMind</h1>
          </div>
          <nav className="space-y-2">
            <NavLink to="/" label="Dashboard" onClick={() => navigate("/")} />
            <NavLink
              to="/journal"
              label="Journal"
              onClick={() => navigate("/journal")}
            />
            <NavLink
              to="/calendar"
              label="Calendar"
              onClick={() => navigate("/calendar")}
            />
            <NavLink
              to="/resources"
              label="Resources"
              onClick={() => navigate("/resources")}
            />
            {/* 👇 NEW: UniBoard in the sidebar */}
            <NavLink
              to="/uniboard"
              label="UniBoard"
              onClick={() => navigate("/uniboard")}
            />
          </nav>

          <div className="mt-8 pt-6 border-t border-sage-100">
            <div className="flex items-center justify-between mb-4">
              {user?.picture && (
                <img
                  src={user.picture}
                  alt="Profile"
                  className="w-8 h-8 rounded-full border border-sage-300 shadow-sm"
                />
              )}
              <button
                onClick={() =>
                  logout({
                    logoutParams: { returnTo: window.location.origin },
                  })
                }
                className="px-3 py-1 text-sm bg-lavender-400 hover:bg-lavender-500 text-white rounded-lg shadow-sm transition"
              >
                Logout
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

function App() {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-lg text-gray-600">
        Loading UniMind... 🌸
      </div>
    );
  }

  return (
    <Router>
      {isAuthenticated ? (
        <Routes>
          {/* everything under the layout */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="resources" element={<Resources />} />
            <Route path="journal" element={<Journal />} />
            {/* 👇 NEW: route to your UniBoard page */}
            <Route path="uniboard" element={<UniBoard />} />

            <Route path="*" element={<DashboardPage />} />
          </Route>
        </Routes>
      ) : (
        <Login />
      )}
    </Router>
  );
}

export default App;
