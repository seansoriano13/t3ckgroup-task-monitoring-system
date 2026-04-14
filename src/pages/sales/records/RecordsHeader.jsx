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
    <div className="border-b border-gray-4 pb-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-12 flex items-center gap-3 tracking-tight">
            Sales Records
          </h1>
          <p className="text-gray-9 mt-1 font-medium text-sm">
            Comprehensive filtering view for Sales Activities and Logged
            Revenue.
          </p>
        </div>
        <div className="text-right flex items-center gap-3 flex-wrap justify-end">
          {activeTab === "ACTIVITIES" && (
            <div className="flex bg-gray-2 border border-gray-4 rounded-xl p-1 shadow-inner">
              <button
                onClick={() => setViewMode("TABLE")}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 ${viewMode === "TABLE" ? "bg-gray-10 text-white shadow" : "text-gray-9 hover:text-gray-12"}`}
              >
                <Table2 size={14} /> Table
              </button>
              <button
                onClick={() => setViewMode("BOARD")}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 ${viewMode === "BOARD" ? "bg-gray-10 text-white shadow" : "text-gray-9 hover:text-gray-12"}`}
              >
                <Columns size={14} /> Board
              </button>
            </div>
          )}
          <div className="flex bg-gray-2 border border-gray-4 rounded-xl p-1 shadow-inner">
            <button
              onClick={() => setActiveTab("ACTIVITIES")}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${activeTab === "ACTIVITIES" ? "bg-primary text-white shadow" : "text-gray-9 hover:text-gray-12"}`}
            >
              <LayoutList size={14} /> Activities
            </button>
            <button
              onClick={() => setActiveTab("REVENUE")}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${activeTab === "REVENUE" ? "bg-green-600 text-white shadow" : "text-gray-9 hover:text-gray-12"}`}
            >
              <DollarSign size={14} /> Revenue
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm font-bold text-gray-11 w-full justify-end">
        <FileText size={16} /> {recordCount} Records Found
      </div>
    </div>
  );
}
