import { useState, useEffect, useRef, useMemo } from "react";
import { Trash2, ChevronDown, Wand2, MoreVertical } from "lucide-react";
import Select from "react-select";
import { inlineSelectStyles } from "../../../../styles/selectStyles";

export function ScheduleActivityRow({
  data,
  onChange,
  onDelete,
  onUseSmartSuggestion,
  onApplyTemplate,
  onClearSlot,
  onDuplicateSlot,
  onSaveCustomTemplate,
  canDelete,
  disabled,
  slotNum,
  availableCategories = [],
  compactMode = false,
  scheduleTemplates = [],
  customTemplates = [],
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  
  const isFilled = data.activity_type !== "None" || !!data.account_name;

  // react-select styling

  const options = useMemo(() => {
    const opts = [];
    
    if (availableCategories.length > 0) {
      opts.push({
        label: "Categories",
        options: availableCategories.map((cat) => ({ value: cat, label: cat })),
      });
    }
    
    if (scheduleTemplates.length > 0) {
      opts.push({
        label: "Standard Templates",
        options: scheduleTemplates.map((tpl) => ({ 
          value: `std_tpl:${tpl.id}`, 
          label: tpl.label 
        })),
      });
    }
    
    if (customTemplates.length > 0) {
      opts.push({
        label: "My Custom Templates",
        options: customTemplates.map((tpl, idx) => ({ 
          value: `cstm_tpl:${idx}`, 
          label: tpl.template_name 
        })),
      });
    }
    
    return opts;
  }, [availableCategories, scheduleTemplates, customTemplates]);

  const currentOption = useMemo(() => {
    if (!data.activity_type || data.activity_type === "None") return null;
    return { value: data.activity_type, label: data.activity_type };
  }, [data.activity_type]);

  const handleSelectChange = (option) => {
    if (!option) {
      onChange("activity_type", "None");
      return;
    }
    const val = option.value;
    if (val.startsWith("std_tpl:")) {
      const tplId = val.split(":")[1];
      onApplyTemplate(tplId);
    } else if (val.startsWith("cstm_tpl:")) {
      const idx = val.split(":")[1];
      const tpl = customTemplates[idx];
      if (tpl && tpl.template_payload) {
        Object.entries(tpl.template_payload).forEach(([field, value]) => {
          if (value !== undefined) {
             onChange(field, value);
          }
        });
      }
    } else {
      onChange("activity_type", val);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className={`bg-card border ${
        isFilled ? "border-border shadow-sm" : "border-border/50"
      } rounded-xl overflow-visible transition-all duration-200`}
    >
      {/* Accordion Header */}
      <div
        onClick={() => !disabled && setIsExpanded(!isExpanded)}
        className={`p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors rounded-xl ${disabled && "cursor-not-allowed opacity-80"}`}
      >
        <div className="flex gap-3 items-center flex-1 max-w-[65%] pr-2">
          <span className={`${isFilled ? "bg-[color:var(--violet-3)] text-[color:var(--violet-10)]" : "bg-muted text-muted-foreground"} font-black w-6 h-6 flex items-center justify-center rounded-full text-[10px] shrink-0 transition-colors`}>
            {slotNum}
          </span>
          <div className="max-w-[170px] w-full shrink-0">
            <Select
              options={options}
              value={currentOption}
              onChange={handleSelectChange}
              isDisabled={disabled}
              placeholder="Select activity..."
              styles={inlineSelectStyles(isFilled)}
              onMenuOpen={() => !disabled && setIsExpanded(true)} // Keep open when selecting
              classNamePrefix="rs"
              isSearchable={true}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {isFilled && (
            <span className="text-sm text-foreground font-semibold truncate hidden sm:block flex-1">
              {data.account_name || (
                <span className="text-muted-foreground italic text-xs">Unnamed Account</span>
              )}
            </span>
          )}
        </div>
        <div className="flex gap-1.5 items-center">
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUseSmartSuggestion();
              }}
              className="p-1.5 text-muted-foreground hover:text-[color:var(--violet-10)] hover:bg-[color:var(--violet-2)] rounded-lg transition-all"
              title="Smart Fill (Use previous entry)"
            >
              <Wand2 size={16} />
            </button>
          )}
          <ChevronDown
            size={18}
            className={`text-muted-foreground transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
          />
          <div ref={menuRef} className="relative ml-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <MoreVertical size={18} />
            </button>
            {showMenu && (
              <div 
                className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-xl py-1 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => { setShowMenu(false); onDuplicateSlot(); }}
                  disabled={disabled}
                  className="w-full text-left px-3 py-2 text-[13px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => { setShowMenu(false); canDelete ? onDelete() : onClearSlot(); }}
                  disabled={disabled}
                  className="w-full text-left px-3 py-2 text-[13px] font-semibold text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear Row
                </button>
                {isFilled && (
                  <button
                    type="button"
                    onClick={() => { setShowMenu(false); onSaveCustomTemplate(); }}
                    className="w-full text-left px-3 py-2 text-[13px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    Save as Custom Template
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Body - Auto expanding if filled and disabled so they can read it, or if toggled */}
      {(isExpanded || (disabled && isFilled)) && (
        <div className="p-4 pt-0 border-t border-mauve-3 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 mt-4">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] block mb-1.5">
              Account
            </label>
            <input
              type="text"
              disabled={disabled}
              value={data.account_name}
              onChange={(e) => onChange("account_name", e.target.value)}
              className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm text-foreground font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] block mb-1.5">
              Details (Plan)
            </label>
            <textarea
              disabled={disabled}
              value={data.remarks_plan}
              onChange={(e) => onChange("remarks_plan", e.target.value)}
              className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm text-foreground font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-none h-20"
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
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] block mb-1.5">Contact Person</label>
                <input type="text" disabled={disabled} value={data.contact_person} onChange={(e) => onChange("contact_person", e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm text-foreground font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
              </div>
              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] block mb-1.5">Contact Number</label>
                <input type="text" disabled={disabled} value={data.contact_number} onChange={(e) => onChange("contact_number", e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm text-foreground font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] block mb-1.5">Email Address</label>
                <input type="email" disabled={disabled} value={data.email_address} onChange={(e) => onChange("email_address", e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm text-foreground font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] block mb-1.5">Address</label>
                <input type="text" disabled={disabled} value={data.address} onChange={(e) => onChange("address", e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm text-foreground font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
              </div>
            </>
          )}
          {/* === EXPENSE & REFERENCE FIELDS === */}
          <div className="sm:col-span-2 border-t border-border pt-4 mt-2">
            <p className="text-[10px] font-black text-[color:var(--amber-10)] uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
              Fund Request &amp; Reference
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] block mb-1.5">Reference No. (SQ/TRM)</label>
                <input type="text" disabled={disabled} value={data.reference_number || ""} onChange={(e) => onChange("reference_number", e.target.value)}
                  placeholder="e.g. SQ-2026-001"
                  className="w-full bg-[color:var(--amber-2)]/50 border border-[color:var(--amber-6)] rounded-xl px-3 py-2 text-sm text-foreground font-medium outline-none focus:border-[color:var(--amber-8)] focus:ring-2 focus:ring-amber-100 transition-all placeholder:text-muted-foreground" />
              </div>
              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] block mb-1.5">Est. Expense (₱)</label>
                <input type="number" disabled={disabled} value={data.expense_amount || ""}
                  onChange={(e) => onChange("expense_amount", e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0.00" min="0" step="0.01"
                  className="w-full bg-[color:var(--amber-2)]/50 border border-[color:var(--amber-6)] rounded-xl px-3 py-2 text-sm text-foreground font-medium outline-none focus:border-[color:var(--amber-8)] focus:ring-2 focus:ring-amber-100 transition-all placeholder:text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
