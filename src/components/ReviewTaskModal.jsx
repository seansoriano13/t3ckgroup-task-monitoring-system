import { useState } from "react";

import { X, CheckCircle, XCircle } from "lucide-react";

export default function ReviewTaskModal({
  onClose,
  task,
  onApprove,
  onReject,
}) {
  const [remarks, setRemarks] = useState("");
  const [grade, setGrade] = useState(0);

  const handleCloseAndReset = () => {
    onClose(); // Triggers the slide-out animation

    // Clear the form AFTER the 300ms Tailwind transition finishes
    // so the text doesn't magically vanish while the drawer is sliding away!
    setTimeout(() => {
      setRemarks("");
      setGrade(0);
    }, 300);
  };

  const handleApproveClick = () => {
    onApprove({ ...task, remarks, grade, status: "COMPLETE" });
    handleCloseAndReset();
  };

  const handleRejectClick = () => {
    onReject({ ...task, remarks, grade, status: "NOT APPROVED" });
    handleCloseAndReset();
  };

  if (!task) return null;

  return (
    <>
      <div
        className="dropdown-backdrop transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-gray-2 border-l border-gray-4 shadow-2xl z-9999 transform transition-transform duration-300 flex flex-col">
        {/* HEADER */}
        <div className="flex justify-between items-center p-6 border-b border-gray-4 bg-gray-1">
          <h2 className="text-lg font-bold text-gray-12">Review Task</h2>
          <button
            onClick={handleCloseAndReset}
            className="text-gray-9 hover:text-red-9 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY (Read-Only Task Info) */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="flex-between">
            <span className="text-sm font-bold text-gray-11 bg-gray-3 px-3 py-1.5 rounded-md border border-gray-4">
              {task.categoryId}
            </span>
            <p className="text-xs font-bold text-gray-9 uppercase">
              Logged By:{" "}
              <span className="text-gray-12">{task.loggedByName}</span>
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold text-gray-9 uppercase mb-2">
              Description
            </h3>
            <div className="bg-gray-1 p-5 rounded-xl border border-gray-4 text-gray-12 text-sm shadow-sm">
              {task.taskDescription}
            </div>
          </div>
        </div>

        {/* THE MANAGER'S CONTROL PANEL (Sticky at bottom) */}
        <div className="p-6 border-t border-gray-4 bg-gray-1 space-y-5 mt-auto">
          {/* Grade Selector (1 to 5) */}
          <div>
            <label className="block text-xs font-bold text-gray-10 uppercase tracking-wider mb-2">
              Performance Grade (1-5)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => setGrade(num)}
                  className={`flex-1 py-2 rounded-lg font-bold border transition-all ${
                    grade === num
                      ? "bg-primary text-gray-12 border-primary shadow-lg shadow-red-a3"
                      : "bg-gray-2 text-gray-9 border-gray-4 hover:border-gray-6"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Remarks (Mandatory for rejection!) */}
          <div>
            <label className="block text-xs font-bold text-gray-10 uppercase tracking-wider mb-2">
              Manager Remarks
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add feedback or explain why it needs revision..."
              className="w-full bg-gray-2 border border-gray-4 text-gray-12 rounded-lg p-3 outline-none focus:border-red-9 transition-colors h-20 resize-none text-sm placeholder:text-gray-7"
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleRejectClick}
              className="flex-center gap-2 py-3 rounded-lg font-bold bg-gray-3 text-red-500 border border-red-900/30 hover:bg-red-900/20 transition-colors"
            >
              <XCircle size={18} /> Needs Fix
            </button>
            <button
              onClick={handleApproveClick}
              disabled={grade === 0}
              className="flex-center gap-2 py-3 rounded-lg font-bold bg-green-600 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-500 transition-colors"
            >
              <CheckCircle size={18} /> Approve
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
