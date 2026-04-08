import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { taskService } from "../services/taskService.js";
import ProtectedRoute from "../components/ProtectedRoute";
import DashboardHeader from "../components/DashboardHeader.jsx";
import TasksList from "../components/TasksList.jsx";
import TaskDetails from "../components/TaskDetails.jsx";
import toast from "react-hot-toast";
import SalesDashboard from "../components/SalesDashboard.jsx";
import { useState } from "react";
import DashboardStats from "../components/DashboardStats.jsx";
import { Activity } from "lucide-react";
import SalesPerformanceMetrics from "../components/SalesPerformanceMetrics.jsx";
import { Calendar } from "lucide-react";
import EmployeePipelineMatrix from "../components/EmployeePipelineMatrix.jsx";
import FloatingMonthPicker from "../components/FloatingMonthPicker.jsx";

export default function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isManagement =
    user?.is_hr || user?.isHr || user?.is_head || user?.isHead;

  const isSales =
    user?.department?.toLowerCase().includes("sales") ||
    user?.subDepartment?.toLowerCase().includes("sales");

  const [selectedTask, setSelectedTask] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // --- MONTH SELECTION (Formatted for consistency with other dashboards) ---
  const currentDate = new Date();
  const currentMonthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-01`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthYear);

  const handleOpenDrawer = (task) => {
    setSelectedTask(task);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedTask(null), 300);
  };

  const deleteTaskMutation = useMutation({
    mutationFn: ({ id, userId }) => taskService.deleteTask(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] });
      toast.success("Task permanently deleted.");
    },
  });

  const editTaskMutation = useMutation({
    mutationFn: (updatedData) =>
      taskService.updateTask(updatedData.id, updatedData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task updated successfully!");
    },
    onError: (error) => {
      console.error("Failed to update task:", error);
      toast.error(error?.message || "Database error: Could not update task.");
    },
  });

  // Omni Dashboard exclusively for HR and Super Admins
  if (user?.is_hr || user?.isHr || user?.isSuperAdmin) {
    return (
      <ProtectedRoute>
        <div className="space-y-12 pb-10 max-w-350 mx-auto px-2 xl:px-0">
          {/* PIPELINE SECTION */}
          <div className="bg-gray-1 border border-gray-4 p-6 sm:p-10 rounded-4xl shadow-xl relative overflow-hidden">
            <div className="mb-8 border-b border-gray-4 pb-4 relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-gray-12 uppercase tracking-widest flex items-center gap-3">
                  Daily Task Accomplishment Report
                </h2>
                <p className="text-gray-9 mt-1 font-medium">
                  All task executions, approvals, and HR verifications.
                </p>
              </div>
              {/* <div className="flex items-center gap-1.5 bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-xs font-bold text-gray-9 shadow-inner w-max">
                <Calendar size={12} />
                <span className="uppercase tracking-wider">
                  {new Date(selectedMonth).toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div> */}
            </div>

            <div className="grid gap-8 relative">
              <DashboardStats selectedMonth={selectedMonth} />
              <EmployeePipelineMatrix selectedMonth={selectedMonth} />
              <TasksList selectedMonth={selectedMonth} />
            </div>
          </div>

          {/* SALES SECTION */}
          <div className="bg-gray-1 border border-gray-4 p-2 sm:p-10 pb-0 rounded-4xl shadow-xl relative overflow-hidden mt-12">
            <div className="relative w-full overflow-hidden">
              <SalesDashboard selectedMonth={selectedMonth} />
              <SalesPerformanceMetrics selectedMonth={selectedMonth} />
            </div>
          </div>
        </div>

        <FloatingMonthPicker
          selectedMonth={selectedMonth}
          onChange={setSelectedMonth}
        />

        <TaskDetails
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          task={selectedTask}
          onUpdateTask={(updatedTask) =>
            editTaskMutation.mutateAsync(updatedTask)
          }
          onDeleteTask={(payload) => deleteTaskMutation.mutateAsync(payload)}
        />
      </ProtectedRoute>
    );
  }

  // Pure Sales Dashboard for dedicated Sales personnel
  if (isSales) {
    return (
      <ProtectedRoute>
        <div className="pb-10">
          <SalesDashboard selectedMonth={selectedMonth} />
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 -mt-4">
            <SalesPerformanceMetrics selectedMonth={selectedMonth} />
          </div>
        </div>

         <FloatingMonthPicker
          selectedMonth={selectedMonth}
          onChange={setSelectedMonth}
        />

      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div>
        <div className="grid gap-8">
          <DashboardHeader />

          {/* HEAD VIEW MONTH PICKER */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-4 pb-4 px-2">
            <div>
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">
                Dashboard
              </p>
              <h2 className="text-2xl font-black text-gray-12 uppercase">
                {user?.is_head || user?.isHead
                  ? "Department Tasks"
                  : "My Tasks"}
              </h2>
            </div>

            <div className="flex items-center gap-1.5 bg-gray-1 border border-gray-4 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-9 shadow-sm w-max">
              <Calendar size={12} />
              <span className="uppercase tracking-wider">
                {new Date(selectedMonth).toLocaleString("default", {
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          <DashboardStats selectedMonth={selectedMonth} />
          {(user?.is_head || user?.isHead) && (
            <EmployeePipelineMatrix selectedMonth={selectedMonth} />
          )}
          <TasksList selectedMonth={selectedMonth} />
        </div>
        <TaskDetails
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          task={selectedTask}
          onUpdateTask={(updatedTask) =>
            editTaskMutation.mutateAsync(updatedTask)
          }
          onDeleteTask={(payload) => deleteTaskMutation.mutateAsync(payload)}
        />
        <FloatingMonthPicker
          selectedMonth={selectedMonth}
          onChange={setSelectedMonth}
        />
      </div>
    </ProtectedRoute>
  );
}
