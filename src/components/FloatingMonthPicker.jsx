import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  TrendingUp,
} from "lucide-react";

/**
 * FloatingMonthPicker
 *
 * Rendered via a React Portal directly into document.body so it is
 * never trapped inside a parent stacking context. Modals at z-[9999]
 * will always render above this FAB (z-40).
 */

export default function FloatingMonthPicker({ selectedMonth, onChange }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const parsedDate =
    selectedMonth && !isNaN(new Date(selectedMonth).getTime())
      ? new Date(selectedMonth)
      : new Date();
  const year = parsedDate.getFullYear();
  const month = parsedDate.getMonth();

  const fmt = (d) =>
    d.toLocaleString("default", { month: "short", year: "numeric" });

  const isCurrentMonth = (() => {
    const now = new Date();
    return year === now.getFullYear() && month === now.getMonth();
  })();

  const emitMonth = (y, m) => {
    const mm = String(m + 1).padStart(2, "0");
    onChange(`${y}-${mm}-01`);
  };

  const goPrev = () => {
    const d = new Date(year, month - 1, 1);
    emitMonth(d.getFullYear(), d.getMonth());
  };
  const goNext = () => {
    const d = new Date(year, month + 1, 1);
    emitMonth(d.getFullYear(), d.getMonth());
  };
  const goToday = () => {
    const now = new Date();
    emitMonth(now.getFullYear(), now.getMonth());
  };

  const PRESETS = [
    { label: "Q1", months: [0, 1, 2] },
    { label: "Q2", months: [3, 4, 5] },
    { label: "Q3", months: [6, 7, 8] },
    { label: "Q4", months: [9, 10, 11] },
  ];

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

  const fab = (
    <div
      ref={panelRef}
      className="fixed bottom-6 right-6 flex flex-col items-end gap-3"
      style={{ zIndex: 30 }}
    >
      {/* EXPANDED PANEL */}
      {open && (
        <div className="bg-gray-1 border border-gray-4 rounded-2xl shadow-2xl p-4 w-72 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-9 flex items-center gap-1.5">
              <TrendingUp size={12} className="text-primary" />
              Target Month
            </p>
            {!isCurrentMonth && (
              <button
                onClick={goToday}
                className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/80 transition-colors"
              >
                <RotateCcw size={11} />
                This Month
              </button>
            )}
          </div>

          {/* Month Nav */}
          <div className="flex items-center justify-between bg-gray-2 border border-gray-4 rounded-xl px-2 py-1.5 gap-2">
            <button
              onClick={goPrev}
              className="p-1.5 rounded-lg hover:bg-gray-3 text-gray-9 hover:text-gray-12 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>

            <DatePicker
              selected={parsedDate}
              onChange={(date) => {
                if (date) emitMonth(date.getFullYear(), date.getMonth());
              }}
              showMonthYearPicker
              dateFormat="MMMM yyyy"
              className="bg-transparent text-gray-12 font-black text-sm outline-none cursor-pointer text-center w-36"
            />

            <button
              onClick={goNext}
              className="p-1.5 rounded-lg hover:bg-gray-3 text-gray-9 hover:text-gray-12 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Quarter Quick-Jump */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-8 mb-2">
              Quarter Jump ({year})
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {PRESETS.map((q) => {
                const isActive = q.months.includes(month);
                return (
                  <button
                    key={q.label}
                    onClick={() => emitMonth(year, q.months[0])}
                    className={`py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                      isActive
                        ? "bg-primary text-white shadow shadow-primary/30"
                        : "bg-gray-2 border border-gray-4 text-gray-9 hover:border-primary/50 hover:text-gray-12"
                    }`}
                  >
                    {q.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Month Grid */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-8 mb-2">
              Month Grid
            </p>
            <div className="grid grid-cols-4 gap-1">
              {Array.from({ length: 12 }, (_, i) => {
                const d = new Date(year, i, 1);
                const label = d.toLocaleString("default", { month: "short" });
                const isSelected = i === month;
                const isNow =
                  i === new Date().getMonth() &&
                  year === new Date().getFullYear();
                return (
                  <button
                    key={i}
                    onClick={() => emitMonth(year, i)}
                    className={`py-1 rounded-lg text-[11px] font-bold transition-all relative ${
                      isSelected
                        ? "bg-primary text-white shadow shadow-primary/25"
                        : "bg-gray-2 border border-gray-4 text-gray-10 hover:border-primary/50 hover:text-gray-12"
                    }`}
                  >
                    {label}
                    {isNow && !isSelected && (
                      <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-green-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Year stepper */}
          <div className="flex items-center justify-between border-t border-gray-4 pt-3">
            <button
              onClick={() => emitMonth(year - 1, month)}
              className="p-1.5 rounded-lg hover:bg-gray-3 text-gray-9 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm font-black text-gray-12">{year}</span>
            <button
              onClick={() => emitMonth(year + 1, month)}
              className="p-1.5 rounded-lg hover:bg-gray-3 text-gray-9 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* FAB TRIGGER BUTTON */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl font-black text-sm shadow-xl transition-all duration-200 border ${
          open
            ? "bg-primary text-white border-primary shadow-primary/30"
            : "bg-gray-1 text-gray-12 border-gray-4 hover:border-primary hover:shadow-primary/10"
        }`}
      >
        <Calendar size={16} className={open ? "text-white" : "text-primary"} />
        <span className="uppercase tracking-wider text-xs">
          {fmt(parsedDate)}
        </span>
        {!isCurrentMonth && (
          <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-black uppercase tracking-wide">
            Past
          </span>
        )}
      </button>
    </div>
  );

  return createPortal(fab, document.body);
}
