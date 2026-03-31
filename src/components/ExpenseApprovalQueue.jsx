import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "../services/salesService";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router";
import toast from "react-hot-toast";
import { CheckCircle2, DollarSign, XCircle, MapPin, Loader2, Clock, CheckSquare, Square, Search, X } from "lucide-react";

export default function ExpenseApprovalQueue({ isSuperAdmin }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const highlightExpenseId = location.state?.highlightExpenseId || null;

  const deptFilter = isSuperAdmin ? null : user?.department;

  const { data: appSettings } = useQuery({
    queryKey: ["appSettings"],
    queryFn: () => salesService.getAppSettings(),
    enabled: !!user?.id,
  });

  const { data: pendingExpenses = [], isLoading } = useQuery({
    queryKey: ["pendingExpenses", deptFilter],
    queryFn: () => salesService.getPendingExpenses(deptFilter),
    enabled: !!user?.id && !appSettings?.sales_self_approve_expenses,
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

  // Sync selection state when data changes (avoid stale IDs)
  useEffect(() => {
    setSelected(prev => {
      const validIds = new Set(pendingExpenses.map(e => e.id));
      return new Set([...prev].filter(id => validIds.has(id)));
    });
  }, [pendingExpenses]);

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

  if (appSettings?.sales_self_approve_expenses) return null;

  if (isLoading) return (
    <div className="p-6 text-center text-gray-400 text-sm font-medium flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-2xl mb-6">
      <Loader2 size={16} className="animate-spin" /> Loading expense queue...
    </div>
  );

  if (pendingExpenses.length === 0) return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm mb-6 px-5 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-gray-100 p-1.5 rounded-lg">
          <CheckCircle2 size={18} className="text-green-500" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-700">Expense Approval Queue</h2>
          <p className="text-xs text-gray-400">No pending expense approvals — all clear.</p>
        </div>
      </div>
      <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">0 pending</span>
    </div>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-6">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Select All checkbox */}
          <button onClick={toggleAll} className="shrink-0 text-gray-400 hover:text-gray-700 transition-colors">
            {allSelected
              ? <CheckSquare size={18} className="text-gray-800" />
              : <Square size={18} />
            }
          </button>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-gray-400" />
            <div>
              <h2 className="text-sm font-bold text-gray-800">Expense Approval Queue</h2>
              {someSelected
                ? <p className="text-xs text-gray-500">{filteredExpenses.filter(e => selected.has(e.id)).length} of {filteredExpenses.length} selected</p>
                : <p className="text-xs text-gray-400">{filteredExpenses.length}{filteredExpenses.length !== pendingExpenses.length ? ` of ${pendingExpenses.length}` : ''} pending authorization</p>
              }
            </div>
          </div>
        </div>

        {/* Bulk action buttons */}
        <div className="flex items-center gap-2">
          {someSelected ? (
            <>
              <button
                onClick={() => {
                  if (window.confirm(`Approve all ${selected.size} selected expense${selected.size > 1 ? "s" : ""}?`)) {
                    bulkApproveMutation.mutate(selected);
                  }
                }}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-700 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {bulkApproveMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                Approve {selected.size === pendingExpenses.length ? "All" : `${selected.size} Selected`}
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
              >
                Clear
              </button>
            </>
          ) : (
            <button
              onClick={() => setSelected(new Set(pendingExpenses.map(e => e.id)))}
              className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg transition-colors"
            >
              Select All
            </button>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
        <Search size={14} className="text-gray-400 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search employee, account, reference..."
          className="flex-1 text-sm text-gray-700 placeholder-gray-400 bg-transparent outline-none"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Items */}
      <div className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
        {filteredExpenses.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-6 italic">No results match "{search}"</p>
        )}
        {filteredExpenses.map(task => {
          const isHighlighted = task.id === highlightExpenseId;
          const isChecked = selected.has(task.id);
          return (
            <div
              key={task.id}
              ref={el => itemRefs.current[task.id] = el}
              className={`px-5 py-4 flex items-start gap-3 transition-colors ${
                isHighlighted ? "bg-blue-50/60 border-l-4 border-blue-400" :
                isChecked ? "bg-gray-50" : "hover:bg-gray-50"
              }`}
            >
              {/* Row checkbox */}
              <button
                onClick={() => toggleOne(task.id)}
                className="mt-0.5 shrink-0 text-gray-300 hover:text-gray-600 transition-colors"
              >
                {isChecked ? <CheckSquare size={16} className="text-gray-700" /> : <Square size={16} />}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-gray-500">{task.employees?.name}</span>
                  <span className="text-gray-300 text-xs">·</span>
                  <span className="text-xs text-gray-400">
                    {new Date(task.scheduled_date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>

                <p className="text-sm font-bold text-gray-800 truncate">
                  {task.account_name}
                  <span className="ml-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border border-gray-200 rounded px-1.5 py-0.5 align-middle">
                    {task.activity_type}
                  </span>
                </p>

                {task.address && (
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                    <MapPin size={11} /> {task.address}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-lg">
                    <DollarSign size={12} className="text-gray-400" />
                    ₱ {Number(task.expense_amount).toLocaleString()}
                  </div>
                  {task.reference_number && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-lg">
                      Ref: <span className="text-gray-800">{task.reference_number}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Individual action buttons */}
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => approveMutation.mutate({ id: task.id, isApproved: true })}
                  disabled={isPending}
                  title="Approve"
                  className="p-2 bg-gray-900 hover:bg-gray-700 text-white rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 size={14} />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("Reject this expense? The activity will be marked as REJECTED.")) {
                      approveMutation.mutate({ id: task.id, isApproved: false });
                    }
                  }}
                  disabled={isPending}
                  title="Reject"
                  className="p-2 bg-white hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg border border-gray-200 hover:border-red-200 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <XCircle size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
