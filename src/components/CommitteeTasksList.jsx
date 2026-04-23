import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { committeeTaskService } from "../services/committeeTaskService";
import { Users, ChevronRight } from "lucide-react";
import { Link } from "react-router";
import StatusBadge from "./StatusBadge";

export default function CommitteeTasksList() {
  const { user } = useAuth();
  const isSuperAdmin =
    user?.is_super_admin === true || user?.isSuperAdmin === true;
  const isHead = user?.is_head === true || user?.isHead === true;

  const { data: committeeTasks = [], isLoading } = useQuery({
    queryKey: ["committeeTasks", user?.id],
    queryFn: () =>
      committeeTaskService.getCommitteeTasks(user?.id, isHead, isSuperAdmin),
    enabled: !!user?.id,
  });

  const activeTasks = committeeTasks.filter(
    (t) =>
      t.status === "ACTIVE" ||
      t.status === "PENDING" ||
      t.status === "COMPLETED",
  );

  if (isLoading) return null;
  if (activeTasks.length === 0) return null;

  return (
    <div className="mt-8 border border-border bg-card rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 md:p-5 border-b border-border flex justify-between items-center bg-muted/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Users size={16} />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Committee Tasks</h3>
            <p className="text-xs text-muted-foreground">
              Active group assignments
            </p>
          </div>
        </div>
        <Link
          to="/committee"
          className="text-xs font-bold text-primary hover:underline flex items-center"
        >
          View All <ChevronRight size={14} />
        </Link>
      </div>

      <div className="divide-y divide-border">
        {activeTasks.slice(0, 3).map((task) => {
          const myMember = task.members?.find(
            (m) => m.employee_id === user?.id,
          );
          const totalMembers = task.members?.length || 0;
          const completedMembers =
            task.members?.filter((m) => m.status === "DONE").length || 0;

          return (
            <div
              key={task.id}
              className="p-4 md:p-5 hover:bg-muted/30 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
                <Link
                  to="/committee"
                  state={{ openCommitteeId: task.id }}
                  className="font-bold text-foreground hover:text-primary transition-colors line-clamp-1"
                >
                  {task.title}
                </Link>
                <div className="shrink-0 flex items-center gap-3">
                  <StatusBadge status={task.status} />
                  <span className="text-[10px] font-bold text-slate-400 bg-muted px-2 py-1 rounded-md tracking-widest uppercase">
                    {completedMembers}/{totalMembers} Done
                  </span>
                </div>
              </div>

              {myMember && !isHead && !isSuperAdmin ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="font-bold text-foreground">My Task:</span>
                  <span className="line-clamp-1">
                    {myMember.task_description}
                  </span>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground line-clamp-1">
                  {task.description || "No description provided."}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
