import { useState } from "react";
import TaskCard from "./TaskCard";
import TaskDetails from "./TaskDetails";
import { useAuth } from "../context/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { taskService } from "../services/taskService.js";
import { useMemo } from "react";
import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { User } from "lucide-react";
import { Users } from "lucide-react";

export default function TasksList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isHr = user?.is_hr || user?.isHr;
  const isHead = user?.is_head || user?.isHead;
  const isManagement = isHr || isHead;
  const userSubDept = user?.sub_department || user?.subDepartment;

  const [selectedTask, setSelectedTask] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const {
    data: rawTasks = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["dashboardTasks", user?.id, isManagement ? "all" : "personal"],
    queryFn: () =>
      isManagement
        ? taskService.getAllTasks()
        : taskService.getMyTasks(user?.id),
    enabled: !!user?.id,
  });

  // 🔥 THE SEPARATION ENGINE
  const { myTasks, teamTasks } = useMemo(() => {
    // SECTION A: My Private Queue
    const my = rawTasks.filter((t) => t.loggedById === user?.id);

    console.log(rawTasks[0]);

    // SECTION B: Management/Team Feed
    let team = [];

    if (isHr) {
      // HR sees every task in the company EXCEPT their own personal ones
      team = rawTasks.filter((t) => t.loggedById !== user?.id);
    } else if (isHead) {
      // Head sees tasks in their sub-dept EXCEPT their own personal ones
      team = rawTasks.filter((t) => {
        const isNotMe = t.loggedById !== user?.id;

        // 🛠️ THE FIX: Bulletproof sub-department lookup
        // Checks every possible way your backend might map this field
        const taskSubDept =
          t.sub_department ||
          t.subDepartment ||
          t.creator?.sub_department ||
          t.employees?.sub_department ||
          t.employees?.subDepartment ||
          "";

        const inMyDept = taskSubDept === userSubDept;

        return isNotMe && inMyDept;
      });
    }

    return {
      myTasks: my.slice(0, 3),
      teamTasks: team.slice(0, 6),
    };
  }, [rawTasks, user?.id, isHr, isHead, userSubDept]);

  const editTaskMutation = useMutation({
    mutationFn: (updatedData) =>
      taskService.updateTask(updatedData.id, updatedData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] });
    },
  });

  const handleOpenDrawer = (task) => {
    setSelectedTask(task);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedTask(null), 300);
  };

  if (isLoading) return <div className="py-20 flex-center">...</div>; // Keep your existing loader here

  return (
    <div className="space-y-10">
      {/* SECTION 1: MY PERSONAL TASKS (Visible to Everyone) */}
      <section className="space-y-4">
        <div className="flex justify-between items-end">
          <div className="flex items-center gap-2">
            <User size={18} className="text-primary" />
            <h2 className="text-lg font-bold text-gray-12">My Private Queue</h2>
          </div>
          <Link
            to="/tasks"
            className="text-xs font-bold text-gray-9 hover:text-primary transition-colors uppercase tracking-widest"
          >
            View All
          </Link>
        </div>

        {myTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onView={() => handleOpenDrawer(task)}
              />
            ))}
          </div>
        ) : (
          <div className="p-10 text-center border border-dashed border-gray-4 rounded-xl text-gray-9 text-sm">
            You haven't logged any personal tasks today.
          </div>
        )}
      </section>

      {/* SECTION 2: MANAGEMENT FEED (HR/HEAD ONLY) */}
      {isManagement && (
        <section className="space-y-4">
          <div className="flex justify-between items-center border-t border-gray-3 pt-8">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-primary" />
              <div>
                <h2 className="text-lg font-bold text-gray-12">
                  {isHr ? "Organization Feed" : "Team Activity"}
                </h2>
                <p className="text-[10px] text-gray-9 font-bold uppercase tracking-tighter">
                  Monitoring: {isHr ? "All Branches" : userSubDept}
                </p>
              </div>
            </div>
            <Link
              to="/tasks"
              className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/5 px-3 py-2 rounded-lg border border-primary/10"
            >
              Directory <ArrowUpRight size={14} />
            </Link>
          </div>

          {teamTasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onView={() => handleOpenDrawer(task)}
                />
              ))}
            </div>
          ) : (
            <div className="p-10 text-center border border-dashed border-gray-4 rounded-xl text-gray-9 text-sm">
              No recent activity from your team.
            </div>
          )}
        </section>
      )}

      <TaskDetails
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        task={selectedTask}
        onUpdateTask={(updatedData) =>
          editTaskMutation.mutateAsync(updatedData)
        }
      />
    </div>
  );
}
