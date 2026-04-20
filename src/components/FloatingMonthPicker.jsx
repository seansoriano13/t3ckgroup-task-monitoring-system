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
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
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
      className={`fixed bottom-16 right-16 flex flex-col items-end gap-3 z-[100] ${open ? "pointer-events-auto" : "pointer-events-none"}`}
    >
      {/* EXPANDED PANEL */}
      {open && (
        <div className="pointer-events-auto modal-enter origin-bottom-right mb-2 bg-popover/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl p-4 w-[340px] flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Calendar size={13} className="text-muted-foreground" />
              Time Range Analysis
            </p>
            <button
              onClick={goToday}
              className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-all hover:bg-muted p-1.5 rounded-md active:scale-95"
            >
              <RotateCcw size={11} />
              Reset
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-4 gap-1 bg-muted/40 p-1 rounded-lg border border-border/50">
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all duration-200 active:scale-95 ${mode === m
                  ? "bg-background text-foreground shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  }`}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>

          {/* Fixed Height Content Area */}
          <div className="h-[156px] flex flex-col gap-3">
            {mode !== "CUSTOM" ? (
              <>
                <div className="flex items-center justify-between border border-border bg-card rounded-lg p-1.5 shadow-sm">
                  <button
                    onClick={navPrev}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-95"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="flex-1 text-center">
                    <span className="text-[13px] font-bold text-foreground tracking-wide">
                      {rangeData.label}
                    </span>
                  </div>

                  <button
                    onClick={navNext}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-95"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Monthly Grid Quick-Jump */}
                {mode === "MONTHLY" && (
                  <div className="grid grid-cols-4 gap-1 flex-1">
                    {Array.from({ length: 12 }, (_, i) => {
                      const isSelected = i + 1 === Number(month.split("-")[1]);
                      const isNow =
                        i === now.getMonth() &&
                        Number(month.split("-")[0]) === now.getFullYear();
                      const mLabel = new Date(2000, i, 1).toLocaleString(
                        "default",
                        { month: "short" }
                      );
                      return (
                        <button
                          key={i}
                          onClick={() =>
                            setMonth(
                              `${month.split("-")[0]}-${String(i + 1).padStart(
                                2,
                                "0"
                              )}`
                            )
                          }
                          className={`relative w-full h-full flex flex-col items-center justify-center rounded-md text-[11px] font-semibold transition-all duration-200 active:scale-95 border ${isSelected
                            ? "bg-primary text-primary-foreground shadow-sm border-transparent"
                            : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground border-transparent hover:border-border/50"
                            }`}
                        >
                          {mLabel}
                          {isNow && !isSelected && (
                            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Quarter Grid Quick-Jump */}
                {mode === "QUARTERLY" && (
                  <div className="grid grid-cols-4 gap-2 flex-1">
                    {[1, 2, 3, 4].map((q) => (
                      <button
                        key={q}
                        onClick={() => setQuarter(q)}
                        className={`w-full h-full flex items-center justify-center rounded-md text-[13px] font-semibold transition-all duration-200 active:scale-95 border ${quarter === q
                          ? "bg-primary text-primary-foreground shadow-md border-transparent"
                          : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground border-transparent hover:border-border/50"
                          }`}
                      >
                        Q{q}
                      </button>
                    ))}
                  </div>
                )}

                {/* Yearly Grid Filler */}
                {mode === "YEARLY" && (
                  <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border/50 rounded-lg bg-muted/10">
                    <TrendingUp size={24} className="text-muted-foreground/30 mb-2" />
                    <span className="text-[12px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
                      Yearly Overview
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col gap-4 flex-1 justify-center rounded-lg border border-border/50 bg-muted/10 p-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-0.5">
                    Start Date
                  </label>
                  <DatePicker
                    selected={customStart ? new Date(customStart) : null}
                    onChange={(date) => {
                      if (!date) return;
                      const y = date.getFullYear();
                      const m = String(date.getMonth() + 1).padStart(2, "0");
                      const d = String(date.getDate()).padStart(2, "0");
                      setCustomStart(`${y}-${m}-${d}`);
                    }}
                    dateFormat="MMM d, yyyy"
                    portalId="root"
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-[13px] text-foreground font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all h-[38px] cursor-pointer"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-0.5">
                    End Date
                  </label>
                  <DatePicker
                    selected={customEnd ? new Date(customEnd) : null}
                    onChange={(date) => {
                      if (!date) return;
                      const y = date.getFullYear();
                      const m = String(date.getMonth() + 1).padStart(2, "0");
                      const d = String(date.getDate()).padStart(2, "0");
                      setCustomEnd(`${y}-${m}-${d}`);
                    }}
                    dateFormat="MMM d, yyyy"
                    portalId="root"
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-[13px] text-foreground font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all h-[38px] cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer info */}
          <div className="border-t border-border/50 pt-3 text-center">
            <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
              Syncing {mode.toLowerCase()} boundaries
            </p>
          </div>
        </div>
      )}

      {/* FAB TRIGGER BUTTON */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg transition-all duration-300 active:scale-95 border ${open
          ? "bg-accent text-accent-foreground border-border ring-2 ring-primary/10 shadow-xl"
          : "bg-card text-foreground border-border hover:border-border/80 hover:bg-accent/50"
          }`}
      >
        <div className={`p-2 rounded-lg transition-colors ${open ? "bg-background shadow-sm" : "bg-muted"}`}>
          <Calendar size={18} className={open ? "text-primary" : "text-muted-foreground"} />
        </div>
        <div className="flex flex-col items-start leading-[1.25]">
          <span className="uppercase tracking-widest text-[9.5px] text-muted-foreground font-bold mb-0.5">
            {mode === "MONTHLY"
              ? "Month"
              : mode === "QUARTERLY"
                ? "Quarter"
                : "Range"}
          </span>
          <span className="text-[13px] font-bold text-foreground">
            {rangeData.label}
          </span>
        </div>
      </button>
    </div>
  );

  return createPortal(content, document.body);
}
