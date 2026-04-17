import { Check } from "lucide-react";

export default function LogTaskFooter({
  createMore,
  setCreateMore,
  isSubmitting,
  onClose,
}) {
  return (
    <div className="px-5 py-4 border-t border-gray-3/40 bg-gray-2/30 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={createMore}
              onChange={(e) => setCreateMore(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-8 h-4.5 rounded-full transition-colors ${createMore ? "bg-primary" : "bg-gray-4 group-hover:bg-gray-5"}`}
            />
            <div
              className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full transition-transform ${createMore ? "translate-x-3.5" : "translate-x-0"}`}
            />
          </div>
          <span className="text-[11px] font-semibold text-gray-8 group-hover:text-gray-12 transition-colors">
            Create more
          </span>
        </label>

        <div className="hidden sm:flex items-center gap-3 text-[10px] text-gray-6 font-medium">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-gray-3 border border-gray-4 rounded text-gray-9 font-sans text-[9px]">
              Ctrl
            </kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-gray-3 border border-gray-4 rounded text-gray-9 font-sans text-[9px]">
              Enter
            </kbd>
            <span className="ml-0.5">to save</span>
          </div>
          <div className="w-[3px] h-[3px] rounded-full bg-gray-4" />
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-3 border border-gray-4 rounded text-gray-9 font-sans text-[9px]">
              Esc
            </kbd>
            <span>to cancel</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-[13px] font-bold text-gray-10 hover:text-gray-12 hover:bg-gray-3 rounded-xl transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="relative px-6 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-[13px] font-bold rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2 hover:translate-y-[-1px] active:translate-y-0"
        >
          {isSubmitting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Logging…</span>
            </>
          ) : (
            <>
              <Check size={16} strokeWidth={3} />
              <span>Log Task</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
