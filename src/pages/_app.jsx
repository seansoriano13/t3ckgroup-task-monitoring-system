import { Outlet, useLocation } from "react-router";
import { useState } from "react";
import SideNav from "../components/SideNav";
import AddTaskModal from "../components/AddTaskModal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { taskService } from "../services/taskService";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

export default function AppLayout() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();

  // 🔥 THE WRITE CONNECTION
  const addTaskMutation = useMutation({
    mutationFn: taskService.createTask,
    onSuccess: () => {
      // Magically refresh the task list on the screen!
      queryClient.invalidateQueries({ queryKey: ["myTasks"] });
      setIsModalOpen(false);
      toast.success("Task logged successfully!");
    },
    onError: (error) => {
      console.error("Failed to add task:", error);
      toast.error("Database error: Could not save task.");
    },
  });

  const handleSubmitTask = (formData) => {
    addTaskMutation.mutate(formData);
  };

  if (location.pathname === "/login") {
    return <Outlet />;
  }

  return (
    <div className="flex min-h-screen bg-gray-2 font-sans">
      {user && <SideNav onOpenAddTask={() => setIsModalOpen(true)} />}

      <main className="flex-1 overflow-y-auto pl-4">
        <div className="wrapper py-10">
          <Outlet />
        </div>
      </main>

      {user && (
        <AddTaskModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmitTask}
        />
      )}
    </div>
  );
}
