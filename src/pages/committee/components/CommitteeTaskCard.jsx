import { CheckCircle2, Users, Calendar, Clock } from "lucide-react";
import StatusBadge from "../../../components/StatusBadge";
import { formatChecklistToString } from "../../../utils/taskFormatters";
import GradeSelector from "../../../components/GradeSelector";

export default function CommitteeTaskCard({ task, onView, currentUserId, isSuperAdmin }) {
  const members = task.members || [];
  const totalMembers = members.length;
  const completedMembers = members.filter(m => m.status === "DONE").length;
  const progressPercent = totalMembers > 0 ? Math.round((completedMembers / totalMembers) * 100) : 0;

  // Determine user's specific subtask if they are a member
  const myMember = members.find(m => m.employee_id === currentUserId);
  const isCreator = task.created_by === currentUserId;

  const isHrPending = task.status === "HR_PENDING";
  const isHrVerified = task.status === "HR_VERIFIED";

  return (
    <div
      onClick={onView}
      className="bg-card p-5 rounded-2xl border border-border shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full cursor-pointer relative"
    >

      <div className="flex justify-between items-start gap-4 mb-3">
        <h3 className="font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {task.title}
        </h3>
        <div className="shrink-0 flex items-center gap-1.5">
          <StatusBadge status={isHrPending || isHrVerified ? "COMPLETED" : task.status} />
          {(isHrPending || isHrVerified) && (
            <div title={isHrVerified ? "Verified by HR" : "Pending HR Verification"}>
              {isHrVerified ? <CheckCircle2 size={12} className="text-green-500" /> : <Clock size={12} className="text-amber-500" />}
            </div>
          )}
        </div>
      </div>

      <p className="text-[11px] font-bold text-muted-foreground line-clamp-2 mb-4 flex-1 uppercase tracking-wider opacity-60">
        {task.description || "No description provided."}
      </p>

      {/* Progress Bar (Visible to Heads or Admins) */}
      {(isCreator || isSuperAdmin) && task.status !== "CANCELLED" && (
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5 font-medium">
            <span className="text-slate-500">Progress</span>
            <span className="text-foreground">{completedMembers} / {totalMembers} members done</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${progressPercent === 100 ? "bg-green-500" : "bg-primary"}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* My Assigned Task (Visible to Members) */}
      {myMember && !isCreator && !isSuperAdmin && (
        <div className="mb-4 bg-muted/30 p-3.5 rounded-xl border border-border/40 hover:border-border/80 transition-colors">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-1">My Task</div>
          <p className="text-sm font-bold text-foreground line-clamp-2 mb-3 leading-tight">
            {formatChecklistToString(myMember.task_description)}
          </p>
          <div className="flex items-center justify-between mt-2">
             <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
               myMember.status === "DONE" ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600"
             }`}>
               {myMember.status}
             </span>
             {myMember.grade > 0 && (
               <GradeSelector grade={myMember.grade} finalized compact />
             )}
          </div>
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-medium">
        <div className="flex items-center gap-1.5" title="Head/Creator">
          <Users size={14} className="text-primary" />
          <span className="truncate max-w-[100px]">{task.creator?.name || "Unknown"}</span>
        </div>

        {task.due_date && (
          <div className="flex items-center gap-1.5" title="Due Date">
             <Calendar size={14} className={new Date(task.due_date) < new Date() && task.status === "ACTIVE" ? "text-red-500" : "text-slate-400"} />
             <span className={new Date(task.due_date) < new Date() && task.status === "ACTIVE" ? "text-red-500" : ""}>
               {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
             </span>
          </div>
        )}
      </div>
    </div>
  );
}
