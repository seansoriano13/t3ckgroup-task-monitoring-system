import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { taskService } from "../services/taskService.js";
import ProtectedRoute from "../components/ProtectedRoute";
import DashboardHeader from "../components/DashboardHeader.jsx";
import TasksList from "../components/TasksList.jsx";
import TaskDetails from "../components/TaskDetails.jsx";

import { useState } from "react";

export default function Dashboard() {


  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    // Optional: wait a few hundred ms before setting selectedTask to null
    // so the data doesn't disappear before the slide-out animation finishes!
    setTimeout(() => setSelectedTask(null), 300);
  };

  // The state for the drawer
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleOpenDrawer = (task) => {
    setSelectedTask(task);
    setIsDrawerOpen(true);
  };

  return (
    <ProtectedRoute>
      <div>
        <div className="grid gap-8">
          <DashboardHeader />
          <TasksList />
        </div>
        <TaskDetails
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          task={selectedTask}
        />
      </div>
    </ProtectedRoute>
  );
}
