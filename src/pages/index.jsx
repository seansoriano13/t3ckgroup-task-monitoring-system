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
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { Calendar } from "lucide-react";
import EmployeePipelineMatrix from "../components/EmployeePipelineMatrix.jsx";

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
    mutationFn: (taskId) => taskService.deleteTask(taskId, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] });
      toast.success("Task permanently deleted.");
    },
  });

  // Omni Dashboard exclusively for HR and Super Admins (Full Bird's Eye View)
  if (user?.is_hr || user?.isHr || user?.isSuperAdmin) {
    return (
      <ProtectedRoute>
        <div className="space-y-12 pb-10 max-w-[1400px] mx-auto px-2 xl:px-0">
          {/* PIPELINE SECTION */}
          <div className="bg-gray-1 border border-gray-4 p-6 sm:p-10 rounded-[2rem] shadow-xl relative overflow-hidden">
            <div className="mb-8 border-b border-gray-4 pb-4 relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-gray-12 uppercase tracking-widest flex items-center gap-3">
                  Daily Task Accomplishment Report
                </h2>
                <p className="text-gray-9 mt-1 font-medium">
                  Company-wide task execution, verifications, and
                  cross-departmental approval matrix.
                </p>
              </div>

              {/* MONTH PICKER - Consistent with Super Admin / Sales */}
              <div className="bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 flex items-center shadow-inner w-full sm:w-auto overflow-hidden">
                <span className="text-[10px] font-bold text-gray-9 mr-3 uppercase shrink-0 flex items-center gap-1.5">
                  <Calendar size={12} /> Target Month:
                </span>
                <DatePicker
                  selected={new Date(selectedMonth)}
                  onChange={(date) => {
                    if (date) {
                      const m = String(date.getMonth() + 1).padStart(2, "0");
                      setSelectedMonth(`${date.getFullYear()}-${m}-01`);
                    }
                  }}
                  showMonthYearPicker
                  dateFormat="MMMM yyyy"
                  className="bg-transparent text-gray-12 font-bold outline-none cursor-pointer flex-1 min-w-[120px] w-full text-sm"
                />
              </div>
            </div>

            <div className="grid gap-8 relative">
              <DashboardStats selectedMonth={selectedMonth} />
              <EmployeePipelineMatrix selectedMonth={selectedMonth} />
              <TasksList selectedMonth={selectedMonth} />
            </div>
          </div>

          {/* SALES SECTION */}
          <div className="bg-gray-1 border border-gray-4 p-2 sm:p-10 pb-0 rounded-[2rem] shadow-xl relative overflow-hidden mt-12">
            <div className="relative w-full overflow-hidden">
              <SalesDashboard selectedMonth={selectedMonth} />
              <SalesPerformanceMetrics selectedMonth={selectedMonth} />
            </div>
          </div>
        </div>

        <TaskDetails
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          task={selectedTask}
          onDeleteTask={(taskId) => deleteTaskMutation.mutateAsync(taskId)}
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
                Pipeline Monitoring
              </p>
              <h2 className="text-2xl font-black text-gray-12 uppercase">
                {user?.is_head || user?.isHead ? "Department Logs" : "My Feed"}
              </h2>
            </div>

            <div className="bg-gray-1 border border-gray-4 rounded-lg px-3 py-1.5 flex items-center shadow-sm w-full sm:w-auto overflow-hidden">
              <span className="text-[10px] font-bold text-gray-8 mr-3 uppercase shrink-0">
                Month:
              </span>
              <DatePicker
                selected={new Date(selectedMonth)}
                onChange={(date) => {
                  if (date) {
                    const m = String(date.getMonth() + 1).padStart(2, "0");
                    setSelectedMonth(`${date.getFullYear()}-${m}-01`);
                  }
                }}
                showMonthYearPicker
                dateFormat="MMM yyyy"
                className="bg-transparent text-gray-12 font-bold outline-none cursor-pointer text-xs w-28"
              />
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
          onDeleteTask={(taskId) => deleteTaskMutation.mutateAsync(taskId)}
        />
      </div>
    </ProtectedRoute>
  );
}
