import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { taskService } from "../services/taskService.js";
import ProtectedRoute from "../components/ProtectedRoute";
import DashboardHeader from "../components/DashboardHeader.jsx";
import TasksList from "../components/TasksList.jsx";
import TaskDetails from "../components/TaskDetails.jsx";
import DashboardStats from "../components/DashboardStats.jsx";
import { useState } from "react";
import toast from "react-hot-toast";
import EmployeePipelineMatrix from "../components/EmployeePipelineMatrix.jsx";

export default function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isManagement =
    user?.is_hr || user?.isHr || user?.is_head || user?.isHead;

  const [selectedTask, setSelectedTask] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // eslint-disable-next-line no-unused-vars
  const handleOpenDrawer = (task) => {
    setSelectedTask(task);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedTask(null), 300);
  };

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId) => taskService.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] });
      toast.success("Task permanently deleted.");
    },
  });

  return (
    <ProtectedRoute>
      <div>
        <div className="grid gap-8">
          <DashboardHeader />
          <DashboardStats />
          <TasksList />
          {isManagement && <EmployeePipelineMatrix />}
        </div>
        <TaskDetails
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          task={selectedTask}
          onDeleteTask={(taskId) => deleteTaskMutation.mutateAsync(taskId)}
        />
      </div>
    </ProtectedRoute>
  );
}
