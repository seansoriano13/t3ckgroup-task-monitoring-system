import { Tag, Clock, ChevronDown, Search, Check } from "lucide-react";
import { PRIORITY_OPTIONS } from "../../constants/task";
import { formatTaskDateTime } from "../../utils/formatDate";

export default function LogTaskPropertyBar({
  formData,
  setFormData,
  openPopover,
  onTogglePopover,
  categorySearch,
  setCategorySearch,
  searchedCategories,
  isLoadingData,
  categoryRef,
  priorityRef,
  endTimeRef,
  setCommitteeRole,
  setOthersRemarks,
}) {
  const currentPriority =
    PRIORITY_OPTIONS.find((p) => p.value === formData.priority) ||
    PRIORITY_OPTIONS[0];

  return (
    <div className="flex flex-wrap items-center gap-2 py-2.5 border-t border-gray-3/40 animate-content-in stagger-3 relative z-[20]">
      {/* Category Pill */}
      <div className="relative z-[100]" ref={categoryRef}>
        <button
          type="button"
          onClick={() => {
            if (formData.loggedById) onTogglePopover("category");
          }}
          className={`property-pill ${openPopover === "category" ? "active" : ""} ${!formData.loggedById ? "static" : ""}`}
        >
          <Tag size={13} className="text-slate-400" />
          <span className={formData.categoryId ? "text-foreground" : "text-gray-7"}>
            {formData.categoryId || "Category"}
          </span>
          {formData.loggedById && (
            <ChevronDown size={12} className="text-gray-7" />
          )}
        </button>
        {openPopover === "category" && (
          <div className="absolute top-full left-0 mt-1.5 bg-muted border border-border rounded-xl shadow-2xl z-[110] w-[280px] popover-enter">
            <div className="p-2 border-b border-gray-3">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-card rounded-lg border border-gray-3">
                <Search size={14} className="text-gray-7 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search categories…"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-xs text-foreground placeholder:text-gray-7"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-[260px] overflow-y-auto p-1">
              {searchedCategories.length === 0 ? (
                <p className="text-xs text-gray-7 text-center py-4">
                  {isLoadingData ? "Loading…" : "No categories found"}
                </p>
              ) : (
                searchedCategories.map((cat) => (
                  <button
                    key={cat.category_id}
                    type="button"
                    onClick={() => {
                      setFormData((p) => ({
                        ...p,
                        categoryId: cat.category_id,
                      }));
                      setCommitteeRole("");
                      setOthersRemarks("");
                      onTogglePopover(null);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 ${formData.categoryId === cat.category_id ? "bg-slate-200 text-foreground font-bold" : "text-muted-foreground hover:bg-muted/80"}`}
                  >
                    <span className="truncate flex-1">
                      <span className="font-semibold">{cat.category_id}</span>
                      <span className="text-slate-400 ml-1.5">— {cat.description}</span>
                    </span>
                    {formData.categoryId === cat.category_id && (
                      <Check size={14} className="text-muted-foreground/80 flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Priority Pill */}
      <div className="relative z-[100]" ref={priorityRef}>
        <button
          type="button"
          onClick={() => onTogglePopover("priority")}
          className={`property-pill ${openPopover === "priority" ? "active" : ""}`}
        >
          <span className={`inline-block w-2 h-2 rounded-full ${currentPriority.dot}`} />
          <span className="text-muted-foreground">{currentPriority.label}</span>
          <ChevronDown size={12} className="text-gray-7" />
        </button>
        {openPopover === "priority" && (
          <div className="absolute top-full left-0 mt-1.5 bg-muted border border-border rounded-xl shadow-2xl z-[110] min-w-[150px] popover-enter p-1">
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setFormData((p) => ({ ...p, priority: opt.value }));
                  onTogglePopover(null);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${formData.priority === opt.value ? "bg-slate-200 text-foreground font-bold" : "text-muted-foreground hover:bg-muted/80"}`}
              >
                <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Time Pill */}
      <div className="relative z-[100]" ref={endTimeRef}>
        <button
          type="button"
          onClick={() => onTogglePopover("endTime")}
          className={`property-pill ${openPopover === "endTime" ? "active" : ""}`}
        >
          <Clock size={13} className="text-slate-400" />
          <span className={formData.endAt ? "text-foreground" : "text-muted-foreground"}>
            {formData.endAt ? formatTaskDateTime(formData.endAt) : "Set End Time"}
          </span>
          <ChevronDown size={12} className="text-gray-7" />
        </button>
        {openPopover === "endTime" && (
          <div className="absolute top-full right-0 mt-1.5 bg-muted border border-border rounded-xl shadow-2xl z-[110] p-3 w-[220px] popover-enter">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              End Date & Time
            </label>
            <input
              type="datetime-local"
              name="endAt"
              value={formData.endAt}
              onChange={(e) => setFormData((p) => ({ ...p, endAt: e.target.value }))}
              className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none focus:border-gray-7 transition-colors mb-2"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onTogglePopover(null)}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
