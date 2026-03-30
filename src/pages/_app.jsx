import { Outlet, useLocation } from "react-router";
import { useState } from "react";
import SideNav from "../components/SideNav";
import AddTaskModal from "../components/AddTaskModal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { taskService } from "../services/taskService";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import RoleSwitcher from "../components/RoleSwitcher";

export default function AppLayout() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();

  // 🔥 THE WRITE CONNECTION
  // ⚡ THE OPTIMISTIC WRITE CONNECTION
  const addTaskMutation = useMutation({
    mutationFn: taskService.createTask,

    // 1. FIRE INSTANTLY: The millisecond the user clicks submit
    onMutate: async (newTask) => {
      // Close the modal instantly so the user isn't left waiting
      setIsModalOpen(false);

      // Cancel any outgoing refetches so they don't overwrite our optimistic data
      await queryClient.cancelQueries({ queryKey: ["myTasks"] });

      // Snapshot the current state of myTasks (in case the Wi-Fi drops and we need to roll back)
      const previousTasks = queryClient.getQueryData(["myTasks"]);

      // Create the "Fake" task to instantly show on screen
      const optimisticTask = {
        id: `temp-${Date.now()}`,
        ...newTask,
        createdAt: new Date().toISOString(),
        status: "INCOMPLETE",
        loggedByName: user?.name,
        loggedById: user?.id,
      };

      // Inject the fake task at the very top of the list
      queryClient.setQueryData(["myTasks"], (old) => {
        return old ? [optimisticTask, ...old] : [optimisticTask];
      });

      return { previousTasks };
    },

    // 2. IF BACKEND FAILS: Roll back to the snapshot silently
    onError: (error, newTask, context) => {
      console.error("Failed to add task:", error);
      toast.error("Database error: Could not save task.");

      // Revert the UI back to how it was before they clicked submit
      if (context?.previousTasks) {
        queryClient.setQueryData(["myTasks"], context.previousTasks);
      }

      // Optionally reopen the modal so they don't lose what they typed!
      setIsModalOpen(true);
    },

    // 3. CLEANUP: Once Supabase is done (success or fail), fetch the true data
    onSettled: () => {
      // This quietly swaps out your "temp" task with the real database row
      queryClient.invalidateQueries({ queryKey: ["myTasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] }); // Sync the pulse feed!
    },

    onSuccess: () => {
      toast.success("Task logged successfully!");
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

      <RoleSwitcher />
    </div>
  );
}
