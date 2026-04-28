import Dot from "../../../../components/ui/Dot";

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
                ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                : allTasksDone
                  ? "bg-green-2 border-green-6 text-green-11 hover:bg-green-3 shadow-sm"
                  : "bg-card border-border text-muted-foreground hover:border-mauve-5 hover:bg-muted/50"
            }`}
          >
            <span
              className={`text-[10px] items-center justify-center flex font-black uppercase tracking-widest ${
                selectedDate === wd.dateStr ? "text-primary-foreground/80" : allTasksDone ? "text-green-10/80" : "text-muted-foreground"
              }`}
            >
              {wd.label}{" "}
              {hasTasks && !allTasksDone && (
                <Dot
                  size="w-1.5 h-1.5"
                  color={isGreen ? "bg-green-9" : "bg-[color:var(--yellow-9)] shadow-yellow-500/50"}
                  className="inline-block mb-1 ml-1 shadow-sm"
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
