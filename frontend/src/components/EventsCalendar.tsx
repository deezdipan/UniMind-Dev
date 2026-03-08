import React, { useEffect, useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, Views, SlotInfo, Event } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { app } from "../firebaseConfig";
import { useAuth0 } from "@auth0/auth0-react";

// ----- Localizer using date-fns -----
const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

type FirestoreEvent = {
  id?: string;
  user_id: string;
  title: string;
  start: string;   // ISO string
  end: string;     // ISO string
  allDay?: boolean;
  notes?: string;
};

type CalendarEvent = {
  id?: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  notes?: string;
};

const EventsCalendar: React.FC = () => {
  const db = getFirestore(app);
  const { user } = useAuth0();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  const userId = user?.sub ?? "anonymous";

  const fetchEvents = async () => {
    try {
      const qRef = query(
        collection(db, "events"),
        where("user_id", "==", userId),
        orderBy("start", "asc")
      );
      const snap = await getDocs(qRef);

      const items: CalendarEvent[] = snap.docs.map((d) => {
        const data = d.data() as FirestoreEvent;
        return {
          id: d.id,
          title: data.title,
          start: new Date(data.start),
          end: new Date(data.end),
          allDay: data.allDay,
          notes: data.notes,
        };
      });

      setEvents(items);
    } catch (e) {
      console.error("Fetch events error:", e);
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // When the user clicks/drag-selects a slot on the calendar
  const handleSelectSlot = (slotInfo: SlotInfo) => {
    const start = new Date(slotInfo.start);
    const end = new Date(slotInfo.end);
    setDraftStart(start);
    setDraftEnd(end);
    setDraftTitle("");
    setDraftNotes("");
    setShowModal(true);
  };

  // When the user clicks an existing event -> option to delete or edit
  const handleSelectEvent = async (event: Event & { id?: string; notes?: string }) => {
    const choice = window.prompt(
  `Edit title or type "DELETE" to remove:\n\nCurrent: ${String(event.title)}`,
  String(event.title) 
);

    if (choice === null) return;

    if (choice.trim().toUpperCase() === "DELETE") {
      if (event.id) {
        await deleteDoc(doc(db, "events", event.id));
        fetchEvents();
      }
      return;
    }

    // Update title
    if (event.id) {
      await updateDoc(doc(db, "events", event.id), { title: choice });
      fetchEvents();
    }
  };

  const saveEvent = async () => {
    if (!userId || !draftTitle || !draftStart || !draftEnd) return;
    try {
      setSaving(true);
      await addDoc(collection(db, "events"), {
        user_id: userId,
        title: draftTitle,
        start: draftStart.toISOString(),
        end: draftEnd.toISOString(),
        allDay: false,
        notes: draftNotes || "",
        created_at: new Date().toISOString(),
      });
      setShowModal(false);
      setDraftTitle("");
      setDraftNotes("");
      setDraftStart(null);
      setDraftEnd(null);
      fetchEvents();
    } catch (e) {
      console.error("Save event error:", e);
    } finally {
      setSaving(false);
    }
  };

  // Tailwind-friendly container styling (keeps UniMind vibe)
  const containerClass =
    "bg-white rounded-xl p-4 border border-sage-200 shadow-sm";

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-lg font-semibold text-sage-800">Calendar</h4>
        <span className="text-sage-600 text-sm">Click/drag on the calendar to create an event</span>
      </div>

      <div className="rounded-lg overflow-hidden border border-sage-200">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          defaultView={Views.MONTH}
          views={[Views.MONTH, Views.WEEK, Views.DAY]}
          style={{ height: 640 }}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
        />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-sage-200 shadow-xl">
            <h5 className="text-xl font-semibold text-sage-800 mb-4">Add Event</h5>

            <div className="space-y-3">
              <input
                className="w-full border border-sage-300 rounded-lg px-3 py-2 focus:outline-none focus:border-lavender-400"
                placeholder="Title (e.g., Physics Exam)"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-sage-600">Start</label>
                  <input
                    type="datetime-local"
                    className="w-full border border-sage-300 rounded-lg px-3 py-2 focus:outline-none focus:border-lavender-400"
                    value={
                      draftStart
                        ? new Date(draftStart.getTime() - draftStart.getTimezoneOffset() * 60000)
                            .toISOString()
                            .slice(0, 16)
                        : ""
                    }
                    onChange={(e) => setDraftStart(new Date(e.target.value))}
                  />
                </div>

                <div>
                  <label className="text-xs text-sage-600">End</label>
                  <input
                    type="datetime-local"
                    className="w-full border border-sage-300 rounded-lg px-3 py-2 focus:outline-none focus:border-lavender-400"
                    value={
                      draftEnd
                        ? new Date(draftEnd.getTime() - draftEnd.getTimezoneOffset() * 60000)
                            .toISOString()
                            .slice(0, 16)
                        : ""
                    }
                    onChange={(e) => setDraftEnd(new Date(e.target.value))}
                  />
                </div>
              </div>

              <textarea
                className="w-full border border-sage-300 rounded-lg px-3 py-2 focus:outline-none focus:border-lavender-400"
                placeholder="Notes (optional)"
                rows={3}
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-3 justify-end mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border border-sage-300 text-sage-700 hover:bg-sage-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEvent}
                disabled={saving || !draftTitle || !draftStart || !draftEnd}
                className="px-4 py-2 rounded-lg bg-lavender-500 text-white hover:bg-lavender-600 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsCalendar;
