import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesActivityLogService } from "../services/sales/salesActivityLogService";
import { useAuth } from "../context/AuthContext";
import { useEmployeeAvatarMap } from "../hooks/useEmployeeAvatarMap";
import Spinner from "@/components/ui/Spinner";
import {
  Send,
  MessageCircle,
  Clock,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Avatar from "./Avatar";
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
function ActivityEntry({ entry, currentUserId, avatarMap }) {
  const isMe = entry.authorId === currentUserId;

  // --- COMMENT (Human message) ---
  return (
    <div className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <Avatar
        name={entry.authorName}
        src={avatarMap.get(entry.authorId) ?? undefined}
        className={`w-9 h-9 text-xs font-black border rounded-full ${
          entry.authorIsHead || entry.authorIsSuperAdmin
            ? "bg-warning/15 text-amber-9 border-amber-500/30"
            : entry.authorIsHr
              ? "bg-blue-9/15 text-blue-9 border-blue-500/30"
              : "bg-muted/50 text-mauve-10 border-border"
        }`}
      />

      {/* Bubble */}
      <div className={`max-w-[85%] ${isMe ? "items-end" : "items-start"}`}>
        <div className="flex items-center gap-2 mb-1 px-1">
          {!isMe && (
            <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">
              {entry.authorName}
            </span>
          )}
          {isMe && (
            <span className="text-[10px] font-extrabold text-mauve-11 uppercase tracking-widest ml-auto">
              You
            </span>
          )}
        </div>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm transition-all duration-300 whitespace-pre-wrap ${
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
 * Legacy remarks renderer
 */
function LegacyEntries({ headRemarks, headVerifiedByName }) {
  if (!headRemarks) return null;

  return (
    <div className="space-y-2 pb-3 mb-3 border-b border-border border-dashed">
      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">
        Legacy Record
      </p>
      <div className="py-2 px-3 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center gap-2 mb-1">
          <Star size={10} className="text-amber-9" />
          <span className="text-[10px] font-bold text-muted-foreground">
            {headVerifiedByName || "Manager"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{headRemarks}</p>
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
  const avatarMap = useEmployeeAvatarMap();
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
    <div className="flex flex-col border border-border rounded-xl overflow-hidden bg-card mt-4">
      {/* Tab Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
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
        style={{ maxHeight: "500px", minHeight: "200px" }}
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
                <MessageCircle size={24} className="mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground font-medium">No comments yet</p>
              </div>
            )}

            {comments.map((entry) => (
              <ActivityEntry
                key={entry.id}
                entry={entry}
                currentUserId={user?.id}
                avatarMap={avatarMap}
              />
            ))}
          </div>
        ) : (
          <HistoryTimeline logs={history} type="SALES" />
        )}
      </div>

      {/* Input Box */}
      {activeTab === "ACTIVITY" && !disabled && (
        <div className="px-4 py-4 border-t border-border bg-muted/30">
          <div className="flex items-start gap-2">
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
