import React, { useState } from "react";
import { format, setHours, setMinutes } from "date-fns";

interface EventModalProps {
    event: { id: string; title: string; start: Date; end: Date };
    onClose: () => void;
    isNew: boolean;
    onAction: (action: "update" | "delete" | "create", newTitle?: string, newStart?: Date, newEnd?: Date) => void;
}

const EventModal: React.FC<EventModalProps> = ({ event, onClose, isNew, onAction }) => {
    const [currentTitle, setCurrentTitle] = useState(event.title);
    const getFormattedTime = (date: Date) => format(date, "HH:mm");
    const [currentStartTime, setCurrentStartTime] = useState(getFormattedTime(event.start));
    const [currentEndTime, setCurrentEndTime] = useState(getFormattedTime(event.end));

    const formattedDate =
        event.start.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        }) +
        ` (${format(event.start, "h:mm a")} - ${format(event.end, "h:mm a")})`;

    const getCombinedDateTime = (baseDate: Date, timeString: string): Date => {
        const [hours, minutes] = timeString.split(":").map(Number);
        let newDate = setHours(baseDate, hours);
        newDate = setMinutes(newDate, minutes);
        return newDate;
    };

    const handleSave = () => {
        if (currentTitle.trim() === "") {
            console.error("Title cannot be empty.");
            return;
        }
        const newStart = getCombinedDateTime(event.start, currentStartTime);
        const newEnd = getCombinedDateTime(event.end, currentEndTime);
        onAction(isNew ? "create" : "update", currentTitle, newStart, newEnd);
    };

    const handleDelete = () => {
        if (window.confirm(`Delete event "${event.title}"?`)) {
            onAction("delete");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[1000]">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm border border-gray-100">
                <h3 className="text-2xl font-bold text-gray-800 mb-1">
                    {isNew ? "Create New Event" : "Edit Event"}
                </h3>
                <p className="text-sm text-gray-500 mb-4 border-b pb-3 font-medium">{formattedDate}</p>

                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Event Title</label>
                        <input
                            type="text"
                            value={currentTitle}
                            onChange={(e) => setCurrentTitle(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            placeholder="e.g., Physics Exam"
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                            <input
                                type="time"
                                value={currentStartTime}
                                onChange={(e) => setCurrentStartTime(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                            <input
                                type="time"
                                value={currentEndTime}
                                onChange={(e) => setCurrentEndTime(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center mt-4">
                    {!isNew && (
                        <button
                            onClick={handleDelete}
                            className="text-sm font-semibold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition shadow-md"
                        >
                            Delete
                        </button>
                    )}

                    <span className="flex gap-3 ml-auto">
                        <button
                            onClick={onClose}
                            className="text-sm font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg"
                        >
                            Cancel
                        </button>

                        <button
                            onClick={handleSave}
                            className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg"
                        >
                            {isNew ? "Create Event" : "Save Changes"}
                        </button>
                    </span>
                </div>
            </div>
        </div>
    );
};

export default EventModal;
