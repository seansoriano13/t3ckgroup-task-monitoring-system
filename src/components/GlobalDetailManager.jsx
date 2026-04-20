import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskService } from "../services/taskService";
import { salesService } from "../services/salesService";
import TaskDetails from "./TaskDetails";
import SalesTaskDetailsModal from "./SalesTaskDetailsModal";
import toast from "react-hot-toast";

export default function GlobalDetailManager() {
  const queryClient = useQueryClient();
  const [activeItem, setActiveItem] = useState(null); // { id, type: 'TASK' | 'SALES' }

  useEffect(() => {
    const handleOpenDetails = (e) => {
      const { id, type } = e.detail;
      if (id && type) {
        setActiveItem({ id, type });
      }
    };

    window.addEventListener("OPEN_ENTITY_DETAILS", handleOpenDetails);
    return () => window.removeEventListener("OPEN_ENTITY_DETAILS", handleOpenDetails);
  }, []);

  // 1. Task Fetching
  const { data: taskData, isLoading: isLoadingTask } = useQuery({
    queryKey: ["globalTask", activeItem?.id],
    queryFn: () => taskService.getTaskById(activeItem.id),
    enabled: activeItem?.type === "TASK" && !!activeItem?.id,
    staleTime: 0,
  });

  // 2. Sales Fetching
  const { data: salesData, isLoading: isLoadingSales } = useQuery({
    queryKey: ["globalSales", activeItem?.id],
    queryFn: () => salesService.getSalesActivityById(activeItem.id),
    enabled: activeItem?.type === "SALES" && !!activeItem?.id,
    staleTime: 0,
  });

  useEffect(() => {
    if (activeItem) {
      if (activeItem.type === "TASK" && !isLoadingTask) {
        window.dispatchEvent(new CustomEvent("ENTITY_DETAILS_LOADED"));
      } else if (activeItem.type === "SALES" && !isLoadingSales) {
        window.dispatchEvent(new CustomEvent("ENTITY_DETAILS_LOADED"));
      }
    }
  }, [activeItem, isLoadingTask, isLoadingSales]);

  // Common Mutations (simplified, or we delegate to the modals if they handle them)
  const editTaskMutation = useMutation({
    mutationFn: (updatedData) => taskService.updateTask(updatedData.id, updatedData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] });
      queryClient.invalidateQueries({ queryKey: ["globalTask", activeItem?.id] });
      toast.success("Task updated.");
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: ({ id, userId }) => taskService.deleteTask(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setActiveItem(null);
      toast.success("Task deleted.");
    },
  });

  const handleClose = () => setActiveItem(null);

  if (!activeItem) return null;

  return (
    <>
      {/* TASK MODAL */}
      {activeItem.type === "TASK" && (
        <TaskDetails
          isOpen={true}
          onClose={handleClose}
          task={taskData}
          onUpdateTask={(updated) => editTaskMutation.mutateAsync(updated)}
          onDeleteTask={(payload) => deleteTaskMutation.mutateAsync(payload)}
        />
      )}

      {/* SALES MODAL */}
      {activeItem.type === "SALES" && (
        <SalesTaskDetailsModal
          isOpen={true}
          onClose={handleClose}
          activity={salesData}
        />
      )}
    </>
  );
}
