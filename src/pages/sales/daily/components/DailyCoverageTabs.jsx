import TabGroup from "../../../../components/ui/TabGroup";
import Dot from "../../../../components/ui/Dot";

export function DailyCoverageTabs({
  weekDates,
  selectedDate,
  setSelectedDate,
  weeklyActivities,
  isGreen,
}) {
  const tabs = weekDates.map((wd) => {
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

    return {
      value: wd.dateStr,
      variant: allTasksDone ? "success" : undefined,
      label: (
        <div className="flex flex-col items-center justify-center min-w-[48px]">
          <div className="text-[10px] items-center justify-center flex font-black uppercase tracking-widest opacity-80">
            {wd.label}{" "}
            {hasTasks && !allTasksDone && (
              <Dot
                size="w-1.5 h-1.5"
                color={isGreen ? "bg-green-9" : "bg-yellow-9 shadow-[0_0_8px_rgba(234,179,8,0.5)]"}
                className="ml-1"
              />
            )}
          </div>
          <span className="text-xl font-black mt-0.5">
            {wd.dateStr.split("-")[2]}
          </span>
        </div>
      ),
    };
  });

  return (
    <div className="pb-2">
      <TabGroup
        tabs={tabs}
        activeTab={selectedDate}
        onChange={setSelectedDate}
        variant="primary"
        size="md"
        fullWidth
      />
    </div>
  );
}
