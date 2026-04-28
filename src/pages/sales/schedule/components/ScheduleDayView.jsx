import { Plus, Settings, ChevronDown } from "lucide-react";
import Dropdown from "../../../../components/ui/Dropdown";
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
          <Dropdown
            placement="bottom-end"
            trigger={({ isOpen }) => (
              <button
                className={`flex items-center gap-2 bg-card hover:bg-muted border ${
                  isOpen ? "border-mauve-6 shadow-md" : "border-border shadow-sm"
                } text-foreground text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl outline-none transition-all`}
              >
                Advanced Actions...
                <Settings size={14} className="text-muted-foreground" />
              </button>
            )}
          >
            {({ close }) => (
              <div className="flex flex-col p-1.5 w-[220px]">
                <button
                  onClick={() => {
                    handleActionSelect("clear_am", currentDateObj.dateStr);
                    close();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-foreground hover:bg-mauve-4 rounded-lg transition-colors"
                >
                  Clear AM Block
                </button>
                <button
                  onClick={() => {
                    handleActionSelect("clear_pm", currentDateObj.dateStr);
                    close();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-foreground hover:bg-mauve-4 rounded-lg transition-colors"
                >
                  Clear PM Block
                </button>
                <button
                  onClick={() => {
                    handleActionSelect("clear_day", currentDateObj.dateStr);
                    close();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  Wipe Entire Day
                </button>
                
                <div className="h-px bg-border my-1.5 mx-1" />
                
                <button
                  onClick={() => {
                    handleActionSelect("manage_templates", currentDateObj.dateStr);
                    close();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-foreground hover:bg-mauve-4 rounded-lg transition-colors"
                >
                  Manage Templates
                </button>

                <div className="h-px bg-border my-1.5 mx-1" />
                
                {weekDates
                  .filter((d) => d.dateStr !== currentDateObj.dateStr)
                  .map((d) => (
                    <button
                      key={`clone_${d.dateStr}`}
                      onClick={() => {
                        handleActionSelect(`clone_${d.dateStr}`, currentDateObj.dateStr);
                        close();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-foreground hover:bg-mauve-4 rounded-lg transition-colors"
                    >
                      Clone Day To {d.label}
                    </button>
                  ))}
              </div>
            )}
          </Dropdown>
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
            length: slotCounts[`${currentDateObj.dateStr}-AM`] || 0,
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
                  handleUseSmartSuggestion(
                    currentDateObj.dateStr,
                    "AM",
                    slotIdx,
                  )
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
                canDelete={slotIdx >= 0}
                disabled={isLocked}
                slotNum={slotIdx + 1}
                availableCategories={categories}
                onClearSlot={() =>
                  handleClearSlot(currentDateObj.dateStr, "AM", slotIdx)
                }
                onDuplicateSlot={() =>
                  handleDuplicateSlot(currentDateObj.dateStr, "AM", slotIdx)
                }
                onSaveCustomTemplate={() => openSaveModal(currentData)}
              />
            );
          })}
          {!isLocked && (
            <button
              onClick={() => handleAddSlot(currentDateObj.dateStr, "AM")}
              className="w-full py-2.5 border-2 border-dashed border-border hover:border-mauve-6 rounded-xl text-xs font-bold text-muted-foreground hover:text-mauve-12 transition-all flex items-center justify-center gap-2 hover:bg-violet-2/50"
            >
              <Plus size={14} /> Add AM Activity
            </button>
          )}
        </div>

        {/* PM COLUMN */}
        <div className="space-y-4">
          <div className="bg-muted/50 border border-border rounded-t-xl p-4 border-b-0">
            <h3 className="font-black text-foreground tracking-[0.2em] uppercase text-center text-xs">
              AFTERNOON (PM)
            </h3>
          </div>
          {Array.from({
            length: slotCounts[`${currentDateObj.dateStr}-PM`] || 0,
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
                  handleUseSmartSuggestion(
                    currentDateObj.dateStr,
                    "PM",
                    slotIdx,
                  )
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
                canDelete={slotIdx >= 0}
                disabled={isLocked}
                slotNum={slotIdx + 1}
                availableCategories={categories}
                onClearSlot={() =>
                  handleClearSlot(currentDateObj.dateStr, "PM", slotIdx)
                }
                onDuplicateSlot={() =>
                  handleDuplicateSlot(currentDateObj.dateStr, "PM", slotIdx)
                }
                onSaveCustomTemplate={() => openSaveModal(currentData)}
              />
            );
          })}
          {!isLocked && (
            <button
              onClick={() => handleAddSlot(currentDateObj.dateStr, "PM")}
              className="w-full py-2.5 border-2 border-dashed border-border hover:border-mauve-6 rounded-xl text-xs font-bold text-muted-foreground hover:text-mauve-12 transition-all flex items-center justify-center gap-2 hover:bg-violet-2/50"
            >
              <Plus size={14} /> Add PM Activity
            </button>
          )}
        </div>
      </div>
    </>
  );
}
