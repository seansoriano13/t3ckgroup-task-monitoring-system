import {
  FileText,
  LayoutList,
  DollarSign,
  Table2,
  Columns,
} from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader";
import TabGroup from "../../../components/ui/TabGroup";

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
    <PageHeader
      title="Sales Records"
      description="Comprehensive filtering view for Sales Activities and Logged Revenue."
    >
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-3">
          {/* View mode toggle — only shown for Activities */}
          {activeTab === "ACTIVITIES" && (
            <TabGroup
              variant="pill"
              tabs={[
                { value: "TABLE", label: "Table", icon: Table2 },
                { value: "BOARD", label: "Board", icon: Columns },
              ]}
              activeTab={viewMode}
              onChange={setViewMode}
              size="sm"
            />
          )}

          {/* Activities / Revenue main tabs */}
          <TabGroup
            variant="primary"
            tabs={[
              { value: "ACTIVITIES", label: "Activities", icon: LayoutList },
              { value: "REVENUE", label: "Revenue", icon: DollarSign },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            size="md"
          />
        </div>

        <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
          <FileText size={14} /> {recordCount} Records Found
        </div>
      </div>
    </PageHeader>
  );
}
