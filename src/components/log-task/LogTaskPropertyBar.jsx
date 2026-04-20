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
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 py-2.5 border-t border-gray-3/40 animate-content-in stagger-3 relative z-[20]">
      {/* Category Dropdown */}
      <div className="relative z-[100]" ref={categoryRef}>
        <CategoryDropdown
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
          value={formData.priority}
          onChange={(newPriority) => {
            setFormData((p) => ({ ...p, priority: newPriority }));
          }}
        />
      </div>

      {/* Time Dropdown */}
      <div className="relative z-[100]" ref={endTimeRef}>
        <Dropdown
          className="z-[100]"
          popoverClassName="absolute top-full right-0 mt-1.5 bg-muted border border-border rounded-xl shadow-2xl z-[110] p-3 w-[220px] popover-enter"
          trigger={({ isOpen }) => (
            <button
              type="button"
              className={`property-pill ${isOpen ? "active" : ""}`}
            >
              <Clock size={13} className="text-slate-400" />
              <span
                className={
                  formData.endAt ? "text-foreground" : "text-muted-foreground"
                }
              >
                {formData.endAt
                  ? formatTaskDateTime(formData.endAt)
                  : "Set End Time"}
              </span>
              <ChevronDown size={12} className="text-gray-7 ml-1" />
            </button>
          )}
        >
          {({ close }) => (
            <>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                End Date & Time
              </label>
              <DatePicker
                selected={formData.endAt ? new Date(formData.endAt) : null}
                onChange={(date) =>
                  setFormData((p) => ({
                    ...p,
                    endAt: date ? date.toISOString() : "",
                  }))
                }
                showTimeSelect
                dateFormat="Pp"
                placeholderText="Select end date & time"
                className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none focus:border-gray-7 transition-colors mb-2 cursor-pointer"
                isClearable
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    close();
                  }}
                  className="text-[11px] font-semibold text-primary hover:underline"
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
