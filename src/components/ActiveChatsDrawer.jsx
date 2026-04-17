import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { activeChatService } from "../services/tasks/activeChatService";
import { useAuth } from "../context/AuthContext";
import { MessageCircle, X, Clock, Target, ListCheck } from "lucide-react";
import { useNavigate } from "react-router";
import { supabase } from "../lib/supabase";

// Helper to calculate relative time
const timeAgo = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  const diffMs = new Date() - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export default function ActiveChatsDrawer({ isOpen, onClose }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: activeChats = [], isLoading } = useQuery({
    queryKey: ["activeChats", user?.id],
    queryFn: () => activeChatService.getActiveChats(user?.id),
    enabled: !!user?.id && isOpen, // Only fetch eagerly if open
  });

  // Listen to inserts on `task_activity` or `sales_activity_logs` where type is COMMENT
  useEffect(() => {
    if (!user?.id || !isOpen) return;

    const taskChannel = supabase
      .channel("public:task_activity:chats")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "task_activity",
          filter: `type=eq.COMMENT`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["activeChats", user.id] });
        },
      )
      .subscribe();

    const salesChannel = supabase
      .channel("public:sales_activity_logs:chats")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sales_activity_logs",
          filter: `type=eq.COMMENT`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["activeChats", user.id] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(taskChannel);
      supabase.removeChannel(salesChannel);
    };
  }, [user?.id, isOpen, queryClient]);

  const markAsReadMutation = useMutation({
    mutationFn: ({ entityType, entityId }) =>
      activeChatService.markAsRead(user?.id, entityType, entityId),
    onSuccess: (_, variables) => {
      // Optimistically update the cache to remove the 'unread' dot
      queryClient.setQueryData(["activeChats", user?.id], (old = []) =>
        old.map((c) =>
          c.entity_id === variables.entityId &&
          c.entity_type === variables.entityType
            ? { ...c, is_unread: false }
            : c,
        ),
      );
    },
  });

  const handleChatClick = (chat) => {
    if (chat.is_unread) {
      markAsReadMutation.mutate({
        entityType: chat.entity_type,
        entityId: chat.entity_id,
      });
    }

    if (chat.entity_type === "TASK") {
      if ((user?.isHead || user?.isHr) && !user?.isSuperAdmin) {
        navigate("/approvals", { state: { openTaskId: chat.entity_id } });
      } else if (user?.isSuperAdmin) {
        navigate("/tasks", { state: { openTaskId: chat.entity_id } });
      } else {
        navigate("/", { state: { openTaskId: chat.entity_id } });
      }
    } else if (chat.entity_type === "SALES") {
      navigate("/sales/records", { state: { openActivityId: chat.entity_id } });
    }

    onClose();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99]"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-[400px] max-w-full bg-card border-l border-border shadow-2xl z-[9999] transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="p-6 border-b border-border flex justify-between items-center bg-card shrink-0">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <MessageCircle size={20} className="text-foreground" /> Active Chats
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider font-semibold">
              Recent conversations across tasks
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="p-10 text-center text-muted-foreground italic text-sm font-medium animate-pulse">
              Loading chats...
            </div>
          ) : activeChats.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center">
              <MessageCircle size={32} className="text-slate-300/50 mb-3" />
              <p className="text-foreground font-bold">No active chats</p>
              <p className="text-muted-foreground text-xs mt-1">
                When someone comments on your tasks, they'll appear here.
              </p>
            </div>
          ) : (
            activeChats.map((chat) => (
              <div
                key={`${chat.entity_type}-${chat.entity_id}`}
                onClick={() => handleChatClick(chat)}
                className={`p-6 border-b border-border transition-all cursor-pointer hover:bg-muted/50
                        ${chat.is_unread ? "bg-primary/5" : "bg-card"}`}
              >
                <div className="flex gap-4 items-start">
                  <div
                    className={`p-2 rounded-full shrink-0 ${chat.is_unread ? "bg-primary/10 text-blue-600" : "bg-muted text-muted-foreground"}`}
                  >
                    {chat.entity_type === "TASK" ? (
                      <ListCheck size={18} />
                    ) : (
                      <Target size={18} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <h4
                        className={`text-sm font-bold truncate ${chat.is_unread ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        {chat.title}
                      </h4>
                    </div>

                    <p className={`text-xs leading-relaxed line-clamp-2 ${chat.is_unread ? "text-gray-700 font-medium" : "text-muted-foreground"}`}>
                      <span className="font-bold text-foreground">{chat.latest_author}:</span> {chat.latest_message}
                    </p>

                    <div className="mt-2 text-[12px] text-muted-foreground flex items-center gap-1.5">
                      <span>{timeAgo(chat.latest_created_at)}</span>
                      {chat.subtitle && (
                         <>
                            <span>•</span>
                            <span>{chat.entity_type === "SALES" ? "Sales Rep: " : "Owner: "}{chat.subtitle}</span>
                         </>
                      )}
                    </div>
                  </div>
                  {chat.is_unread && <div className="w-2.5 h-2.5 rounded-full bg-primary/100 shrink-0 mt-2" />}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
