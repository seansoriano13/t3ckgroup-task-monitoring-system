import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { systemUpdateService } from "../services/systemUpdateService";
import { githubService } from "../services/githubService";
import { aiService } from "../services/aiService";
import { useAuth } from "../context/AuthContext";
import {
  Bot,
  Loader2,
  Plus,
  Trash2,
  Edit3,
  Github,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import { confirmDeleteToast } from "./ui/CustomToast.jsx";
import TabGroup from "./ui/TabGroup";

const MAX_CONTENT_LENGTH = 2000;
const HISTORY_PAGE_SIZE_OPTIONS = [10, 20, 30];

export default function SystemUpdateManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const [content, setContent] = useState("");
  const [type, setType] = useState("feature");
  const [editingId, setEditingId] = useState(null);
  const [inlineEditId, setInlineEditId] = useState(null);
  const [inlineEditContent, setInlineEditContent] = useState("");
  const [inlineEditType, setInlineEditType] = useState("feature");
  const [isGenerating, setIsGenerating] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [historyFilter, setHistoryFilter] = useState("all");

  const { data: pagedUpdates, isLoading } = useQuery({
    queryKey: [
      "allSystemUpdates",
      {
        page: historyPage,
        pageSize: historyPageSize,
        filter: historyFilter,
      },
    ],
    queryFn: () =>
      systemUpdateService.getUpdatesPage({
        page: historyPage,
        pageSize: historyPageSize,
        filter: historyFilter,
      }),
  });
  const updates = pagedUpdates?.items || [];
  const totalPages = pagedUpdates?.totalPages || 1;
  const totalCount = pagedUpdates?.totalCount || 0;

  const generateAIContent = async () => {
    setIsGenerating(true);
    try {
      const commits = await githubService.getRecentCommits(15);
      if (commits.length === 0) {
        toast("No recent commits found.", { icon: "ℹ️" });
        setIsGenerating(false);
        return;
      }

      const summary = await aiService.summarizeCommits(commits);
      setContent(summary);
      setType("feature");
      toast.success("Generated summary from GitHub commits!");
    } catch (error) {
      toast.error(error.message || "Failed to generate AI summary");
    } finally {
      setIsGenerating(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: (data) => systemUpdateService.createUpdate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allSystemUpdates"] });
      queryClient.invalidateQueries({ queryKey: ["activeSystemUpdates"] });
      setContent("");
      toast.success("Update broadcasted successfully!");
    },
    onError: (err) => toast.error(err.message),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }) => systemUpdateService.editUpdate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allSystemUpdates"] });
      queryClient.invalidateQueries({ queryKey: ["activeSystemUpdates"] });
      setContent("");
      setEditingId(null);
      toast.success("Update edited successfully!");
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) =>
      systemUpdateService.toggleUpdateStatus(id, isActive),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["allSystemUpdates"] });
      queryClient.invalidateQueries({ queryKey: ["activeSystemUpdates"] });
      toast.success(isActive ? "Banner activated!" : "Banner deactivated.");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => systemUpdateService.deleteUpdate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allSystemUpdates"] });
      queryClient.invalidateQueries({ queryKey: ["activeSystemUpdates"] });
    },
  });

  const handlePost = () => {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      toast.error("Update content cannot be empty.");
      return;
    }
    if (trimmedContent.length > MAX_CONTENT_LENGTH) {
      toast.error(
        `Keep update content within ${MAX_CONTENT_LENGTH} characters.`,
      );
      return;
    }

    if (editingId) {
      editMutation.mutate({
        id: editingId,
        data: { content: trimmedContent, type },
      });
    } else {
      createMutation.mutate({
        content: trimmedContent,
        type,
        user_id: user.id,
      });
    }
  };

  const isExpired = (update) =>
    Boolean(update.expires_at) && new Date(update.expires_at) <= new Date();

  const getStatusLabel = (update) => {
    if (!update.is_active) return "Inactive";
    if (isExpired(update)) return "Expired";
    return "Active";
  };

  return (
    <div className="bg-mauve-1 border border-mauve-4 p-4 sm:p-6 rounded-xl shadow-lg mt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            System Updates Banner
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage the "What's New" banner shown on the dashboard.
          </p>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 py-2 bg-mauve-2 hover:bg-mauve-3 border border-mauve-4 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
        >
          {isOpen ? (
            "Close Manager"
          ) : (
            <>
              <Edit3 size={16} /> Manage Updates
            </>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
          {/* Create New Box */}
          <div className="bg-mauve-2 rounded-xl p-4 border border-mauve-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-foreground">
                New Update Content
              </label>
              <button
                type="button"
                onClick={generateAIContent}
                disabled={isGenerating}
                className="flex items-center gap-1.5 text-xs font-bold text-[color:var(--blue-9)] hover:text-[color:var(--blue-10)] bg-[color:var(--blue-9)]/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <Bot size={14} /> <Github size={14} />
                  </>
                )}
                {isGenerating
                  ? "Analyzing Commits..."
                  : "AI Summarize via GitHub"}
              </button>
            </div>

            <textarea
              className="w-full bg-mauve-1 border border-mauve-4 rounded-lg p-3 text-sm text-foreground focus:border-purple-500 min-h-[100px] outline-none"
              placeholder="What changed? Use AI or type manually..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={MAX_CONTENT_LENGTH + 200}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {content.trim().length}/{MAX_CONTENT_LENGTH} characters
            </p>

            <div className="flex items-center justify-between mt-3">
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="bg-mauve-1 border border-mauve-4 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:border-purple-500"
              >
                <option value="feature">New Feature</option>
                <option value="fix">System Fix</option>
                <option value="announcement">Announcement</option>
              </select>

              <div className="flex items-center gap-3">
                {editingId && (
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setContent("");
                    }}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handlePost}
                  disabled={
                    !content.trim() ||
                    createMutation.isPending ||
                    editMutation.isPending
                  }
                  className="bg-purple-600 hover:bg-purple-700 text-primary-foreground px-4 py-1.5 rounded-lg text-sm font-bold shadow-md disabled:bg-mauve-4 disabled:text-mauve-8 transition-colors flex items-center gap-2"
                >
                  {createMutation.isPending || editMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : editingId ? (
                    <Edit3 size={16} />
                  ) : (
                    <Plus size={16} />
                  )}
                  {editingId ? "Save Edit" : "Post Banner"}
                </button>
              </div>
            </div>
          </div>

          {/* History List */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-mauve-11 uppercase tracking-widest pl-1">
                History
              </h3>
              <div className="flex items-center gap-2">
                <TabGroup
                  variant="pill"
                  tabs={[
                    { value: "all", label: "All" },
                    { value: "active", label: "Active" },
                    { value: "expired", label: "Expired/Inactive" },
                  ]}
                  activeTab={historyFilter}
                  onChange={(v) => {
                    setHistoryFilter(v);
                    setHistoryPage(1);
                  }}
                  size="sm"
                />
                <select
                  value={historyPageSize}
                  onChange={(e) => {
                    setHistoryPageSize(Number(e.target.value));
                    setHistoryPage(1);
                  }}
                  className="bg-mauve-1 border border-mauve-4 rounded-lg px-2 py-1 text-xs font-medium outline-none focus:border-purple-500"
                >
                  {HISTORY_PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}/page
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {isLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="animate-spin text-mauve-8" />
              </div>
            ) : updates.length === 0 ? (
              <p className="text-sm text-muted-foreground italic pl-1">
                No past updates found.
              </p>
            ) : (
              updates.map((update) => (
                <div
                  key={update.id}
                  className="flex items-start gap-3 bg-mauve-1 border border-mauve-3 rounded-lg p-3"
                >
                  <div className="pt-1">
                    <button
                      onClick={() =>
                        toggleMutation.mutate({
                          id: update.id,
                          isActive: !update.is_active,
                        })
                      }
                      className={`w-10 h-6 rounded-full transition-colors relative ${update.is_active ? "bg-green-10" : "bg-mauve-4"}`}
                    >
                      <div
                        className={`w-4 h-4 bg-card rounded-full absolute top-1 transition-all ${update.is_active ? "left-5" : "left-1"}`}
                      />
                    </button>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-mauve-10 uppercase">
                          {update.type} •{" "}
                          {new Date(update.created_at).toLocaleDateString()}
                        </p>
                        <span className="text-[10px] font-semibold uppercase rounded-full px-2 py-0.5 bg-mauve-3 text-mauve-10 border border-mauve-4">
                          {getStatusLabel(update)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            if (inlineEditId === update.id) {
                              setInlineEditId(null);
                            } else {
                              setInlineEditId(update.id);
                              setInlineEditContent(update.content);
                              setInlineEditType(update.type);
                            }
                          }}
                          className={`transition-colors ${
                            inlineEditId === update.id
                              ? "text-[color:var(--blue-10)]"
                              : "text-mauve-8 hover:text-[color:var(--blue-9)]"
                          }`}
                          title="Edit Update"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            confirmDeleteToast(
                              "Delete Update?",
                              "This will permanently remove the update record.",
                              () => deleteMutation.mutate(update.id),
                            );
                          }}
                          className="text-mauve-8 hover:text-destructive transition-colors"
                          title="Delete Update"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {update.expires_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Expires: {new Date(update.expires_at).toLocaleString()}
                      </p>
                    )}
                    {inlineEditId === update.id ? (
                      <div className="mt-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1">
                        <textarea
                          className="w-full bg-card border border-mauve-4 rounded-lg p-2.5 text-sm text-foreground focus:border-purple-500 focus:ring-1 focus:ring-purple-500 min-h-[80px] outline-none"
                          value={inlineEditContent}
                          onChange={(e) => setInlineEditContent(e.target.value)}
                        />
                        <div className="flex items-center justify-between">
                          <select
                            value={inlineEditType}
                            onChange={(e) => setInlineEditType(e.target.value)}
                            className="bg-card border border-mauve-4 rounded-lg px-2 py-1.5 text-xs font-medium outline-none"
                          >
                            <option value="feature">New Feature</option>
                            <option value="fix">System Fix</option>
                            <option value="announcement">Announcement</option>
                          </select>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setInlineEditId(null)}
                              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
                            >
                              Cancel
                            </button>
                            <button
                              disabled={
                                !inlineEditContent.trim() ||
                                editMutation.isPending
                              }
                              onClick={() => {
                                editMutation.mutate(
                                  {
                                    id: update.id,
                                    data: {
                                      content: inlineEditContent.trim(),
                                      type: inlineEditType,
                                    },
                                  },
                                  { onSuccess: () => setInlineEditId(null) },
                                );
                              }}
                              className="bg-purple-600 hover:bg-purple-700 text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-50"
                            >
                              {editMutation.isPending ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                "Save"
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm mt-2 max-h-28 overflow-hidden relative">
                        <ReactMarkdown
                          components={{
                            p: ({ ...props }) => (
                              <p
                                className="mb-1 last:mb-0 opacity-90"
                                {...props}
                              />
                            ),
                            ul: ({ ...props }) => (
                              <ul
                                className="list-disc pl-5 mb-1 opacity-90"
                                {...props}
                              />
                            ),
                            li: ({ ...props }) => (
                              <li className="mb-0.5" {...props} />
                            ),
                            strong: ({ ...props }) => (
                              <strong
                                className="font-bold opacity-100"
                                {...props}
                              />
                            ),
                          }}
                        >
                          {update.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div className="flex items-center justify-between gap-2 pt-2">
              <p className="text-xs text-muted-foreground pl-1">
                {totalCount} total update{totalCount === 1 ? "" : "s"} • Page{" "}
                {historyPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setHistoryPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={historyPage <= 1 || isLoading}
                  className="px-2.5 py-1.5 rounded-lg border border-mauve-4 text-xs font-bold text-mauve-11 hover:bg-mauve-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <button
                  onClick={() =>
                    setHistoryPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={historyPage >= totalPages || isLoading}
                  className="px-2.5 py-1.5 rounded-lg border border-mauve-4 text-xs font-bold text-mauve-11 hover:bg-mauve-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
