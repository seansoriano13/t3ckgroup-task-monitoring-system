/**
 * GradeSelector — Extracted from ManagerEvaluation.
 * Renders the 1-5 grade buttons for head task evaluation.
 *
 * Used in two modes:
 *   1. Interactive (canEvaluate=true) — head selects a grade before approving
 *   2. Read-only (finalized=true)     — shows the final grade after approval
 */
export default function GradeSelector({
  grade,
  onSelect,
  canEvaluate = false,
  finalized = false,
  compact = false,
}) {
  const activeColorMap = {
    1: "bg-destructive text-primary-foreground border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]",
    2: "bg-orange-500 text-primary-foreground border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]",
    3: "bg-amber-500 text-primary-foreground border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]",
    4: "bg-lime-500 text-primary-foreground border-lime-500 shadow-[0_0_15px_rgba(132,204,22,0.3)]",
    5: "bg-green-9 text-primary-foreground border-green-9 shadow-[0_0_15px_rgba(16,185,129,0.3)]",
  };

  return (
    <div className={`flex ${compact ? "gap-1" : "gap-2"}`}>
      {[1, 2, 3, 4, 5].map((num) => {
        const isSelected = grade === num;

        if (finalized) {
          return (
            <div
              key={num}
              className={`flex items-center justify-center rounded-lg font-black border transition-all ${
                compact ? "w-6 h-7 text-[10px]" : "flex-1 py-3 text-sm"
              } ${
                isSelected
                  ? `${activeColorMap[num]} scale-105 z-10`
                  : "bg-muted/10 text-muted-foreground/30 border-transparent"
              }`}
            >
              {num}
            </div>
          );
        }

        return (
          <button
            key={num}
            type="button"
            disabled={!canEvaluate}
            onClick={() => onSelect?.(num)}
            className={`flex-1 py-3 rounded-xl font-bold transition-all border ${
              !canEvaluate ? "opacity-50 cursor-not-allowed" : ""
            } ${
              isSelected
                ? `${activeColorMap[num]} shadow-xl scale-[1.05]`
                : `bg-card text-muted-foreground border-border ${
                    canEvaluate
                      ? "hover:border-primary/30 hover:bg-muted/50"
                      : ""
                  }`
            }`}
          >
            {num}
          </button>
        );
      })}
    </div>
  );
}
