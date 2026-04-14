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
    1: "bg-red-500 text-gray-1 border-red-500 shadow-red-500/40",
    2: "bg-orange-500 text-gray-1 border-orange-500 shadow-orange-500/40",
    3: "bg-yellow-500 text-gray-1 border-yellow-500 shadow-yellow-500/40",
    4: "bg-lime-500 text-gray-1 border-lime-500 shadow-lime-500/40",
    5: "bg-green-500 text-gray-1 border-green-500 shadow-green-500/40",
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
              className={`flex-1 py-2.5 rounded-lg font-black border text-sm text-center transition-all ${
                isSelected
                  ? `${activeColorMap[num]} shadow-md scale-[1.05]`
                  : "bg-gray-2 text-gray-10 border-gray-4 opacity-40"
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
            className={`flex-1 py-2.5 rounded-lg font-bold transition-all border ${
              !canEvaluate ? "opacity-50 cursor-not-allowed" : ""
            } ${
              isSelected
                ? `${activeColorMap[num]} ${hoverColorMap[num]} shadow-lg scale-[1.02]`
                : `bg-gray-2 text-gray-10 border-gray-4 ${
                    canEvaluate
                      ? "hover:border-gray-6 hover:bg-gray-3"
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
