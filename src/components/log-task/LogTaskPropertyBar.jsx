import React from "react";
import { Clock, ChevronDown } from "lucide-react";
import DatePicker from "react-datepicker";
import { formatTaskDateTime } from "../../utils/formatDate";
import Dropdown from "../ui/Dropdown";
import CategoryDropdown from "../dropdowns/CategoryDropdown";
import PriorityDropdown from "../dropdowns/PriorityDropdown";

export default function LogTaskPropertyBar({
  formData,
  setFormData,
  categories, // Pass the filtered array without the text-search applied
  isLoadingData,
  categoryRef,
  priorityRef,
  endTimeRef,
  setCommitteeRole,
  setOthersRemarks,
  openPopover,
  onTogglePopover,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 py-2.5 border-t border-mauve-3/40 animate-content-in stagger-3 relative z-[20]">
      {/* Category Dropdown */}
      <div className="relative z-[100]" ref={categoryRef}>
        <CategoryDropdown
          isOpen={openPopover === "category"}
          onToggle={() => onTogglePopover("category")}
          usePortal
          value={formData.categoryId}
          onChange={(newCategoryId) => {
            setFormData((p) => ({ ...p, categoryId: newCategoryId }));
          }}
          categories={categories}
          isLoading={isLoadingData}
          disabled={!formData.loggedById}
          onResetOthers={() => {
            setCommitteeRole("");
            setOthersRemarks("");
          }}
        />
      </div>

      {/* Priority Dropdown */}
      <div className="relative z-[100]" ref={priorityRef}>
        <PriorityDropdown
          isOpen={openPopover === "priority"}
          onToggle={() => onTogglePopover("priority")}
          usePortal
          value={formData.priority}
          onChange={(newPriority) => {
            setFormData((p) => ({ ...p, priority: newPriority }));
          }}
        />
      </div>

      {/* Time Dropdown */}
      <div className="relative z-[100]" ref={endTimeRef}>
        <Dropdown
          isOpen={openPopover === "endTime"}
          onToggle={() => onTogglePopover("endTime")}
          usePortal
          className="z-[100]"
          /* popoverClassName="absolute top-full right-0 mt-1.5 bg-muted border border-border rounded-xl shadow-2xl z-[110] p-3 w-[clamp(280px,90vw,420px)] popover-enter" */
          trigger={({ isOpen }) => (
            <button
              type="button"
              className={`property-pill ${isOpen ? "active" : ""}`}
            >
              <Clock size={13} className="text-muted-foreground" />
              <span
                className={
                  formData.endAt ? "text-foreground" : "text-muted-foreground"
                }
              >
                {formData.endAt
                  ? formatTaskDateTime(formData.endAt)
                  : "Set End Time"}
              </span>
              <ChevronDown size={12} className="text-mauve-7 ml-1" />
            </button>
          )}
        >
          {({ close }) => (
            <>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                End Date & Time
              </label>
              <div className="w-full py-1">
                <DatePicker
                  selected={formData.endAt ? new Date(formData.endAt) : null}
                  onChange={(date) =>
                    setFormData((p) => ({
                      ...p,
                      endAt: date ? date.toISOString() : "",
                    }))
                  }
                  inline
                  showTimeSelect
                  timeIntervals={15}
                  timeCaption="Time"
                  dateFormat="Pp"
                />
              </div>
              <div className="flex justify-end mt-3 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    close();
                  }}
                  style={{ backgroundColor: "var(--primary)" }}
                  className="px-4 py-1.5 text-primary-foreground rounded-lg text-[11px] font-bold hover:opacity-90 transition-all shadow-sm"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </Dropdown>
      </div>
    </div>
  );
}
