import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskActivityService } from "../services/tasks/taskActivityService";
import { committeeTaskActivityService } from "../services/committeeTaskActivityService";
import { useAuth } from "../context/AuthContext";
import {
  Send,
  Zap,
  MessageCircle,
  ShieldCheck,
  Star,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Spinner from "@/components/ui/Spinner";

const formatTime = (isoString) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

/**
 * Renders a single activity entry based on its type
 */
function ActivityEntry({ entry, currentUserId }) {
  const isMe = entry.authorId === currentUserId;

  // --- SYSTEM event ---
  if (entry.type === "SYSTEM") {
    return (
      <div className="flex items-start gap-2.5 py-2 px-1">
        <div className="w-6 h-6 rounded-full bg-muted/50 border border-border flex items-center justify-center shrink-0 mt-0.5">
          <Zap size={12} className="text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {entry.content}
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            {formatTime(entry.createdAt)}
          </p>
        </div>
      </div>
    );
  }

  // --- APPROVAL event ---
  if (entry.type === "APPROVAL") {
    const grade = entry.metadata?.grade;
    const isRejection = entry.metadata?.event === "REJECTED";

    return (
      <div
        className={`py-3 px-3.5 rounded-xl border ${
          isRejection
            ? "bg-destructive/5 border-red-500/20"
            : "bg-green-9/5 border-green-500/20"
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black ${
                isRejection
                  ? "bg-destructive/20 text-red-400"
                  : "bg-green-9/20 text-green-9"
              }`}
            >
              {isRejection ? <AlertTriangle size={12} /> : <Star size={12} />}
            </div>
            <span className="text-xs font-bold text-muted-foreground">
              {entry.authorName || "Head"}
            </span>
            {grade !== undefined && grade > 0 && (
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  isRejection
                    ? "bg-destructive/10 text-red-400 border-red-500/30"
                    : "bg-green-9/10 text-green-9 border-green-500/30"
                }`}
              >
                Grade: {grade}
              </span>
            )}
          </div>
          <span className="text-[9px] text-muted-foreground">
            {formatTime(entry.createdAt)}
          </span>
        </div>
        {entry.content && (
          <p className="text-sm text-muted-foreground leading-relaxed pl-8">
            {entry.content}
          </p>
        )}
      </div>
    );
  }

  // --- HR_NOTE event ---
  if (entry.type === "HR_NOTE") {
    const isVerified = entry.metadata?.event === "HR_VERIFIED";

    return (
      <div
        className={`py-4 px-4 rounded-2xl border ${
          isVerified
            ? "bg-[color:var(--violet-2)]/50 border-indigo-100"
            : "bg-destructive/5 border-destructive/20"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                isVerified
                  ? "bg-primary text-primary-foreground"
                  : "bg-destructive text-primary-foreground"
              }`}
            >
              <ShieldCheck size={14} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">
                {entry.authorName || "HR Audit"}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isVerified ? "text-[color:var(--violet-10)]" : "text-destructive"}`}>
                {isVerified ? "Verification Successful" : "Verification Failed"}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase">
            {formatTime(entry.createdAt)}
          </span>
        </div>
        {entry.content && entry.content !== "Verified" && (
          <p className="text-sm text-muted-foreground leading-relaxed pl-9 italic font-medium">
            "{entry.content}"
          </p>
        )}
      </div>
    );
  }

  // --- COMMENT (Human message) ---
  return (
    <div className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-black uppercase border ${
          entry.authorIsHead || entry.authorIsSuperAdmin
            ? "bg-warning/15 text-[color:var(--amber-9)] border-amber-500/30"
            : entry.authorIsHr
              ? "bg-[color:var(--blue-9)]/15 text-[color:var(--blue-9)] border-blue-500/30"
              : "bg-muted/50 text-mauve-10 border-border"
        }`}
      >
        {entry.authorName
          ? entry.authorName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
          : "?"}
      </div>

      {/* Bubble */}
      <div className={`max-w-[85%] ${isMe ? "items-end" : "items-start"}`}>
        <div className="flex items-center gap-2 mb-1 px-1">
          {!isMe && (
            <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">
              {entry.authorName}
            </span>
          )}
          {isMe && (
            <span className="text-[10px] font-extrabold text-[color:var(--violet-10)] uppercase tracking-widest ml-auto">You</span>
          )}
        </div>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm transition-all duration-300 ${
            isMe
              ? "bg-primary text-primary-foreground rounded-tr-none"
              : "bg-card text-foreground rounded-tl-none border border-border"
          }`}
        >
          {entry.content}
        </div>
        <p
          className={`text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-widest ${
            isMe ? "text-right" : "text-left"
          } px-1`}
        >
          {formatTime(entry.createdAt)}
        </p>
      </div>
    </div>
  );
}

/**
 * Legacy remarks renderer — shown for old tasks that have remarks/hr_remarks
 * but no activity entries yet.
 */
function LegacyEntries({ remarks, hrRemarks, evaluatedByName, grade }) {
  if (!remarks && !hrRemarks) return null;

  return (
    <div className="space-y-2 pb-3 mb-3 border-b border-border border-dashed">
      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">
        Legacy Record
      </p>
      {remarks && (
        <div className="py-2 px-3 rounded-lg bg-muted/50/50 border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Star size={10} className="text-[color:var(--amber-9)]" />
            <span className="text-[10px] font-bold text-muted-foreground">
              {evaluatedByName || "Manager"} {grade ? `— Grade: ${grade}` : ""}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{remarks}</p>
        </div>
      )}
      {hrRemarks && (
        <div className="py-2 px-3 rounded-lg bg-[color:var(--blue-9)]/5 border border-blue-500/15">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={10} className="text-[color:var(--blue-9)]" />
            <span className="text-[10px] font-bold text-muted-foreground">HR Notes</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{hrRemarks}</p>
        </div>
      )}
    </div>
  );
}

/**
 * TaskActivityTimeline — The unified activity feed for a task.
 * Shows system events, comments, approvals, and HR notes in one chronological view.
 */
export default function TaskActivityTimeline({
  taskId,
  entityType = "TASK",
  legacyRemarks,
  legacyHrRemarks,
  evaluatedByName,
  grade,
  disabled = false,
  inputType = "textarea",
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const [message, setMessage] = useState("");

  // Unique suffix per instance to avoid Supabase channel name collisions
  // when multiple TaskActivityTimeline components target the same task
  const instanceId = useRef(`-timeline-${Math.random().toString(36).substring(2, 9)}`);

  // Fetch activity
  const { data: activity = [], isLoading } = useQuery({
    queryKey: ["taskActivity", taskId, entityType],
    queryFn: () => entityType === "COMMITTEE_TASK" 
      ? committeeTaskActivityService.getActivityForTask(taskId)
      : taskActivityService.getActivityForTask(taskId),
    enabled: !!taskId,
    staleTime: 30_000,
  });

  // Post comment mutation
  const postCommentMutation = useMutation({
    mutationFn: ({ taskId, authorId, content }) =>
      entityType === "COMMITTEE_TASK"
        ? committeeTaskActivityService.addComment(taskId, authorId, content)
        : taskActivityService.addComment(taskId, authorId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskActivity", taskId, entityType] });
      setMessage("");
    },
  });

  // Real-time subscription
  useEffect(() => {
    if (!taskId) return;

    const suffix = instanceId.current;
    const channel = entityType === "COMMITTEE_TASK"
      ? committeeTaskActivityService.subscribeToActivity(taskId, () => {
          queryClient.invalidateQueries({ queryKey: ["taskActivity", taskId, entityType] });
        }, suffix)
      : taskActivityService.subscribeToActivity(taskId, () => {
          queryClient.invalidateQueries({ queryKey: ["taskActivity", taskId, entityType] });
        }, suffix);

    return () => {
      if (entityType === "COMMITTEE_TASK") {
        committeeTaskActivityService.unsubscribeFromActivity(channel);
      } else {
        taskActivityService.unsubscribeFromActivity(channel);
      }
    };
  }, [taskId, entityType, queryClient]);

  // Auto-scroll on new entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activity]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || !taskId || !user?.id) return;

    postCommentMutation.mutate({
      taskId,
      authorId: user.id,
      content: trimmed,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Check if legacy entries should be shown (only if no activity entries exist yet)
  const hasActivityEntries = activity.length > 0;
  const showLegacy = !hasActivityEntries && (legacyRemarks || legacyHrRemarks);

  return (
    <div className="flex flex-col border border-border rounded-xl overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted">
        <MessageCircle size={18} className="text-muted-foreground" />
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Task Activity
        </span>
        {activity.length > 0 && (
          <span className="text-[10px] font-bold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full border border-border ml-auto">
            {activity.length}
          </span>
        )}
      </div>

      {/* Activity Feed */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-4"
        style={{ maxHeight: "500px", minHeight: "150px" }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : (
          <>
            {showLegacy && (
              <LegacyEntries
                remarks={legacyRemarks}
                hrRemarks={legacyHrRemarks}
                evaluatedByName={evaluatedByName}
                grade={grade}
              />
            )}

            {activity.length === 0 && !showLegacy && (
              <div className="text-center py-6">
                <MessageCircle size={24} className="mx-auto text-mauve-6 mb-2" />
                <p className="text-[11px] text-muted-foreground font-bold">
                  No activity yet
                </p>
                <p className="text-[10px] text-mauve-6 mt-0.5">
                  System events and comments will appear here.
                </p>
              </div>
            )}

            {activity.map((entry) => (
              <ActivityEntry
                key={entry.id}
                entry={entry}
                currentUserId={user?.id}
              />
            ))}
          </>
        )}
      </div>

      {/* Input Box */}
      {!disabled && (
        <div className="px-4 py-4 border-t border-border bg-muted/30">
          <div className="flex items-start gap-2">
            {inputType === "textarea" ? (
              <Textarea
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Send a message... (Shift+Enter for new line)"
                disabled={postCommentMutation.isPending}
                className="flex-1 bg-card border-border rounded-xl px-4 py-3 text-sm min-h-[50px] max-h-[150px] shadow-sm"
                rows={1}
              />
            ) : (
              <Input
                ref={inputRef}
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Send a message..."
                disabled={postCommentMutation.isPending}
                className="flex-1 bg-card border-border rounded-xl px-4 h-11 shadow-sm"
              />
            )}
            <Button
              onClick={handleSend}
              disabled={!message.trim() || postCommentMutation.isPending}
              className="w-11 h-11 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all shrink-0"
              size="icon"
            >
              <Send size={18} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
