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
              a.status === "PENDING" ||
              a.status === "PENDING_APPROVAL",
          );

        return (
          <button
            key={wd.dateStr}
            onClick={() => setSelectedDate(wd.dateStr)}
            className={`flex flex-col items-center justify-center min-w-[64px] h-16 rounded-2xl border transition-all ${
              selectedDate === wd.dateStr
                ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105"
                : allTasksDone
                  ? "bg-green-500/10 border-green-500/30 text-green-700 hover:bg-green-500/20 shadow-sm"
                  : "bg-gray-1 border-gray-4 text-gray-10 hover:border-gray-6"
            }`}
          >
            <span
              className={`text-[10px] items-center justify-center flex font-bold uppercase tracking-widest ${selectedDate === wd.dateStr ? "text-white/80" : allTasksDone ? "text-green-600/80" : "text-gray-8"}`}
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
