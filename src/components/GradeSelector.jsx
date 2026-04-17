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
}) {
  const activeColorMap = {
    1: "bg-destructive text-white border-destructive shadow-[0_0_15px_rgba(239,68,68,0.3)]",
    2: "bg-orange-600 text-white border-orange-600 shadow-[0_0_15px_rgba(234,88,12,0.3)]",
    3: "bg-amber-500 text-white border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]",
    4: "bg-lime-600 text-white border-lime-600 shadow-[0_0_15px_rgba(101,163,13,0.3)]",
    5: "bg-emerald-600 text-white border-emerald-600 shadow-[0_0_15px_rgba(5,150,105,0.3)]",
  };

  const hoverColorMap = {
    1: "hover:bg-red-600",
    2: "hover:bg-orange-600",
    3: "hover:bg-yellow-600",
    4: "hover:bg-lime-600",
    5: "hover:bg-green-600",
  };

  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((num) => {
        const isSelected = grade === num;

        if (finalized) {
          return (
            <div
              key={num}
              className={`flex-1 py-3 rounded-xl font-extrabold border text-sm text-center transition-all ${
                isSelected
                  ? `${activeColorMap[num]} scale-[1.05]`
                  : "bg-muted/30 text-slate-400 border-border opacity-40"
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
