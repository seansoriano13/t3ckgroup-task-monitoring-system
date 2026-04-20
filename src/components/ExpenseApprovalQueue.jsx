import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "../services/salesService";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router";
import toast from "react-hot-toast";
import { CheckCircle2, DollarSign, XCircle, MapPin, Loader2, Clock, CheckSquare, Square, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ExpenseApprovalQueue({ isSuperAdmin }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const highlightExpenseId = location.state?.highlightExpenseId || null;

  const deptFilter = isSuperAdmin ? null : user?.department;

  const { data: appSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["appSettings"],
    queryFn: () => salesService.getAppSettings(),
    enabled: !!user?.id,
  });

  // Only enable the expenses query once appSettings has resolved.
  // While appSettings is undefined (loading), !appSettings?.sales_self_approve_expenses
  // evaluates to true which would fire the query prematurely and get stuck.
  const settingsResolved = !isLoadingSettings && appSettings !== undefined;
  const selfApproveEnabled = appSettings?.sales_self_approve_expenses === true;

  const { data: pendingExpenses = [], isLoading } = useQuery({
    queryKey: ["pendingExpenses", deptFilter],
    queryFn: () => salesService.getPendingExpenses(deptFilter),
    enabled: !!user?.id && settingsResolved && !selfApproveEnabled,
  });

  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState("");
  const itemRefs = useRef({});

  const filteredExpenses = pendingExpenses.filter(e => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      e.employees?.name?.toLowerCase().includes(q) ||
      e.account_name?.toLowerCase().includes(q) ||
      e.reference_number?.toLowerCase().includes(q) ||
      e.activity_type?.toLowerCase().includes(q)
    );
  });

  // Stable primitive key — only changes when the actual set of IDs changes.
  // Using the array directly as a dep causes an infinite loop because React Query
  // returns a new array reference on every render when the default `= []` is used.
  const pendingExpenseIds = pendingExpenses.map(e => e.id).join(",");

  // Sync selection state when data changes (avoid stale IDs)
  useEffect(() => {
    queueMicrotask(() => {
      setSelected((prev) => {
        const validIds = new Set(
          pendingExpenseIds ? pendingExpenseIds.split(",") : [],
        );
        return new Set([...prev].filter((id) => validIds.has(id)));
      });
    });
  }, [pendingExpenseIds]);

  // Scroll to highlighted item from notification
  useEffect(() => {
    if (highlightExpenseId && itemRefs.current[highlightExpenseId]) {
      setTimeout(() => {
        itemRefs.current[highlightExpenseId]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 400);
    }
  }, [highlightExpenseId, pendingExpenses]);

  const allSelected = filteredExpenses.length > 0 && filteredExpenses.every(e => selected.has(e.id));
  const someSelected = selected.size > 0 && filteredExpenses.some(e => selected.has(e.id));

  const toggleAll = () => {
    if (allSelected) {
      // Deselect only the visible (filtered) items
      setSelected(prev => {
        const next = new Set(prev);
        filteredExpenses.forEach(e => next.delete(e.id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        filteredExpenses.forEach(e => next.add(e.id));
        return next;
      });
    }
  };

  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const approveMutation = useMutation({
    mutationFn: ({ id, isApproved }) => salesService.approveExpenseActivity(id, isApproved),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pendingExpenses"] });
      queryClient.invalidateQueries({ queryKey: ["dailyActivities"] });
      toast.success(variables.isApproved ? "Expense Approved!" : "Expense Rejected.");
    },
    onError: (err) => toast.error(err.message),
  });

  const bulkApproveMutation = useMutation({
    mutationFn: (ids) => salesService.bulkApproveExpenses([...ids]),
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["pendingExpenses"] });
      queryClient.invalidateQueries({ queryKey: ["dailyActivities"] });
      setSelected(new Set());
      toast.success(`${ids.size} expense${ids.size > 1 ? "s" : ""} approved.`);
    },
    onError: (err) => toast.error(err.message),
  });

  const isPending = approveMutation.isPending || bulkApproveMutation.isPending;

  // Hide completely while app settings are loading, or if self-approve is enabled.
  if (isLoadingSettings || !settingsResolved) return null;
  if (selfApproveEnabled) return null;

  if (isLoading) return (
    <div className="p-6 text-center text-muted-foreground text-sm font-medium flex items-center justify-center gap-2 bg-card border border-border rounded-2xl mb-6">
      <Loader2 size={16} className="animate-spin" /> Loading expense queue...
    </div>
  );

  if (pendingExpenses.length === 0) return (
    <div className="bg-card border border-border rounded-2xl shadow-sm mb-6 px-5 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-muted p-1.5 rounded-lg">
          <CheckCircle2 size={18} className="text-green-500" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-foreground">Expense Approval Queue</h2>
          <p className="text-xs text-muted-foreground">No pending expense approvals — all clear.</p>
        </div>
      </div>
      <span className="text-xs font-bold text-muted-foreground bg-muted/80 px-2.5 py-1 rounded-full">0 pending</span>
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden mb-6">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between gap-3 flex-wrap bg-muted">
        <div className="flex items-center gap-3">
          {/* Select All checkbox */}
          <button onClick={toggleAll} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
            {allSelected
              ? <CheckSquare size={18} className="text-foreground" />
              : <Square size={18} />
            }
          </button>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-muted-foreground" />
            <div>
              <h2 className="text-sm font-bold text-foreground">Expense Approval Queue</h2>
              {someSelected
                ? <p className="text-xs text-muted-foreground">{filteredExpenses.filter(e => selected.has(e.id)).length} of {filteredExpenses.length} selected</p>
                : <p className="text-xs text-muted-foreground">{filteredExpenses.length}{filteredExpenses.length !== pendingExpenses.length ? ` of ${pendingExpenses.length}` : ''} pending authorization</p>
              }
            </div>
          </div>
        </div>        {/* Bulk action buttons */}
        <div className="flex items-center gap-2">
          {someSelected ? (
            <>
              <Button
                onClick={() => {
                  if (window.confirm(`Approve all ${selected.size} selected expense${selected.size > 1 ? "s" : ""}?`)) {
                    bulkApproveMutation.mutate(selected);
                  }
                }}
                disabled={isPending}
                size="sm"
                className="flex items-center shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {bulkApproveMutation.isPending ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <CheckCircle2 size={14} className="mr-1.5" />}
                Approve {selected.size === pendingExpenses.length ? "All" : `${selected.size} Selected`}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelected(new Set())}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelected(new Set(pendingExpenses.map(e => e.id)))}
              className="text-muted-foreground hover:text-foreground shadow-sm"
            >
              Select All
            </Button>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-2 bg-card">
        <Search size={16} className="text-muted-foreground shrink-0" />
        <Input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search employee, account, reference..."
          className="flex-1 text-sm border-none shadow-none focus-visible:ring-0 px-1"
        />
        {search && (
          <Button variant="ghost" size="icon" onClick={() => setSearch('')} className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <X size={14} />
          </Button>
        )}
      </div>

      {/* Items */}
      <div className="divide-y divide-border max-h-[420px] overflow-y-auto custom-scrollbar">
        {filteredExpenses.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6 italic bg-card">No results match "{search}"</p>
        )}
        {filteredExpenses.map(task => {
          const isHighlighted = task.id === highlightExpenseId;
          const isChecked = selected.has(task.id);
          return (
            <div
              key={task.id}
              ref={el => itemRefs.current[task.id] = el}
              className={`px-5 py-4 flex items-start gap-3 transition-colors ${isHighlighted ? "bg-primary/5 border-l-4 border-primary" :
                  isChecked ? "bg-muted" : "hover:bg-muted/50 bg-card"
                }`}
            >
              {/* Row checkbox */}
              <button
                onClick={() => toggleOne(task.id)}
                className="mt-0.5 shrink-0 text-slate-400 hover:text-muted-foreground transition-colors"
              >
                {isChecked ? <CheckSquare size={16} className="text-foreground" /> : <Square size={16} />}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-muted-foreground/80">{task.employees?.name}</span>
                  <span className="text-gray-7 text-xs">·</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(task.scheduled_date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>

                <p className="text-sm font-bold text-foreground truncate">
                  {task.account_name}
                  <span className="ml-2 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider border border-border rounded px-1.5 py-0.5 align-middle bg-muted">
                    {task.activity_type}
                  </span>
                </p>

                {task.address && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                    <MapPin size={11} /> {task.address}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted border border-border px-2.5 py-1 rounded-lg">
                    <DollarSign size={12} className="text-muted-foreground" />
                    ₱ {Number(task.expense_amount).toLocaleString()}
                  </div>
                  {task.reference_number && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted border border-border px-2.5 py-1 rounded-lg">
                      Ref: <span className="text-foreground">{task.reference_number}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Individual action buttons */}
              <div className="flex gap-2 shrink-0">
                <Button
                  size="icon"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 w-8 shadow-sm"
                  onClick={() => approveMutation.mutate({ id: task.id, isApproved: true })}
                  disabled={isPending}
                  title="Approve"
                >
                  <CheckCircle2 size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 h-8 w-8"
                  onClick={() => {
                    if (window.confirm("Reject this expense? The activity will be marked as REJECTED.")) {
                      approveMutation.mutate({ id: task.id, isApproved: false });
                    }
                  }}
                  disabled={isPending}
                  title="Reject"
                >
                  <XCircle size={16} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
