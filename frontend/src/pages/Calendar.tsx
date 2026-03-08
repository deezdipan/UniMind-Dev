import React, { useEffect, useState } from "react";
import { Calendar, dateFnsLocalizer, Views, Event, View } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { format, parse, startOfWeek, getDay, addMonths, subMonths } from "date-fns"; 
import { enUS } from "date-fns/locale"; 

import { 
    getFirestore,
    collection,
    addDoc,
    getDocs,
    doc,
    deleteDoc,
    updateDoc,
    query,
    where,
    orderBy,
    DocumentData,
} from "firebase/firestore";
import { app } from "../firebaseConfig";
import { useAuth0 } from "@auth0/auth0-react"; 
import EventModal from "../components/EventModal"; 

// --- LOCALIZER SETUP ---
const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// --- Define Custom Event Type ---
interface MyEvent extends Event {
    id: string; 
    title: string;
    start: Date;
    end: Date;
    isNew?: boolean; // flag for temporary event creation
}

// --- Custom event component (ensures clicks work) ---
const CustomEvent = (props: any) => {
    const handleEventClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (typeof props.parentSelectEvent === "function") {
            props.parentSelectEvent(props.event);
        }
    };

    return (
        <div
            onClick={handleEventClick}
            style={{ height: "100%", cursor: "pointer" }}
            title={props.event.title}
        >
            {props.title}
        </div>
    );
};

// --- Custom Toolbar (month/week/day buttons & nav) ---
const CustomToolbar = (props: any) => {
    const { setCurrentDate, setCurrentView, currentDate, currentView } = props;

    const navigate = (action: "NEXT" | "PREV" | "TODAY") => {
        let newDate = currentDate;
        if (action === "TODAY") newDate = new Date();
        else if (action === "NEXT") newDate = addMonths(currentDate, 1);
        else if (action === "PREV") newDate = subMonths(currentDate, 1);
        setCurrentDate(newDate);
    };

    const viewChange = (view: View) => setCurrentView(view);
    const toolbarLabel = format(props.date, "MMMM yyyy");

    return (
        <div className="rbc-toolbar mb-4 flex justify-between items-center border-b pb-2">
            <span className="rbc-btn-group flex gap-2">
                <button className="px-3 py-1 border rounded-md hover:bg-gray-100" onClick={() => navigate("TODAY")}>Today</button>
                <button className="px-3 py-1 border rounded-md hover:bg-gray-100" onClick={() => navigate("PREV")}>Back</button>
                <button className="px-3 py-1 border rounded-md hover:bg-gray-100" onClick={() => navigate("NEXT")}>Next</button>
            </span>
            <span className="rbc-toolbar-label font-semibold text-lg">{toolbarLabel}</span>
            <span className="rbc-btn-group flex gap-1">
                {["month", "week", "day"].map((view) => (
                    <button
                        key={view}
                        className={`px-3 py-1 border rounded-md text-sm transition ${
                            currentView === view ? "bg-indigo-600 text-white" : "bg-white hover:bg-gray-100"
                        }`}
                        onClick={() => viewChange(view as View)}
                    >
                        {view.charAt(0).toUpperCase() + view.slice(1)}
                    </button>
                ))}
            </span>
        </div>
    );
};

const CalendarPage: React.FC = () => {
    const { user } = useAuth0();
    const db = getFirestore(app);
    const userId = user?.sub ?? "demo_user";

    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState<View>(Views.MONTH);
    const [events, setEvents] = useState<MyEvent[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<MyEvent | null>(null);

    // Load events
    const loadEvents = async () => {
        const q = query(collection(db, "events"), where("user_id", "==", userId), orderBy("start", "asc"));
        const snapshot = await getDocs(q);
        const loadedEvents: MyEvent[] = snapshot.docs.map((doc) => {
            const data = doc.data() as DocumentData;
            const getValidDate = (value: any): Date =>
                value && typeof value.toDate === "function" ? value.toDate() : new Date(value);
            return {
                id: doc.id,
                title: data.title,
                start: getValidDate(data.start),
                end: getValidDate(data.end),
            };
        });
        setEvents(loadedEvents);
    };
    useEffect(() => { loadEvents(); }, [userId]);

    // --- SLOT HANDLER (creates new event via modal) ---
    const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
        setSelectedEvent({ id: "temp", title: "", start, end, isNew: true });
    };

    // --- EVENT HANDLER (edit/delete) ---
    const handleSelectEvent = (event: MyEvent) => setSelectedEvent(event);

    const handleUpdateOrDelete = async (
        action: "update" | "delete" | "create",
        title?: string,
        newStart?: Date,
        newEnd?: Date
    ) => {
        if (!title || !newStart || !newEnd) return;
        const dateFormat = "yyyy-MM-dd'T'HH:mm:ss";

        if (action === "create") {
            await addDoc(collection(db, "events"), {
                user_id: userId,
                title,
                start: format(newStart, dateFormat),
                end: format(newEnd, dateFormat),
                created_at: new Date().toISOString(),
            });
        } else if (action === "delete" && selectedEvent) {
            await deleteDoc(doc(db, "events", selectedEvent.id));
        } else if (action === "update" && selectedEvent) {
            await updateDoc(doc(db, "events", selectedEvent.id), {
                title,
                start: format(newStart, dateFormat),
                end: format(newEnd, dateFormat),
            });
        }
        setSelectedEvent(null);
        loadEvents();
    };

    const handleCloseModal = () => setSelectedEvent(null);
    const handleNavigate = (newDate: Date) => setCurrentDate(newDate);
    const handleViewChange = (newView: View) => setCurrentView(newView);

    return (
        <div className="p-8">
            <h2 className="text-3xl font-semibold text-sage-800 mb-6">Calendar</h2>
            <div className="bg-white p-4 rounded-xl border border-sage-200 shadow-sm">
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    selectable
                    onSelectEvent={handleSelectEvent}
                    onSelectSlot={handleSelectSlot}
                    date={currentDate}
                    onNavigate={handleNavigate}
                    view={currentView}
                    onView={handleViewChange}
                    key={`${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentView}`}
                    views={[Views.MONTH, Views.WEEK, Views.DAY]}
                    style={{ height: 600 }}
                    components={{
                        toolbar: (props) => (
                            <CustomToolbar
                                currentDate={currentDate}
                                setCurrentDate={setCurrentDate}
                                currentView={currentView}
                                setCurrentView={setCurrentView}
                                {...props}
                            />
                        ),
                        event: (props) => <CustomEvent {...props} parentSelectEvent={handleSelectEvent} />,
                    }}
                />
            </div>

            {/* Modal for creating/editing */}
            {selectedEvent && (
                <EventModal
                    event={selectedEvent}
                    onClose={handleCloseModal}
                    isNew={!!selectedEvent.isNew}
                    onAction={handleUpdateOrDelete}
                />
            )}
        </div>
    );
};

export default CalendarPage;
