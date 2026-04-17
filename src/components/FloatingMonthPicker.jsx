import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  TrendingUp,
  LayoutGrid,
} from "lucide-react";
import {
  getMonthBoundaries,
  getQuarterBoundaries,
  getYearBoundaries,
  getQuarterFromMonth,
  getMonthKeysInRange,
} from "../utils/dateUtils";

const MODES = ["MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"];
const MODE_LABELS = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
  CUSTOM: "Custom",
};

/**
 * GlobalRangePicker (formerly FloatingMonthPicker)
 * Now supports Monthly, Quarterly, Yearly, and Custom ranges.
 * Used globally to sync all dashboard modules.
 */
export default function FloatingMonthPicker({ selectedRange, onChange }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const now = new Date();

  // Internal state for selection (mirrors TimeRangeSelector logic)
  const [mode, setMode] = useState(selectedRange?.mode || "MONTHLY");
  const [month, setMonth] = useState(
    selectedRange?.mode === "MONTHLY"
      ? selectedRange.startDate.slice(0, 7)
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  );
  const [quarter, setQuarter] = useState(
    selectedRange?.mode === "QUARTERLY"
      ? getQuarterFromMonth(selectedRange.startDate)
      : getQuarterFromMonth(month),
  );
  const [year, setYear] = useState(
    selectedRange?.startDate
      ? new Date(selectedRange.startDate).getFullYear()
      : now.getFullYear(),
  );
  const [customStart, setCustomStart] = useState(
    selectedRange?.mode === "CUSTOM"
      ? selectedRange.startDate
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
  );
  const [customEnd, setCustomEnd] = useState(
    selectedRange?.mode === "CUSTOM"
      ? selectedRange.endDate
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
          now.getDate(),
        ).padStart(2, "0")}`,
  );

  // Compute boundaries based on internal state
  const rangeData = useMemo(() => {
    let startDate, endDate, label;

    if (mode === "MONTHLY") {
      const b = getMonthBoundaries(month);
      startDate = b.startDate;
      endDate = b.endDate;
      label = new Date(month + "-01").toLocaleString("default", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
    } else if (mode === "QUARTERLY") {
      const b = getQuarterBoundaries(year, quarter);
      startDate = b.startDate;
      endDate = b.endDate;
      label = `Q${quarter} ${year}`;
    } else if (mode === "YEARLY") {
      const b = getYearBoundaries(year);
      startDate = b.startDate;
      endDate = b.endDate;
      label = String(year);
    } else {
      startDate = customStart;
      endDate = customEnd;
      label = `Custom Range`; // Simplified for the FAB label
    }

    const monthKeys = getMonthKeysInRange(startDate, endDate);
    return { startDate, endDate, label, mode, monthKeys };
  }, [mode, month, quarter, year, customStart, customEnd]);

  // Sync back to parent
  useEffect(() => {
    // Only emit if it's different to prevent loops
    if (
      rangeData.startDate !== selectedRange?.startDate ||
      rangeData.endDate !== selectedRange?.endDate ||
      rangeData.mode !== selectedRange?.mode
    ) {
      onChange?.(rangeData);
    }
  }, [rangeData, onChange, selectedRange]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const navPrev = () => {
    if (mode === "MONTHLY") {
      const [y, m] = month.split("-").map(Number);
      const prev =
        m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
      setMonth(prev);
    } else if (mode === "QUARTERLY") {
      if (quarter === 1) {
        setQuarter(4);
        setYear(year - 1);
      } else setQuarter(quarter - 1);
    } else if (mode === "YEARLY") {
      setYear(year - 1);
    }
  };

  const navNext = () => {
    if (mode === "MONTHLY") {
      const [y, m] = month.split("-").map(Number);
      const next =
        m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
      setMonth(next);
    } else if (mode === "QUARTERLY") {
      if (quarter === 4) {
        setQuarter(1);
        setYear(year + 1);
      } else setQuarter(quarter + 1);
    } else if (mode === "YEARLY") {
      setYear(year + 1);
    }
  };

  const goToday = () => {
    setMode("MONTHLY");
    setMonth(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    );
  };
  const content = (
    <div
      ref={panelRef}
      className={`fixed bottom-6 right-6 flex flex-col items-end gap-3 z-[100] ${open ? "pointer-events-auto" : "pointer-events-none"}`}
    >
      {/* EXPANDED PANEL */}
      {open && (
        <div className="pointer-events-auto mb-3 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 w-80 flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <p className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
              <LayoutGrid size={12} className="text-[#6B7280]" />
              Time Range Analysis
            </p>
            <button
              onClick={goToday}
              className="flex items-center gap-1 text-[10px] font-bold text-[#6B7280] hover:text-[#111827] transition-colors"
            >
              <RotateCcw size={11} />
              Reset to Now
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-4 gap-1">
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                  mode === m
                    ? "bg-[#111827] text-white shadow-sm"
                    : "text-[#6B7280] hover:text-[#111827] hover:bg-gray-50"
                }`}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>

          {/* Navigation Controls */}
          {mode !== "CUSTOM" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-2 border border-gray-4 rounded-xl p-1.5 gap-2">
                <button
                  onClick={navPrev}
                  className="p-2 rounded-lg hover:bg-gray-3 text-gray-9 hover:text-gray-12 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="flex-1 text-center">
                  <span className="text-sm font-black text-gray-12 uppercase tracking-wide">
                    {rangeData.label}
                  </span>
                </div>

                <button
                  onClick={navNext}
                  className="p-2 rounded-lg hover:bg-gray-3 text-gray-9 hover:text-gray-12 transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Monthly Grid Quick-Jump (Only in Monthly Mode) */}
              {mode === "MONTHLY" && (
                <div className="grid grid-cols-4 gap-1">
                  {Array.from({ length: 12 }, (_, i) => {
                    const isSelected = i + 1 === Number(month.split("-")[1]);
                    const isNow =
                      i === now.getMonth() &&
                      Number(month.split("-")[0]) === now.getFullYear();
                    const mLabel = new Date(2000, i, 1).toLocaleString(
                      "default",
                      { month: "short" },
                    );
                    return (
                      <button
                        key={i}
                        onClick={() =>
                          setMonth(
                            `${month.split("-")[0]}-${String(i + 1).padStart(
                              2,
                              "0",
                            )}`,
                          )
                        }
                        className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          isSelected
                            ? "bg-[#111827] text-white shadow-sm"
                            : "bg-transparent text-[#6B7280] hover:bg-gray-100"
                        }`}
                      >
                        {mLabel}
                        {isNow && !isSelected && (
                          <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-green-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Quarter Grid Quick-Jump (Only in Quarterly Mode) */}
              {mode === "QUARTERLY" && (
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuarter(q)}
                      className={`py-2 rounded-lg text-[11px] font-bold transition-all ${
                        quarter === q
                          ? "bg-[#111827] text-white shadow-sm"
                          : "bg-transparent text-[#6B7280] hover:bg-gray-100"
                      }`}
                    >
                      Q{q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Custom Date Pickers */}
          {mode === "CUSTOM" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-9 uppercase tracking-widest ml-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-[#111827] font-semibold outline-none focus:border-[#111827] h-10"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-[#6B7280] uppercase tracking-widest ml-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-[#111827] font-semibold outline-none focus:border-[#111827] h-10"
                />
              </div>
            </div>
          )}

          {/* Footer info */}
          <div className="border-t border-gray-100 pt-3 text-center">
            <p className="text-[11px] font-medium text-gray-400 italic">
              Syncing analytics across {mode.toLowerCase()} boundaries...
            </p>
          </div>
        </div>
      )}

      {/* FAB TRIGGER BUTTON */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-lg font-bold text-xs shadow-sm transition-all duration-300 border ${
          open
            ? "bg-[#F9FAFB] text-[#111827] border-[#D1D5DB]"
            : "bg-white text-[#111827] border-[#E5E7EB] hover:border-[#D1D5DB]"
        }`}
      >
        <Calendar size={16} className="text-[#6B7280]" />
        <div className="flex flex-col items-start leading-tight">
          <span className="uppercase tracking-widest text-[9px] text-[#6B7280] font-bold">
            {mode === "MONTHLY"
              ? "Month"
              : mode === "QUARTERLY"
                ? "Quarter"
                : "Range"}
          </span>
          <span className="text-xs font-semibold text-[#111827]">
            {rangeData.label}
          </span>
        </div>
      </button>
    </div>
  );

  return createPortal(content, document.body);
}
