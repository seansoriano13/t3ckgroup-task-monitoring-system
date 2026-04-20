import {
  FileText,
  LayoutList,
  DollarSign,
  Table2,
  Columns,
} from "lucide-react";

/**
 * Page header with tab toggles (Activities / Revenue),
 * view-mode switch (Table / Board), and record count.
 */
export default function RecordsHeader({
  activeTab,
  setActiveTab,
  viewMode,
  setViewMode,
  recordCount,
}) {
  return (
    <div className="border-b border-border pb-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">
            Sales Records
          </h1>
          <p className="text-muted-foreground mt-1 font-medium text-sm">
            Comprehensive filtering view for Sales Activities and Logged Revenue.
          </p>
        </div>
        <div className="text-right flex items-center gap-3 flex-wrap justify-end">
          {activeTab === "ACTIVITIES" && (
            <div className="flex bg-card border border-border rounded-xl p-1 shadow-sm">
              <button
                onClick={() => setViewMode("TABLE")}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 ${viewMode === "TABLE" ? "bg-foreground text-background shadow" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Table2 size={14} /> Table
              </button>
              <button
                onClick={() => setViewMode("BOARD")}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 ${viewMode === "BOARD" ? "bg-foreground text-background shadow" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Columns size={14} /> Board
              </button>
            </div>
          )}
          <div className="flex bg-card border border-border rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setActiveTab("ACTIVITIES")}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${activeTab === "ACTIVITIES" ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutList size={14} /> Activities
            </button>
            <button
              onClick={() => setActiveTab("REVENUE")}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${activeTab === "REVENUE" ? "bg-emerald-600 text-white shadow-md shadow-emerald-100" : "text-muted-foreground hover:text-foreground"}`}
            >
              <DollarSign size={14} /> Revenue
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] font-black text-muted-foreground uppercase tracking-widest w-full justify-end mt-1">
        <FileText size={14} /> {recordCount} Records Found
      </div>
    </div>
  );
}
