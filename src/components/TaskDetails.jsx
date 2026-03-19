import React from "react";
import StatusBadge from "./StatusBadge";
import { X } from "lucide-react"; // Using lucide for a cleaner close icon

export default function TaskDetails({ isOpen, onClose, task }) {
  if (!task) return null;

  const formattedDate = task.createdAt
    ? new Date(task.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unknown Date";

  return (
    <>
      {/* 1. The Dimmed Backdrop */}
      <div
        className={`dropdown-backdrop transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* 2. The Slide-In Panel (Tactical Dark Theme) */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-gray-2 border-l border-gray-4 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-4 bg-gray-1">
          <h2 className="text-lg font-bold text-gray-12">Task Overview</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full text-gray-9 hover:bg-gray-3 hover:text-red-9 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-8">
          {/* Top Tags */}
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-gray-9 uppercase tracking-wider mb-2">
                Project Code
              </p>
              <span className="text-sm font-bold text-gray-11 bg-gray-3 px-3 py-1.5 rounded-md border border-gray-4 shadow-sm">
                {task.categoryId}
              </span>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-gray-9 uppercase tracking-wider mb-2">
                Status
              </p>
              <StatusBadge status={task.status} />
            </div>
          </div>

          {/* Main Description */}
          <div>
            <h3 className="text-xs font-bold text-gray-9 uppercase tracking-wider mb-2">
              Description
            </h3>
            <div className="bg-gray-1 p-5 rounded-xl border border-gray-4 text-gray-12 leading-relaxed text-sm whitespace-pre-wrap shadow-sm">
              {task.taskDescription}
            </div>
          </div>

          {/* Meta Data Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-1 p-4 rounded-xl border border-gray-4 shadow-sm">
              <p className="text-xs text-gray-9 font-bold uppercase tracking-wider mb-1">
                Logged By
              </p>
              <p className="text-sm font-bold text-gray-12">
                {task.loggedByName}
              </p>
            </div>

            <div className="bg-gray-1 p-4 rounded-xl border border-gray-4 shadow-sm">
              <p className="text-xs text-gray-9 font-bold uppercase tracking-wider mb-1">
                Priority
              </p>
              <p
                className={`text-sm font-bold ${
                  task.priority === "HIGH" ? "text-red-9" : "text-gray-12"
                }`}
              >
                {task.priority || "NORMAL"}
              </p>
            </div>

            <div className="bg-gray-1 p-4 rounded-xl border border-gray-4 col-span-2 shadow-sm">
              <p className="text-xs text-gray-9 font-bold uppercase tracking-wider mb-1">
                Timestamp
              </p>
              <p className="text-sm font-bold text-gray-12">{formattedDate}</p>
            </div>
          </div>

          {/* Conditional UI: If task is rejected, show why (TG Red styling) */}
          {task.status === "REJECTED" && (
            <div className="bg-red-a2 border border-red-a5 p-5 rounded-xl">
              <h4 className="text-xs font-bold text-red-9 uppercase tracking-wider mb-2">
                Manager Remarks
              </h4>
              <p className="text-sm text-red-11 leading-relaxed">
                {task.remarks || "No remarks provided."}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-4 bg-gray-1">
          <button
            onClick={onClose}
            className="w-full bg-gray-3 border border-gray-4 text-gray-12 font-bold py-2.5 rounded-lg hover:bg-gray-4 transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </>
  );
}
