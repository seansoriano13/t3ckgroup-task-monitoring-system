export function ScheduleTabs({
  weekDates,
  dayProgress,
  activeTab,
  setActiveTab,
  activitiesData,
  isGreen,
}) {
  return (
    <div className="flex gap-1 border-b border-border pb-0 overflow-x-auto">
      {weekDates.map((d, idx) => {
        const hasTasks = activitiesData.some(
          (a) =>
            a.scheduled_date === d.dateStr &&
            (a.activity_type !== "None" ||
              (a.account_name && a.account_name.trim() !== "")),
        );
        const dayStats = dayProgress?.find((p) => p.dateStr === d.dateStr);
        return (
          <button
            key={d.dateStr}
            onClick={() => setActiveTab(idx)}
            className={`px-5 py-3 font-bold text-sm tracking-wide border-b-2 transition-all whitespace-nowrap rounded-t-lg ${
              activeTab === idx
                ? "border-indigo-600 text-indigo-600 bg-indigo-50/50"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {d.label}{" "}
            {hasTasks && (
              <span
                className={`w-2 h-2 rounded-full ${isGreen ? "bg-green-500" : "bg-yellow-500"} inline-block ml-1 mb-0.5 shadow-sm`}
              ></span>
            )}
              <span className={`text-[10px] font-bold text-muted-foreground block mt-0.5`}>{d.dateStr}</span>
            {dayStats && (
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mt-0.5">
                AM {dayStats.amCount}/5 · PM {dayStats.pmCount}/5
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
