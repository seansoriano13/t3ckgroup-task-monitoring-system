import TabGroup from "../../../../components/ui/TabGroup";
import Dot from "../../../../components/ui/Dot";

export function ScheduleTabs({
  weekDates,
  dayProgress,
  activeTab,
  setActiveTab,
  activitiesData,
  isGreen,
}) {
  const tabs = weekDates.map((d, idx) => {
    const hasTasks = activitiesData.some(
      (a) =>
        a.scheduled_date === d.dateStr &&
        (a.activity_type !== "None" ||
          (a.account_name && a.account_name.trim() !== "")),
    );
    const dayStats = dayProgress?.find((p) => p.dateStr === d.dateStr);

    return {
      value: idx,
      label: (
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            {d.label}
            {hasTasks && (
              <Dot
                size="w-2 h-2"
                color={isGreen ? "bg-green-9" : "bg-yellow-9"}
                className="shadow-sm"
              />
            )}
          </div>
          <span className="text-[10px] font-bold text-muted-foreground block mt-0.5">
            {d.dateStr}
          </span>
          {dayStats && (
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block mt-0.5">
              AM {dayStats.amCount}/5 · PM {dayStats.pmCount}/5
            </span>
          )}
        </div>
      ),
    };
  });

  return (
    <TabGroup
      tabs={tabs}
      activeTab={activeTab}
      onChange={setActiveTab}
      variant="pill"
      fullWidth
    />
  );
}
