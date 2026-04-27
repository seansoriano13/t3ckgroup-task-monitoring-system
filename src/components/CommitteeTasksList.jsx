import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { committeeTaskService } from "../services/committeeTaskService";
import {
  Users,
  Search,
  X,
  List,
  LayoutGrid,
  Rows3,
} from "lucide-react";
import { Link } from "react-router";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import CommitteeTaskCard from "../pages/committee/components/CommitteeTaskCard";
export default function CommitteeTasksList({ selectedRange }) {
  const { user } = useAuth();
  const isSuperAdmin =
    user?.is_super_admin === true || user?.isSuperAdmin === true;
  const isHead = user?.is_head === true || user?.isHead === true;

  const [searchTerm, setSearchTerm] = useState("");
  const [layoutMode, setLayoutMode] = useState("row"); // "row" | "stack" | "grid"

  const { data: committeeTasks = [], isLoading } = useQuery({
    queryKey: ["committeeTasks", user?.id],
    queryFn: () =>
      committeeTaskService.getCommitteeTasks(user?.id, isHead, isSuperAdmin),
    enabled: !!user?.id,
  });

  const activeTasks = useMemo(() => {
    const tasks = committeeTasks.filter(
      (t) =>
        t.status === "ACTIVE" ||
        t.status === "PENDING" ||
        t.status === "COMPLETED",
    );

    if (!searchTerm.trim()) return tasks;
    const lower = searchTerm.toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(lower) ||
        t.description?.toLowerCase().includes(lower),
    );
  }, [committeeTasks, searchTerm]);

  if (isLoading) return null;
  if (committeeTasks.length === 0) return null;

  return (
    <div className="mt-8 bg-card border border-border rounded-2xl shadow-sm p-5 overflow-hidden">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-mauve-2 flex items-center justify-center text-mauve-11 shadow-sm border border-mauve-4">
            <Users size={18} />
          </div>
          <div>
            <h2 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
              Committee Tasks
            </h2>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
              Active group assignments •{" "}
              <span className="text-foreground">
                {selectedRange?.label || "This Range"}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* SEARCH */}
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 min-w-[200px]">
            <Search size={14} className="text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-foreground placeholder-muted-foreground w-full"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* LAYOUT TOGGLE */}
          <div className="flex items-center gap-1.5 bg-mauve-2 border border-mauve-5 p-1 rounded-lg">
            <button
              onClick={() => setLayoutMode("row")}
              className={`p-1 rounded transition-all ${layoutMode === "row" ? "bg-card shadow-sm text-red-9" : "text-muted-foreground hover:text-mauve-11"}`}
              title="Single Row"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setLayoutMode("stack")}
              className={`p-1 rounded transition-all ${layoutMode === "stack" ? "bg-card shadow-sm text-red-9" : "text-muted-foreground hover:text-mauve-11"}`}
              title="3-Row Stack"
            >
              <Rows3 size={16} />
            </button>
            <button
              onClick={() => setLayoutMode("grid")}
              className={`p-1 rounded transition-all ${layoutMode === "grid" ? "bg-card shadow-sm text-red-9" : "text-muted-foreground hover:text-mauve-11"}`}
              title="Full Grid"
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          {/* VIEW ALL */}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] h-9"
            asChild
          >
            <Link to="/committee">View All</Link>
          </Button>
        </div>
      </div>

      {/* DYNAMIC GRID CONTAINER */}
      {activeTasks.length > 0 ? (
        <div
          className={`
          ${layoutMode === "row" ? "flex gap-3 overflow-x-auto pb-4 custom-scrollbar snap-x" : ""}
          ${layoutMode === "stack" ? "grid grid-rows-3 grid-flow-col gap-3 overflow-x-auto pb-4 custom-scrollbar snap-x" : ""}
          ${layoutMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-4" : ""}
        `}
        >
          {activeTasks.map((task) => (
            <div
              key={task.id}
              className={`${
                layoutMode === "grid"
                  ? "w-full"
                  : "min-w-[320px] sm:min-w-[360px] snap-start"
              }`}
            >
              <CommitteeTaskCard
                task={task}
                currentUserId={user?.id}
                isSuperAdmin={isSuperAdmin}
                onView={() => {
                  window.dispatchEvent(
                    new CustomEvent("OPEN_ENTITY_DETAILS", {
                      detail: { id: task.id, type: "COMMITTEE_TASK" },
                    }),
                  );
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-mauve-2 flex items-center justify-center text-mauve-11 mb-3">
            <Search size={20} />
          </div>
          <p className="text-sm font-bold text-foreground">No tasks found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try adjusting your search or layout
          </p>
        </div>
      )}
    </div>
  );
}
