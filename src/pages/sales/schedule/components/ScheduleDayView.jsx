import { Plus, Settings } from "lucide-react";
import { ScheduleActivityRow } from "./ScheduleActivityRow";

export function ScheduleDayView({
  currentDateObj,
  weekDates,
  slotCounts,
  categories,
  compactMode,
  scheduleTemplates,
  customTemplates,
  isLocked,
  getSlotData,
  updateSlotData,
  handleDeleteSlot,
  handleClearSlot,
  handleDuplicateSlot,
  handleUseSmartSuggestion,
  handleApplyTemplate,
  // eslint-disable-next-line no-unused-vars
  handleAddSlot,
  handleActionSelect,
  openSaveModal,
}) {
  return (
    <>
      <div className="flex justify-between items-center mt-6 mb-3 border-b border-border pb-3">
        <h2 className="text-xl font-black text-foreground tracking-tight">
          {currentDateObj.label} Schedule
        </h2>
        {!isLocked && (
          <div className="relative">
            <select
              className="appearance-none bg-card hover:bg-muted border border-border text-foreground text-[10px] font-black uppercase tracking-widest px-3 py-2 pr-8 rounded-xl outline-none cursor-pointer transition-all shadow-sm"
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
              <option value="manage_templates">Manage Templates</option>
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
            <Settings size={14} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* AM COLUMN */}
        <div className="space-y-4">
          <div className="bg-muted/50 border border-border rounded-t-xl p-4 border-b-0">
            <h3 className="font-black text-foreground tracking-[0.2em] uppercase text-center text-xs">
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
                customTemplates={customTemplates}
                canDelete={slotIdx >= 5}
                disabled={isLocked}
                slotNum={slotIdx + 1}
                availableCategories={categories}
                onClearSlot={() => handleClearSlot(currentDateObj.dateStr, "AM", slotIdx)}
                onDuplicateSlot={() => handleDuplicateSlot(currentDateObj.dateStr, "AM", slotIdx)}
                onSaveCustomTemplate={() => openSaveModal(currentData)}
              />
            );
          })}
        </div>

        {/* PM COLUMN */}
        <div className="space-y-4">
          <div className="bg-muted/50 border border-border rounded-t-xl p-4 border-b-0">
            <h3 className="font-black text-foreground tracking-[0.2em] uppercase text-center text-xs">
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
                customTemplates={customTemplates}
                canDelete={slotIdx >= 5}
                disabled={isLocked}
                slotNum={slotIdx + 1}
                availableCategories={categories}
                onClearSlot={() => handleClearSlot(currentDateObj.dateStr, "PM", slotIdx)}
                onDuplicateSlot={() => handleDuplicateSlot(currentDateObj.dateStr, "PM", slotIdx)}
                onSaveCustomTemplate={() => openSaveModal(currentData)}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}
