import { Plus, Settings } from "lucide-react";
import { ScheduleActivityRow } from "./ScheduleActivityRow";

export function ScheduleDayView({
  currentDateObj,
  weekDates,
  slotCounts,
  categories,
  compactMode,
  scheduleTemplates,
  isLocked,
  getSlotData,
  updateSlotData,
  handleDeleteSlot,
  handleUseSmartSuggestion,
  handleApplyTemplate,
  handleAddSlot,
  handleActionSelect,
}) {
  return (
    <>
      <div className="flex justify-between items-center mt-6 mb-2 border-b border-gray-4 pb-2">
        <h2 className="text-xl font-black text-gray-12">
          {currentDateObj.label} Schedule
        </h2>
        {!isLocked && (
          <div className="relative">
            <select
              className="appearance-none bg-gray-2 hover:bg-gray-3 border border-gray-4 text-gray-12 text-xs font-bold uppercase tracking-wider px-3 py-2 pr-8 rounded-lg outline-none cursor-pointer transition-colors shadow-sm"
              value=""
              onChange={(e) =>
                handleActionSelect(e.target.value, currentDateObj.dateStr)
              }
            >
              <option value="" disabled>
                Advanced Actions...
              </option>
              <option value="clear_am">Clear AM Block</option>
              <option value="clear_pm">Clear PM Block</option>
              <option value="clear_day">Wipe Entire Day</option>
              <option disabled>──────────</option>
              {weekDates
                .filter((d) => d.dateStr !== currentDateObj.dateStr)
                .map((d) => (
                  <option
                    key={`clone_${d.dateStr}`}
                    value={`clone_${d.dateStr}`}
                  >
                    Clone Day To {d.label}
                  </option>
                ))}
            </select>
            <Settings
              size={14}
              className="absolute right-2.5 top-2.5 text-gray-8 pointer-events-none"
            />
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* AM COLUMN */}
        <div className="space-y-4">
          <div className="bg-gray-2 border border-gray-4 rounded-t-xl p-3 border-b-0">
            <h3 className="font-black text-gray-12 tracking-widest uppercase text-center">
              MORNING (AM)
            </h3>
          </div>
          {Array.from({
            length: slotCounts[`${currentDateObj.dateStr}-AM`] || 5,
          }).map((_, slotIdx) => {
            const currentData = getSlotData(
              currentDateObj.dateStr,
              "AM",
              slotIdx,
            );

            return (
              <ScheduleActivityRow
                key={`AM-${slotIdx}`}
                data={currentData}
                onChange={(field, val) =>
                  updateSlotData(
                    currentDateObj.dateStr,
                    "AM",
                    slotIdx,
                    field,
                    val,
                  )
                }
                onDelete={() =>
                  handleDeleteSlot(currentDateObj.dateStr, "AM", slotIdx)
                }
                onUseSmartSuggestion={() =>
                  handleUseSmartSuggestion(currentDateObj.dateStr, "AM", slotIdx)
                }
                onApplyTemplate={(templateId) =>
                  handleApplyTemplate(
                    currentDateObj.dateStr,
                    "AM",
                    slotIdx,
                    templateId,
                  )
                }
                compactMode={compactMode}
                scheduleTemplates={scheduleTemplates}
                canDelete={slotIdx >= 5}
                disabled={isLocked}
                slotNum={slotIdx + 1}
                availableCategories={categories}
              />
            );
          })}
          {!isLocked &&
            (slotCounts[`${currentDateObj.dateStr}-AM`] || 5) < 8 && (
              <button
                onClick={() => handleAddSlot(currentDateObj.dateStr, "AM")}
                className="w-full py-3 mt-2 border-2 border-dashed border-gray-4 hover:border-primary hover:text-primary hover:bg-primary/5 text-gray-9 font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Add Extra Schedule Item
              </button>
            )}
        </div>

        {/* PM COLUMN */}
        <div className="space-y-4">
          <div className="bg-gray-2 border border-gray-4 rounded-t-xl p-3 border-b-0">
            <h3 className="font-black text-gray-12 tracking-widest uppercase text-center">
              AFTERNOON (PM)
            </h3>
          </div>
          {Array.from({
            length: slotCounts[`${currentDateObj.dateStr}-PM`] || 5,
          }).map((_, slotIdx) => {
            const currentData = getSlotData(
              currentDateObj.dateStr,
              "PM",
              slotIdx,
            );

            return (
              <ScheduleActivityRow
                key={`PM-${slotIdx}`}
                data={currentData}
                onChange={(field, val) =>
                  updateSlotData(
                    currentDateObj.dateStr,
                    "PM",
                    slotIdx,
                    field,
                    val,
                  )
                }
                onDelete={() =>
                  handleDeleteSlot(currentDateObj.dateStr, "PM", slotIdx)
                }
                onUseSmartSuggestion={() =>
                  handleUseSmartSuggestion(currentDateObj.dateStr, "PM", slotIdx)
                }
                onApplyTemplate={(templateId) =>
                  handleApplyTemplate(
                    currentDateObj.dateStr,
                    "PM",
                    slotIdx,
                    templateId,
                  )
                }
                compactMode={compactMode}
                scheduleTemplates={scheduleTemplates}
                canDelete={slotIdx >= 5}
                disabled={isLocked}
                slotNum={slotIdx + 1}
                availableCategories={categories}
              />
            );
          })}
          {!isLocked &&
            (slotCounts[`${currentDateObj.dateStr}-PM`] || 5) < 8 && (
              <button
                onClick={() => handleAddSlot(currentDateObj.dateStr, "PM")}
                className="w-full py-3 mt-2 border-2 border-dashed border-gray-4 hover:border-primary hover:text-primary hover:bg-primary/5 text-gray-9 font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Add Extra Schedule Item
              </button>
            )}
        </div>
      </div>
    </>
  );
}
