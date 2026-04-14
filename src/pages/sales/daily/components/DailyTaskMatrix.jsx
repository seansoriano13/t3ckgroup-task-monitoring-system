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
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
      {/* AM COLUMN */}
      <div className="bg-gray-1 border border-gray-4 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-gray-2 p-3 border-b border-gray-4">
          <h2 className="font-black text-gray-12 uppercase tracking-widest text-sm">
            AM Block
          </h2>
        </div>
        <div className="divide-y divide-gray-3">
          {plannedAM.length === 0 && unplannedAM.length === 0 && (
            <p className="p-6 text-center text-sm text-gray-8 italic">
              No morning tasks
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
            />
          ))}
        </div>
        {!isLockedUI && (
          <div className="p-3 bg-gray-2 border-t border-gray-4">
            <AddUnplannedForm
              timeOfDay="AM"
              onSave={handleAddUnplanned}
              categories={categories}
            />
          </div>
        )}
      </div>

      {/* PM COLUMN */}
      <div className="bg-gray-1 border border-gray-4 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-gray-2 p-3 border-b border-gray-4">
          <h2 className="font-black text-gray-12 uppercase tracking-widest text-sm">
            PM Block
          </h2>
        </div>
        <div className="divide-y divide-gray-3">
          {plannedPM.length === 0 && unplannedPM.length === 0 && (
            <p className="p-6 text-center text-sm text-gray-8 italic">
              No afternoon tasks
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
            />
          ))}
        </div>
        {!isLockedUI && (
          <div className="p-3 bg-gray-2 border-t border-gray-4">
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
