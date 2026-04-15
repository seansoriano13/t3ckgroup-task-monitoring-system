import { useState } from "react";
import { Trash2, ChevronDown } from "lucide-react";

export function ScheduleActivityRow({
  data,
  onChange,
  onDelete,
  onUseSmartSuggestion,
  onApplyTemplate,
  canDelete,
  disabled,
  slotNum,
  availableCategories = [],
  compactMode = false,
  scheduleTemplates = [],
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isFilled = data.activity_type !== "None" || !!data.account_name;

  return (
    <div
      className={`bg-gray-1 border ${isFilled ? "border-gray-6 shadow-md" : "border-gray-4"} rounded-xl overflow-hidden transition-all delay-75`}
    >
      {/* Accordion Header */}
      <div
        onClick={() => !disabled && setIsExpanded(!isExpanded)}
        className={`p-3 flex items-center justify-between cursor-pointer hover:bg-gray-2 transition-colors ${disabled && "cursor-not-allowed opacity-80"}`}
      >
        <div className="flex gap-3 items-center flex-1 max-w-[65%] pr-2">
          <span className="bg-gray-3 text-gray-10 font-bold w-6 h-6 flex items-center justify-center rounded-full text-xs shrink-0">
            {slotNum}
          </span>
          <div className="max-w-[150px] w-full shrink-0">
            <select
              value={data.activity_type}
              onChange={(e) => onChange("activity_type", e.target.value)}
              disabled={disabled}
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent font-bold text-sm text-gray-12 outline-none w-full cursor-pointer disabled:cursor-not-allowed"
            >
              <option value="None">No Activity</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          {isFilled && (
            <span className="text-sm text-gray-12 font-medium truncate hidden sm:block flex-1">
              {data.account_name || (
                <span className="text-gray-8 italic">Unnamed Account</span>
              )}
            </span>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {!disabled && (
            <select
              defaultValue=""
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                if (e.target.value) onApplyTemplate(e.target.value);
                e.target.value = "";
              }}
              className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-violet-500/10 text-violet-700 border border-violet-500/20"
            >
              <option value="" disabled>
                Template
              </option>
              {scheduleTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
          )}
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUseSmartSuggestion();
              }}
              className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-violet-700 bg-violet-500/10 hover:bg-violet-500/20 rounded shadow-sm transition-all"
              title="Use smart suggestion from previous day/week"
            >
              Smart Fill
            </button>
          )}
          {!disabled && canDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 text-gray-9 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
              title="Remove Extra Added Slot"
            >
              <Trash2 size={16} />
            </button>
          )}
          <ChevronDown
            size={20}
            className={`text-gray-8 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {/* Form Body - Auto expanding if filled and disabled so they can read it, or if toggled */}
      {(isExpanded || (disabled && isFilled)) && (
        <div className="p-4 pt-0 border-t border-gray-3 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 mt-4">
            <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">
              Account
            </label>
            <input
              type="text"
              disabled={disabled}
              value={data.account_name}
              onChange={(e) => onChange("account_name", e.target.value)}
              className="w-full bg-gray-2 border border-gray-4 rounded px-3 py-1.5 text-sm text-gray-12 outline-none focus:border-primary"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">
              Details (Plan)
            </label>
            <textarea
              disabled={disabled}
              value={data.remarks_plan}
              onChange={(e) => onChange("remarks_plan", e.target.value)}
              className="w-full bg-gray-2 border border-gray-4 rounded px-3 py-1.5 text-sm text-gray-12 outline-none focus:border-primary resize-none h-20"
            />
          </div>

          {compactMode && (
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={() => setShowAdvanced((prev) => !prev)}
                className="text-[11px] font-bold text-primary hover:underline"
              >
                {showAdvanced ? "Hide advanced fields" : "Show advanced fields"}
              </button>
            </div>
          )}

          {(!compactMode || showAdvanced) && (
            <>
              <div>
                <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  disabled={disabled}
                  value={data.contact_person}
                  onChange={(e) => onChange("contact_person", e.target.value)}
                  className="w-full bg-gray-2 border border-gray-4 rounded px-3 py-1.5 text-sm text-gray-12 outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">
                  Contact Number
                </label>
                <input
                  type="text"
                  disabled={disabled}
                  value={data.contact_number}
                  onChange={(e) => onChange("contact_number", e.target.value)}
                  className="w-full bg-gray-2 border border-gray-4 rounded px-3 py-1.5 text-sm text-gray-12 outline-none focus:border-primary"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled={disabled}
                  value={data.email_address}
                  onChange={(e) => onChange("email_address", e.target.value)}
                  className="w-full bg-gray-2 border border-gray-4 rounded px-3 py-1.5 text-sm text-gray-12 outline-none focus:border-primary"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">
                  Address
                </label>
                <input
                  type="text"
                  disabled={disabled}
                  value={data.address}
                  onChange={(e) => onChange("address", e.target.value)}
                  className="w-full bg-gray-2 border border-gray-4 rounded px-3 py-1.5 text-sm text-gray-12 outline-none focus:border-primary"
                />
              </div>
            </>
          )}
          {/* === EXPENSE & REFERENCE FIELDS === */}
          <div className="sm:col-span-2 border-t border-gray-4 pt-3 mt-1">
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              Fund Request &amp; Reference
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">
                  Reference No. (SQ/TRM)
                </label>
                <input
                  type="text"
                  disabled={disabled}
                  value={data.reference_number || ""}
                  onChange={(e) => onChange("reference_number", e.target.value)}
                  placeholder="e.g. SQ-2026-001"
                  className="w-full bg-gray-2 border border-gray-4 rounded px-3 py-1.5 text-sm text-gray-12 outline-none focus:border-amber-500 placeholder:text-gray-7"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">
                  Est. Expense (₱)
                </label>
                <input
                  type="number"
                  disabled={disabled}
                  value={data.expense_amount || ""}
                  onChange={(e) =>
                    onChange(
                      "expense_amount",
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full bg-gray-2 border border-gray-4 rounded px-3 py-1.5 text-sm text-gray-12 outline-none focus:border-amber-500 placeholder:text-gray-7"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
