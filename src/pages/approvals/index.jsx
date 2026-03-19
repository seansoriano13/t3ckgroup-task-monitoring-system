import { useState } from "react";
import { MOCK_TASKS } from "../../data/tasks.js";
import ProtectedRoute from "../../components/ProtectedRoute.jsx";
import ReviewTaskModal from "../../components/ReviewTaskModal";
import TaskCard from "../../components/TaskCard.jsx";

export default function ApprovalsPage() {
  // Only show tasks that need approval
  const [pendingTasks, setPendingTasks] = useState(
    MOCK_TASKS.filter((task) => task.status === "INCOMPLETE"),
  );

  const [reviewTask, setReviewTask] = useState(null);

  // Mock Handlers to test the UI flow
  const handleApprove = (updatedTask) => {
    console.log("Approved! Pushing to DB:", updatedTask);
    // Remove it from the UI queue
    setPendingTasks((prev) => prev.filter((t) => t.id !== updatedTask.id));
    setReviewTask(null);
  };

  const handleReject = (updatedTask) => {
    if (!updatedTask.remarks) {
      alert("You must provide remarks when rejecting a task!");
      return;
    }
    console.log("Rejected! Pushing to DB:", updatedTask);
    // Remove it from the UI queue
    setPendingTasks((prev) => prev.filter((t) => t.id !== updatedTask.id));
    setReviewTask(null);
  };

  return (
    <ProtectedRoute requireHead={true}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex-between items-end border-b border-gray-4 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-12">
              Manager Approvals
            </h1>
            <p className="text-gray-9 mt-1">
              Review and grade your team's logged tasks.
            </p>
          </div>
          <div className="bg-amber-900/20 border border-amber-700/50 px-4 py-2 rounded-lg">
            <span className="text-amber-500 font-bold">
              {pendingTasks.length} Pending
            </span>
          </div>
        </div>

        {/* THE QUEUE */}
        {pendingTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onView={() => setReviewTask(task)}
              />
            ))}
          </div>
        ) : (
          /* ALL CAUGHT UP STATE */
          <div className="text-center py-20 bg-gray-2 border border-gray-4 rounded-xl shadow-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-900/20 text-green-500 mb-4">
              <CheckCircle size={32} />
            </div>
            <p className="text-gray-12 font-bold text-xl">Inbox Zero!</p>
            <p className="text-gray-9 mt-2">
              There are no pending tasks waiting for your review.
            </p>
          </div>
        )}

        {/* THE GRADING MODAL */}
        <ReviewTaskModal
          isOpen={!!reviewTask}
          onClose={() => setReviewTask(null)}
          task={reviewTask}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </div>
    </ProtectedRoute>
  );
}
