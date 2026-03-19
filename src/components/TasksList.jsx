import { useState } from "react";
import TaskCard from "./TaskCard";
import TaskDetails from "./TaskDetails";
import { useAuth } from "../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { taskService } from "../services/taskService.js";

export default function TasksList() {
  const { user } = useAuth();

  // Pop-up State
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // 🔥 THE TANSTACK QUERY ENGINE
  const {
    data: tasks,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["myTasks", user?.id], // This tells TanStack to cache data uniquely per user
    queryFn: () => taskService.getMyTasks(user?.id),
    enabled: !!user?.id, // Security: Only run the query if a user is logged in
  });

  // Drawer Handlers
  const handleOpenDrawer = (task) => {
    setSelectedTask(task);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedTask(null), 300);
  };

  // --- UI STATES ---

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-gray-9">
        {/* A sleek, TG-Red tinted loading spinner */}
        <div className="w-8 h-8 border-4 border-gray-4 border-t-red-9 rounded-full animate-spin mb-4"></div>
        <p className="font-bold animate-pulse tracking-wider uppercase text-sm">
          Fetching Database...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-10 text-center bg-red-a2 border border-red-a5 rounded-xl">
        <p className="text-red-11 font-bold">
          Connection Error: Failed to load tasks.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <h2 className="text-xl font-bold text-gray-12">Tasks for Today</h2>
        <span className="text-sm font-bold text-gray-9">
          {tasks?.length || 0} Total
        </span>
      </div>

      {/* The Grid */}
      {tasks?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onView={() => handleOpenDrawer(task)}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="py-16 text-center bg-gray-2 border border-gray-4 border-dashed rounded-xl shadow-sm">
          <p className="text-gray-10 font-bold text-lg">Your queue is empty.</p>
          <p className="text-gray-8 text-sm mt-1">
            Log a new task to get started.
          </p>
        </div>
      )}

      {/* The Drawer */}
      <TaskDetails
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        task={selectedTask}
      />
    </div>
  );
}
