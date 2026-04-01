import { Outlet, useLocation } from "react-router";
import { useState } from "react";
import SideNav from "../components/SideNav";
import AddTaskModal from "../components/AddTaskModal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { taskService } from "../services/taskService";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";
import RoleSwitcher from "../components/RoleSwitcher";

export default function AppLayout() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user, isAuthLoading } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();

  const addTaskMutation = useMutation({
    mutationFn: taskService.createTask,
    onMutate: async (newTask) => {
      setIsModalOpen(false);

      await queryClient.cancelQueries({ queryKey: ["dashboardTasks"] });

      const previousTasks = queryClient.getQueryData(["dashboardTasks"]);
      const optimisticTask = {
        id: `temp-${Date.now()}`,
        ...newTask,
        createdAt: new Date().toISOString(),
        status: "INCOMPLETE",
        loggedByName: user?.name,
        loggedById: user?.id,
      };

      // Inject the fake task at the very top of the list
      queryClient.setQueryData(["dashboardTasks"], (old) => {
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
        queryClient.setQueryData(["dashboardTasks"], context.previousTasks);
      }

      // Optionally reopen the modal so they don't lose what they typed!
      setIsModalOpen(true);
    },

    // 3. CLEANUP: Once Supabase is done (success or fail), fetch the true data
    onSettled: () => {
      // This quietly swaps out your "temp" task with the real database row
      queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
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

  // 🔑 CRITICAL: Don't render child pages until auth is resolved.
  // Without this gate, useQuery's `enabled: !!user?.id` fires as `false`
  // at mount time and the query is registered as permanently disabled.
  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-2">
        <div className="flex flex-col items-center gap-3 text-gray-9">
          <Loader2 className="animate-spin" size={28} />
          <p className="text-sm font-bold uppercase tracking-widest animate-pulse">
            Loading Portal...
          </p>
        </div>
      </div>
    );
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
