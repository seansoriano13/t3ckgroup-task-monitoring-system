export function DailyCoverageTabs({
  weekDates,
  selectedDate,
  setSelectedDate,
  weeklyActivities,
  isGreen,
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {weekDates.map((wd) => {
        const todaysTasks = weeklyActivities.filter(
          (a) =>
            a.scheduled_date === wd.dateStr &&
            !a.is_deleted &&
            (a.activity_type !== "None" ||
              (a.account_name && a.account_name.trim() !== "")),
        );
        const hasTasks = todaysTasks.length > 0;
        const allTasksDone =
          hasTasks &&
          todaysTasks.every(
            (a) =>
              a.status === "DONE" ||
              a.status === "APPROVED" ||
              a.status === "PENDING",
          );

        return (
          <button
            key={wd.dateStr}
            onClick={() => setSelectedDate(wd.dateStr)}
            className={`flex flex-col items-center justify-center min-w-[64px] h-16 rounded-2xl border transition-all ${
              selectedDate === wd.dateStr
                ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105"
                : allTasksDone
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 shadow-sm"
                  : "bg-card border-border text-muted-foreground hover:border-indigo-200 hover:bg-muted/50"
            }`}
          >
            <span
              className={`text-[10px] items-center justify-center flex font-black uppercase tracking-widest ${
                selectedDate === wd.dateStr ? "text-white/80" : allTasksDone ? "text-emerald-600/80" : "text-slate-400"
              }`}
            >
              {wd.label}{" "}
              {hasTasks && !allTasksDone && (
                <div
                  className={`w-1.5 h-1.5 rounded-full ${isGreen ? "bg-green-500" : "bg-yellow-500 shadow-yellow-500/50"} inline-block mb-1 ml-1 shadow-sm`}
                />
              )}
            </span>
            <span className="text-xl font-black">
              {wd.dateStr.split("-")[2]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
