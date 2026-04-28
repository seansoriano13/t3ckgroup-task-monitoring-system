import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesActivityLogService } from "../services/sales/salesActivityLogService";
import { useAuth } from "../context/AuthContext";
import Spinner from "@/components/ui/Spinner";
import {
  Send,
  MessageCircle,
  Clock,
} from "lucide-react";
import TabGroup from "./ui/TabGroup";
import HistoryTimeline from "./HistoryTimeline";

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

  // --- COMMENT (Human message) ---
  return (
    <div
      className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-black uppercase border ${
          entry.authorIsHead || entry.authorIsSuperAdmin
            ? "bg-warning/15 text-amber-9 border-amber-500/30"
            : entry.authorIsHr
              ? "bg-blue-9/15 text-blue-9 border-blue-500/30"
              : "bg-mauve-3 text-mauve-10 border-mauve-4"
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
      <div
        className={`max-w-[75%] ${
          isMe ? "items-end" : "items-start"
        }`}
      >
        <div className="flex items-center gap-2 mb-0.5">
          {!isMe && (
            <span className="text-xs font-bold text-mauve-10">
              {entry.authorName}
            </span>
          )}
          {isMe && (
            <span className="text-xs font-bold text-mauve-8 ml-auto">
              You
            </span>
          )}
        </div>
        <div
          className={`px-4 py-3 rounded-2xl text-base leading-relaxed ${
            isMe
              ? "bg-primary/15 text-foreground rounded-tr-md border border-primary/20"
              : "bg-mauve-3 text-foreground rounded-tl-md border border-mauve-4"
          }`}
        >
          {entry.content}
        </div>
        <p
          className={`text-[11px] text-mauve-7 mt-1.5 ${
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
 * Legacy remarks renderer
 */
function LegacyEntries({ headRemarks, headVerifiedByName }) {
  if (!headRemarks) return null;

  return (
    <div className="space-y-2 pb-3 mb-3 border-b border-mauve-4 border-dashed">
      <p className="text-[9px] font-bold text-mauve-7 uppercase tracking-widest px-1">
        Legacy Record
      </p>
      <div className="py-2 px-3 rounded-lg bg-mauve-3/50 border border-mauve-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold text-muted-foreground">
            {headVerifiedByName || "Manager"}
          </span>
        </div>
        <p className="text-xs text-mauve-11 leading-relaxed">{headRemarks}</p>
      </div>
    </div>
  );
}

/**
 * SalesActivityTimeline — The unified activity feed for a sales activity.
 */
export default function SalesActivityTimeline({
  salesActivityId,
  legacyHeadRemarks,
  headVerifiedByName,
  disabled = false,
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("ACTIVITY");

  // Fetch activity
  const { data: activity = [], isLoading } = useQuery({
    queryKey: ["salesActivity", salesActivityId],
    queryFn: () => salesActivityLogService.getActivityForSalesActivity(salesActivityId),
    enabled: !!salesActivityId,
    staleTime: 30_000,
  });

  const comments = activity.filter(e => e.type === "COMMENT");
  const history = activity.filter(e => e.type !== "COMMENT");

  // Post comment mutation
  const postCommentMutation = useMutation({
    mutationFn: ({ salesActivityId, authorId, content }) =>
      salesActivityLogService.addComment(salesActivityId, authorId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesActivity", salesActivityId] });
      setMessage("");
    },
  });

  // Real-time subscription
  useEffect(() => {
    if (!salesActivityId) return;

    const channel = salesActivityLogService.subscribeToActivity(salesActivityId, () => {
      queryClient.invalidateQueries({ queryKey: ["salesActivity", salesActivityId] });
    });

    return () => {
      salesActivityLogService.unsubscribeFromActivity(channel);
    };
  }, [salesActivityId, queryClient]);

  // Auto-scroll on new entries
  useEffect(() => {
    if (scrollRef.current && activeTab === "ACTIVITY") {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activity, activeTab]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || !salesActivityId || !user?.id) return;

    postCommentMutation.mutate({
      salesActivityId,
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

  const showLegacy = comments.length === 0 && !!legacyHeadRemarks;

  return (
    <div className="flex flex-col border border-mauve-4 rounded-xl overflow-hidden bg-mauve-1 mt-6">
      {/* Tab Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-mauve-4 bg-mauve-2">
        <TabGroup
          variant="pill"
          tabs={[
            { value: "ACTIVITY", label: "Activity", icon: MessageCircle, badge: comments.length },
            { value: "HISTORY", label: "History", icon: Clock },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Activity Feed */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4"
        style={{ maxHeight: "400px", minHeight: "200px" }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : activeTab === "ACTIVITY" ? (
          <div className="space-y-4">
            {showLegacy && (
              <LegacyEntries
                headRemarks={legacyHeadRemarks}
                headVerifiedByName={headVerifiedByName}
              />
            )}

            {comments.length === 0 && !showLegacy && (
              <div className="text-center py-10">
                <MessageCircle size={24} className="mx-auto text-mauve-6 mb-2" />
                <p className="text-xs text-mauve-7 font-bold">No activity yet</p>
              </div>
            )}

            {comments.map((entry) => (
              <ActivityEntry
                key={entry.id}
                entry={entry}
                currentUserId={user?.id}
              />
            ))}
          </div>
        ) : (
          <HistoryTimeline logs={history} type="SALES" />
        )}
      </div>

      {/* Input Box */}
      {activeTab === "ACTIVITY" && !disabled && (
        <div className="px-3 py-2.5 border-t border-mauve-4 bg-mauve-2">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={postCommentMutation.isPending}
              className="flex-1 bg-mauve-1 border border-mauve-4 rounded-lg px-4 py-2.5 text-base text-foreground placeholder:text-mauve-7 outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={
                !message.trim() || postCommentMutation.isPending
              }
              className="w-11 h-11 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground flex items-center justify-center transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
