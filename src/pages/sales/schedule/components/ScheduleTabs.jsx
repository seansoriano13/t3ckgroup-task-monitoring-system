export function ScheduleTabs({
  weekDates,
  dayProgress,
  activeTab,
  setActiveTab,
  activitiesData,
  isGreen,
}) {
  return (
    <div className="flex gap-2 border-b border-gray-4 pb-0 overflow-x-auto">
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
            className={`px-6 py-3 font-bold text-sm tracking-wide border-b-2 transition-colors whitespace-nowrap ${activeTab === idx ? "border-gray-a3  bg-gray-a3" : "border-transparent text-gray-9 hover:text-gray-12 hover:bg-gray-2"}`}
          >
            {d.label}{" "}
            {hasTasks && (
              <span
                className={`w-2 h-2 rounded-full ${isGreen ? "bg-green-500" : "bg-yellow-500"} inline-block ml-1 mb-0.5 shadow-sm`}
              ></span>
            )}
            <span className="text-xs font-normal text-gray-8 block">
              {d.dateStr}
            </span>
            {dayStats && (
              <span className="text-[10px] font-bold text-gray-8 block">
                {dayStats.amCount + dayStats.pmCount} Task{dayStats.amCount + dayStats.pmCount === 1 ? '' : 's'} (AM: {dayStats.amCount} | PM: {dayStats.pmCount})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
