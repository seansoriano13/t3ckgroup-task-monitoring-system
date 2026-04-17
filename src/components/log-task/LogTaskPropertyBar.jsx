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
          <Tag size={13} className="text-gray-8" />
          <span className={formData.categoryId ? "text-gray-12" : "text-gray-7"}>
            {formData.categoryId || "Category"}
          </span>
          {formData.loggedById && (
            <ChevronDown size={12} className="text-gray-7" />
          )}
        </button>
        {openPopover === "category" && (
          <div className="absolute top-full left-0 mt-1.5 bg-gray-2 border border-gray-4 rounded-xl shadow-2xl z-[110] w-[280px] popover-enter">
            <div className="p-2 border-b border-gray-3">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-1 rounded-lg border border-gray-3">
                <Search size={14} className="text-gray-7 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search categories…"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-xs text-gray-12 placeholder:text-gray-7"
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
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 ${formData.categoryId === cat.category_id ? "bg-gray-4 text-gray-12 font-bold" : "text-gray-11 hover:bg-gray-3"}`}
                  >
                    <span className="truncate flex-1">
                      <span className="font-semibold">{cat.category_id}</span>
                      <span className="text-gray-8 ml-1.5">— {cat.description}</span>
                    </span>
                    {formData.categoryId === cat.category_id && (
                      <Check size={14} className="text-gray-10 flex-shrink-0" />
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
          <span className="text-gray-11">{currentPriority.label}</span>
          <ChevronDown size={12} className="text-gray-7" />
        </button>
        {openPopover === "priority" && (
          <div className="absolute top-full left-0 mt-1.5 bg-gray-2 border border-gray-4 rounded-xl shadow-2xl z-[110] min-w-[150px] popover-enter p-1">
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setFormData((p) => ({ ...p, priority: opt.value }));
                  onTogglePopover(null);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${formData.priority === opt.value ? "bg-gray-4 text-gray-12 font-bold" : "text-gray-11 hover:bg-gray-3"}`}
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
          <Clock size={13} className="text-gray-8" />
          <span className={formData.endAt ? "text-gray-12" : "text-gray-11"}>
            {formData.endAt ? formatTaskDateTime(formData.endAt) : "Set End Time"}
          </span>
          <ChevronDown size={12} className="text-gray-7" />
        </button>
        {openPopover === "endTime" && (
          <div className="absolute top-full right-0 mt-1.5 bg-gray-2 border border-gray-4 rounded-xl shadow-2xl z-[110] p-3 w-[220px] popover-enter">
            <label className="block text-[10px] font-bold text-gray-8 uppercase tracking-wider mb-2">
              End Date & Time
            </label>
            <input
              type="datetime-local"
              name="endAt"
              value={formData.endAt}
              onChange={(e) => setFormData((p) => ({ ...p, endAt: e.target.value }))}
              className="w-full bg-gray-1 border border-gray-4 rounded-lg px-2 py-1.5 text-xs text-gray-12 outline-none focus:border-gray-7 transition-colors mb-2"
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
