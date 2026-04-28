import { Calendar, Download, TrendingUp, TrendingDown, Trophy, Package } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export function AnalyticsView({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  activePreset,
  handleAnalyticPreset,
  printMonthlyReport,
  anAggs,
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      {/* DATE FILTERS */}
      <div className="bg-mauve-1 border border-mauve-4 rounded-2xl p-6 shadow-sm print:hidden">
        <h2 className="text-xs font-black uppercase tracking-widest text-mauve-10 mb-4 flex items-center gap-2">
          <Calendar size={14} /> Date Range
        </h2>

        <div className="flex flex-col lg:flex-row gap-6 lg:items-end justify-between">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-[10px] font-bold text-mauve-8 uppercase tracking-wider block mb-1">
                Start Date
              </label>
              <DatePicker
                selected={startDate ? new Date(startDate) : null}
                onChange={(date) => {
                  if (!date) return;
                  const y = date.getFullYear();
                  const m = String(date.getMonth() + 1).padStart(2, "0");
                  const d = String(date.getDate()).padStart(2, "0");
                  setStartDate(`${y}-${m}-${d}`);
                }}
                dateFormat="MMM d, yyyy"
                portalId="root"
                className="bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm text-foreground font-bold outline-none focus:border-primary/50 w-[140px] transition-all cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-mauve-8 uppercase tracking-wider block mb-1">
                End Date
              </label>
              <DatePicker
                selected={endDate ? new Date(endDate) : null}
                onChange={(date) => {
                  if (!date) return;
                  const y = date.getFullYear();
                  const m = String(date.getMonth() + 1).padStart(2, "0");
                  const d = String(date.getDate()).padStart(2, "0");
                  setEndDate(`${y}-${m}-${d}`);
                }}
                dateFormat="MMM d, yyyy"
                portalId="root"
                className="bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm text-foreground font-bold outline-none focus:border-primary/50 w-[140px] transition-all cursor-pointer"
              />
            </div>
          </div>

          <div className="flex gap-1 bg-mauve-2 p-1 rounded-xl border border-mauve-4 max-w-full overflow-x-auto">
            {["TODAY", "THIS_WEEK", "THIS_MONTH", "THIS_YEAR"].map((preset) => (
              <button
                key={preset}
                onClick={() => handleAnalyticPreset(preset)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap rounded-lg transition-colors ${
                  activePreset === preset
                    ? "bg-mauve-4 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-mauve-3"
                }`}
              >
                {preset.replace("_", " ")}
              </button>
            ))}
          </div>

          <button
            onClick={printMonthlyReport}
            className="bg-red-9 hover:bg-red-10 text-primary-foreground font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm shadow-blue-500/20 whitespace-nowrap"
          >
            <Download size={16} /> Export View
          </button>
        </div>
      </div>

      {/* ANALYTICS AGGREGATES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-mauve-4 p-8 rounded-2xl flex flex-col justify-center">
          <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-2">
            <TrendingUp className="text-green-10" size={16} /> Period Closed Revenue
          </h3>
          <p className="text-5xl font-black text-foreground">
            ?{anAggs.won.toLocaleString()}
          </p>
        </div>
        <div className="border border-mauve-4 p-8 rounded-2xl flex flex-col justify-center">
          <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-2">
            <TrendingDown size={14} className="text-destructive" /> Period Lost Revenue
          </h3>
          <p className="text-4xl font-black text-mauve-11">
            ?{anAggs.lost.toLocaleString()}
          </p>
          <span className="text-xs text-mauve-8 mt-2 block italic">
            Lost opportunities inside query boundary.
          </span>
        </div>
      </div>

      {/* DETAILS GRIDS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* By REP */}
        <div className="bg-mauve-1 border border-mauve-4 rounded-2xl p-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2 border-b border-mauve-4 pb-4 mb-4">
            <Trophy size={16} /> Representative Payouts
          </h3>
          <div className="space-y-4">
            {anAggs.empArr.length === 0 ? (
              <p className="text-sm text-mauve-8 text-center py-4 italic">
                No revenue recorded in this exact date range.
              </p>
            ) : (
              anAggs.empArr.map((emp, i) => (
                <div
                  key={emp.name}
                  className="flex justify-between items-center bg-mauve-2 p-3 rounded-xl border border-mauve-3 hover:border-mauve-4 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                        i === 0 ? "bg-yellow-9/20 text-yellow-600" : "bg-mauve-4 text-mauve-10"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-black text-foreground">{emp.name}</p>
                      <p className="text-[10px] uppercase font-bold text-mauve-8 tracking-wider">
                        Lost: ?{emp.lost.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-black text-lg">
                      ?{emp.won.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* By PRODUCT */}
        <div className="bg-mauve-1 border border-mauve-4 rounded-2xl p-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2 border-b border-mauve-4 pb-4 mb-4">
            <Package size={16} /> Top Products
          </h3>
          <div className="space-y-4">
            {anAggs.prodArr.length === 0 ? (
              <p className="text-sm text-mauve-8 text-center py-4 italic">
                No products matched query.
              </p>
            ) : (
              anAggs.prodArr.map((prod) => (
                <div
                  key={prod.name}
                  className="bg-mauve-2 p-4 rounded-xl border border-mauve-3 transition-transform hover:-translate-y-0.5 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-2">
                    <p
                      className="text-sm font-bold text-foreground truncate block pr-2"
                      title={prod.name}
                    >
                      {prod.name}
                    </p>
                    <span className="text-[10px] bg-mauve-4 text-mauve-11 px-2 py-0.5 rounded font-black tracking-widest uppercase shrink-0">
                      Qty: {prod.count}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-mono font-black">
                    <span>Completed: ?{prod.won.toLocaleString()}</span>
                    <span>Lost: ?{prod.lost.toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
