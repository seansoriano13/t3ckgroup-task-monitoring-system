import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { taskService } from "../services/taskService.js";
import ProtectedRoute from "../components/ProtectedRoute";
import DashboardHeader from "../components/DashboardHeader.jsx";
import TasksList from "../components/TasksList.jsx";
import TaskDetails from "../components/TaskDetails.jsx";
import toast from "react-hot-toast";
import EmployeePipelineMatrix from "../components/EmployeePipelineMatrix.jsx";
import SalesDashboard from "../components/SalesDashboard.jsx";
import { useState } from "react";
import DashboardStats from "../components/DashboardStats.jsx";
import { Activity } from "lucide-react";

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
             <div className="bg-gray-1 border border-primary/20 p-6 sm:p-10 rounded-[2rem] shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-3xl rounded-full pointer-events-none -mr-40 -mt-20"></div>
               <div className="mb-8 border-b border-gray-4 pb-4 relative z-10">
                  <h2 className="text-3xl font-black text-gray-12 uppercase tracking-widest flex items-center gap-3"><Activity className="text-primary"/> Operations Pipeline</h2>
                  <p className="text-gray-9 mt-1 font-medium">Company-wide task execution, verifications, and cross-departmental approval matrix.</p>
               </div>
               
               <div className="grid gap-8 relative z-10">
                 <DashboardStats />
                 <TasksList />
                 <EmployeePipelineMatrix />
               </div>
             </div>

             {/* SALES SECTION */}
             <div className="bg-gray-1 border border-green-500/20 p-2 sm:p-10 pb-0 rounded-[2rem] shadow-xl relative overflow-hidden mt-12">
               <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-green-500/5 blur-3xl rounded-full pointer-events-none -ml-40 -mt-20"></div>
               <div className="relative z-10 w-full overflow-hidden">
                  <SalesDashboard />
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
     )
  }

  // Pure Sales Dashboard for dedicated Sales personnel
  if (isSales) {
    return (
      <ProtectedRoute>
        <SalesDashboard />
      </ProtectedRoute>
    );
  }

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
