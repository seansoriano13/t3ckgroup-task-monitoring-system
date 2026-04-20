import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { systemUpdateService } from "../services/systemUpdateService";
import { githubService } from "../services/githubService";
import { aiService } from "../services/aiService";
import { useAuth } from "../context/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Megaphone,
  Rocket,
  Wrench,
  Bot,
  Github,
  Loader2,
  Plus,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  Radio,
} from "lucide-react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";

const MAX_CONTENT_LENGTH = 2000;
const HISTORY_PAGE_SIZE = 5;

const TYPE_OPTIONS = [
  {
    value: "announcement",
    label: "Announcement",
    icon: Megaphone,
    description: "General company-wide notice",
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    activeBg: "bg-amber-600",
  },
  {
    value: "feature",
    label: "New Feature",
    icon: Rocket,
    description: "Product update or new release",
    color: "text-indigo-600",
    bg: "bg-indigo-50 border-indigo-200",
    activeBg: "bg-indigo-600",
  },
  {
    value: "fix",
    label: "System Fix",
    icon: Wrench,
    description: "Bug fix or performance patch",
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
    activeBg: "bg-emerald-600",
  },
];

const getStatusStyles = (update) => {
  if (!update.is_active)
    return "bg-muted text-muted-foreground border-border";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
};

export default function BroadcastModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [content, setContent] = useState("");
  const [type, setType] = useState("announcement");
  const [editingId, setEditingId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setContent("");
      setType("announcement");
      setEditingId(null);
      setHistoryPage(1);
      setHistoryFilter("all");
      setIsHistoryCollapsed(false);
    }
  }, [isOpen]);

  // Keyboard shortcut
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const { data: pagedUpdates, isLoading } = useQuery({
    queryKey: ["allSystemUpdates", { page: historyPage, pageSize: HISTORY_PAGE_SIZE, filter: historyFilter }],
    queryFn: () =>
      systemUpdateService.getUpdatesPage({
        page: historyPage,
        pageSize: HISTORY_PAGE_SIZE,
        filter: historyFilter,
      }),
    enabled: isOpen,
  });

  const updates = pagedUpdates?.items || [];
  const totalPages = pagedUpdates?.totalPages || 1;
  const totalCount = pagedUpdates?.totalCount || 0;

  const createMutation = useMutation({
    mutationFn: (data) => systemUpdateService.createUpdate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allSystemUpdates"] });
      queryClient.invalidateQueries({ queryKey: ["latestActiveSystemUpdate"] });
      setContent("");
      setEditingId(null);
      toast.success("Broadcast sent!");
    },
    onError: (err) => toast.error(err.message),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }) => systemUpdateService.editUpdate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allSystemUpdates"] });
      queryClient.invalidateQueries({ queryKey: ["latestActiveSystemUpdate"] });
      setContent("");
      setEditingId(null);
      toast.success("Update saved.");
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) =>
      systemUpdateService.toggleUpdateStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allSystemUpdates"] });
      queryClient.invalidateQueries({ queryKey: ["latestActiveSystemUpdate"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => systemUpdateService.deleteUpdate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allSystemUpdates"] });
      queryClient.invalidateQueries({ queryKey: ["latestActiveSystemUpdate"] });
      toast.success("Update removed.");
    },
  });

  const generateAIContent = async () => {
    setIsGenerating(true);
    try {
      const commits = await githubService.getRecentCommits(15);
      if (!commits.length) {
        toast("No recent commits found.", { icon: "ℹ️" });
        return;
      }
      const summary = await aiService.summarizeCommits(commits);
      setContent(summary);
      setType("feature");
      toast.success("AI summary generated from GitHub commits!");
    } catch (err) {
      toast.error(err.message || "Failed to generate AI summary");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePost = () => {
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error("Broadcast message cannot be empty.");
      return;
    }
    if (trimmed.length > MAX_CONTENT_LENGTH) {
      toast.error(`Keep content within ${MAX_CONTENT_LENGTH} characters.`);
      return;
    }
    if (editingId) {
      editMutation.mutate({ id: editingId, data: { content: trimmed, type } });
    } else {
      createMutation.mutate({ content: trimmed, type, user_id: user.id });
    }
  };

  const isPosting = createMutation.isPending || editMutation.isPending;

  const selectedType = TYPE_OPTIONS.find((t) => t.value === type);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="p-0 gap-0 z-[70] shadow-[0_10px_40px_-10px_rgba(79,70,229,0.15)] flex flex-col w-[620px] sm:max-w-none max-w-[95vw] max-h-[90vh] rounded-2xl overflow-hidden"
      >
        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <div className="w-[18px] h-[18px] rounded flex items-center justify-center bg-primary text-white font-bold text-[9px] shrink-0">
              {user?.department?.charAt(0)?.toUpperCase() || "T"}
            </div>
            <ChevronDown size={11} className="text-muted-foreground/50 rotate-[-90deg]" />
            <span className="font-medium text-muted-foreground/80">Broadcast</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Scrollable Body ─────────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* Compose Section */}
          <div className="px-5 pt-4 pb-5 border-b border-border/40">

            {/* AI Generate Button */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {editingId ? "Editing Broadcast" : "New Broadcast"}
              </p>
              <button
                type="button"
                onClick={generateAIContent}
                disabled={isGenerating}
                className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-500 hover:text-indigo-600 bg-indigo-500/10 hover:bg-indigo-500/15 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <>
                    <Bot size={12} />
                    <Github size={12} />
                  </>
                )}
                {isGenerating ? "Analyzing commits…" : "AI via GitHub"}
              </button>
            </div>

            {/* Textarea */}
            <textarea
              className="w-full bg-muted/30 border border-border rounded-xl p-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 min-h-[110px] resize-none transition-all"
              placeholder="What's new? Announce a feature, fix, or important notice to the entire team…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={MAX_CONTENT_LENGTH + 200}
            />
            <p className="text-[10px] text-muted-foreground mt-1.5 text-right">
              {content.trim().length} / {MAX_CONTENT_LENGTH}
            </p>

            {/* Type Selector */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? `${opt.bg} border-current ring-2 ring-current/20`
                        : "bg-muted/20 border-border hover:bg-muted/40"
                    }`}
                  >
                    <Icon
                      size={14}
                      className={isSelected ? opt.color : "text-muted-foreground"}
                    />
                    <span
                      className={`text-[11px] font-bold ${
                        isSelected ? opt.color : "text-foreground"
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      {opt.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── History ─────────────────────────────────────── */}
          <div className="px-5 py-4">
            {/* History Header */}
            <div className="flex items-center justify-between mb-3">
              <button
                className="flex items-center gap-2 group"
                onClick={() => setIsHistoryCollapsed((v) => !v)}
              >
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  History
                </span>
                {isHistoryCollapsed ? (
                  <ChevronDown size={12} className="text-muted-foreground/50" />
                ) : (
                  <ChevronUp size={12} className="text-muted-foreground/50" />
                )}
              </button>

              {!isHistoryCollapsed && (
                <div className="flex items-center gap-1.5">
                  {["all", "active", "expired"].map((f) => (
                    <button
                      key={f}
                      onClick={() => { setHistoryFilter(f); setHistoryPage(1); }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                        historyFilter === f
                          ? "bg-primary text-white border-primary"
                          : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/60"
                      }`}
                    >
                      {f === "all" ? "All" : f === "active" ? "Active" : "Expired"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!isHistoryCollapsed && (
              <div className="space-y-2">
                {isLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 size={18} className="animate-spin text-muted-foreground" />
                  </div>
                ) : updates.length === 0 ? (
                  <div className="py-6 text-center">
                    <Radio size={24} className="mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground italic">No broadcasts yet.</p>
                  </div>
                ) : (
                  updates.map((update) => {
                    const typeOpt = TYPE_OPTIONS.find((t) => t.value === update.type);
                    const Icon = typeOpt?.icon || Megaphone;
                    return (
                      <div
                        key={update.id}
                        className="flex gap-3 bg-muted/20 border border-border/60 rounded-xl p-3 group/item hover:bg-muted/30 transition-colors"
                      >
                        {/* Toggle */}
                        <button
                          onClick={() =>
                            toggleMutation.mutate({ id: update.id, isActive: !update.is_active })
                          }
                          className={`mt-0.5 w-9 h-5 rounded-full shrink-0 relative transition-colors ${
                            update.is_active ? "bg-emerald-500" : "bg-muted-foreground/30"
                          }`}
                          title={update.is_active ? "Deactivate" : "Activate"}
                        >
                          <div
                            className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all shadow-sm ${
                              update.is_active ? "left-[18px]" : "left-[3px]"
                            }`}
                          />
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <Icon size={12} className={typeOpt?.color || "text-muted-foreground"} />
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                                {update.type}
                              </span>
                              <span className="text-[10px] text-muted-foreground/60">
                                {new Date(update.created_at).toLocaleDateString()}
                              </span>
                              <span
                                className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${getStatusStyles(update)}`}
                              >
                                {update.is_active ? "Live" : "Off"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setContent(update.content);
                                  setType(update.type);
                                  setEditingId(update.id);
                                }}
                                className="text-muted-foreground hover:text-indigo-500 transition-colors"
                                title="Edit"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm("Delete this broadcast?")) {
                                    deleteMutation.mutate(update.id);
                                  }
                                }}
                                className="text-muted-foreground hover:text-red-500 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                          <div className="text-xs text-foreground/80 leading-relaxed line-clamp-2">
                            <ReactMarkdown
                              components={{
                                p: ({ ...props }) => <p className="mb-0" {...props} />,
                                ul: ({ ...props }) => <ul className="list-disc pl-4" {...props} />,
                                li: ({ ...props }) => <li {...props} />,
                                strong: ({ ...props }) => <strong className="font-semibold" {...props} />,
                              }}
                            >
                              {update.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-[10px] text-muted-foreground">
                      {totalCount} total • Page {historyPage} of {totalPages}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                        disabled={historyPage <= 1 || isLoading}
                        className="px-2 py-1 rounded-lg border border-border text-[10px] font-bold text-muted-foreground hover:bg-muted/50 disabled:opacity-40 flex items-center gap-1"
                      >
                        <ChevronLeft size={12} /> Prev
                      </button>
                      <button
                        onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                        disabled={historyPage >= totalPages || isLoading}
                        className="px-2 py-1 rounded-lg border border-border text-[10px] font-bold text-muted-foreground hover:bg-muted/50 disabled:opacity-40 flex items-center gap-1"
                      >
                        Next <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────── */}
        <div className="px-5 py-4 border-t border-border bg-muted/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <kbd className="px-1.5 py-0.5 bg-muted/80 border border-border rounded font-sans text-[9px]">Esc</kbd>
            <span>to close</span>
          </div>
          <div className="flex items-center gap-2.5">
            {editingId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setEditingId(null); setContent(""); }}
                className="text-[13px] font-bold text-muted-foreground/80 hover:text-foreground h-9 rounded-xl px-4"
              >
                Cancel Edit
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-[13px] font-bold text-muted-foreground/80 hover:text-foreground h-9 rounded-xl px-4"
            >
              Close
            </Button>
            <Button
              onClick={handlePost}
              disabled={!content.trim() || isPosting}
              className="h-9 px-6 rounded-xl shadow-lg shadow-indigo-200 gap-2"
            >
              {isPosting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{editingId ? "Saving…" : "Sending…"}</span>
                </>
              ) : (
                <>
                  {editingId ? <Edit3 size={14} /> : <Megaphone size={14} />}
                  <span>{editingId ? "Save Edit" : "Send Broadcast"}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
