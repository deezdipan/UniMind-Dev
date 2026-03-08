import React, { useEffect, useState } from "react";
import axios from "axios";

type Link = { name: string; url?: string; description?: string };

const API_URL = "";

export default function Resources() {
  const [school, setSchool] = useState<string>(
    localStorage.getItem("unimind_school") || "University at Buffalo"
  );
  const [globalResources, setGlobalResources] = useState<Link[]>([]);
  const [schoolResources, setSchoolResources] = useState<Link[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchResources = async (schoolName: string) => {
    try {
      setLoading(true);
      setErr(null);
      const res = await axios.get(`${API_URL}/api/resources`, {
        params: { school: schoolName },
      });
      setGlobalResources(res.data.global || []);
      setSchoolResources(res.data.school_specific || []);
    } catch (e: any) {
      setErr("Couldn’t load resources. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources(school);
  }, []); // initial

  useEffect(() => {
    localStorage.setItem("unimind_school", school);
    fetchResources(school);
  }, [school]);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-purple-700">
          Mental Health Resources 🧠
        </h1>
      </div>

      {/* School selector */}
      <div className="mb-8 flex items-center gap-3">
        <label className="text-gray-700">School:</label>
        <input
          value={school}
          onChange={(e) => setSchool(e.target.value)}
          placeholder="Type your college/university"
          className="px-3 py-2 border rounded-lg w-full max-w-md focus:outline-none focus:ring-2 focus:ring-purple-300"
        />
      </div>

      {loading && (
        <div className="text-gray-600">Loading resources…</div>
      )}
      {err && <div className="text-red-600">{err}</div>}

      {!loading && !err && (
        <div className="space-y-10">
          {/* Global */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Global Support (24/7, free & confidential)
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {globalResources.map((r, i) => (
                <Card key={`g-${i}`} link={r} />
              ))}
            </div>
          </section>

          {/* School-specific */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Campus & Local — {school || "Select your school"}
            </h2>
            {!school && (
              <p className="text-gray-500 mb-4">
                Enter your school above to see campus resources.
              </p>
            )}
            <div className="grid gap-6 md:grid-cols-2">
              {schoolResources.length > 0 ? (
                schoolResources.map((r, i) => (
                  <Card key={`s-${i}`} link={r} />
                ))
              ) : (
                <div className="text-gray-500">
                  No campus resources yet. Try a different school name.
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Card({ link }: { link: Link }) {
  return (
    <div className="bg-white shadow-md rounded-xl p-5 border border-gray-200 hover:shadow-lg transition">
      <h3 className="text-lg font-semibold text-gray-800">{link.name}</h3>
      {link.description && (
        <p className="text-gray-700 mt-1 mb-3">{link.description}</p>
      )}
      {link.url && (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Visit Website →
        </a>
      )}
    </div>
  );
}

