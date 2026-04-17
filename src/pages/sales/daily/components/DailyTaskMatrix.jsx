import { ChecklistItem } from "./ChecklistItem";
import { AddUnplannedForm } from "./AddUnplannedForm";

export function DailyTaskMatrix({
  plannedAM,
  plannedPM,
  unplannedAM,
  unplannedPM,
  appSettings,
  handleToggleDone,
  isLockedUI,
  isAdminView,
  highlightActivityId,
  handleAddUnplanned,
  categories,
  onView,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
      {/* AM COLUMN */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-muted/50 px-4 py-3.5 border-b border-border flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-200" />
          <h2 className="font-black text-foreground uppercase tracking-[0.2em] text-xs">
            Morning Block
          </h2>
        </div>
        <div className="divide-y divide-border">
          {plannedAM.length === 0 && unplannedAM.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground italic">
              No morning tasks scheduled.
            </p>
          )}
          {plannedAM.map((act) => (
            <ChecklistItem
              key={act.id}
              data={act}
              settings={appSettings}
              onToggle={handleToggleDone}
              disabledUI={isLockedUI}
              isAdminView={isAdminView}
              highlightId={highlightActivityId}
              onView={onView}
            />
          ))}
          {unplannedAM.map((act) => (
            <ChecklistItem
              key={act.id}
              data={act}
              settings={appSettings}
              onToggle={handleToggleDone}
              disabledUI={isLockedUI}
              isAdminView={isAdminView}
              highlightId={highlightActivityId}
              onView={onView}
            />
          ))}
        </div>
        {!isLockedUI && (
          <div className="px-4 py-3.5 bg-muted/30 border-t border-border">
            <AddUnplannedForm
              timeOfDay="AM"
              onSave={handleAddUnplanned}
              categories={categories}
            />
          </div>
        )}
      </div>

      {/* PM COLUMN */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-muted/50 px-4 py-3.5 border-b border-border flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-sm shadow-indigo-200" />
          <h2 className="font-black text-foreground uppercase tracking-[0.2em] text-xs">
            Afternoon Block
          </h2>
        </div>
        <div className="divide-y divide-border">
          {plannedPM.length === 0 && unplannedPM.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground italic">
              No afternoon tasks scheduled.
            </p>
          )}
          {plannedPM.map((act) => (
            <ChecklistItem
              key={act.id}
              data={act}
              settings={appSettings}
              onToggle={handleToggleDone}
              disabledUI={isLockedUI}
              isAdminView={isAdminView}
              highlightId={highlightActivityId}
              onView={onView}
            />
          ))}
          {unplannedPM.map((act) => (
            <ChecklistItem
              key={act.id}
              data={act}
              settings={appSettings}
              onToggle={handleToggleDone}
              disabledUI={isLockedUI}
              isAdminView={isAdminView}
              highlightId={highlightActivityId}
              onView={onView}
            />
          ))}
        </div>
        {!isLockedUI && (
          <div className="px-4 py-3.5 bg-muted/30 border-t border-border">
            <AddUnplannedForm
              timeOfDay="PM"
              onSave={handleAddUnplanned}
              categories={categories}
            />
          </div>
        )}
      </div>
    </div>
  );
}
