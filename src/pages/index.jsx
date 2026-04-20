import { useAuth } from "../context/AuthContext";
import ProtectedRoute from "../components/ProtectedRoute";
import DashboardHeader from "../components/DashboardHeader.jsx";
import TasksList from "../components/TasksList.jsx";
import SalesDashboard from "../components/SalesDashboard.jsx";
import { useState } from "react";
import DashboardStats from "../components/DashboardStats.jsx";
import EmployeePipelineMatrix from "../components/EmployeePipelineMatrix.jsx";
import PersonalPipelineRadar from "../components/PersonalPipelineRadar.jsx";
import FloatingMonthPicker from "../components/FloatingMonthPicker.jsx";
import SystemUpdateBanner from "../components/SystemUpdateBanner.jsx";
import PersonalizedHeroBanner from "../components/PersonalizedHeroBanner.jsx";

export default function Dashboard() {
  const { user } = useAuth();

  const isSales =
    user?.department?.toLowerCase().includes("sales") ||
    user?.subDepartment?.toLowerCase().includes("sales");

  // --- GLOBAL RANGE SELECTION ---
  const currentDate = new Date();
  const currentMonthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-01`;
  const [globalRange, setGlobalRange] = useState({
    mode: "MONTHLY",
    startDate: currentMonthYear,
    endDate: currentMonthYear, // Fallback, will be instantly overwritten by the TimeRangeSelector
    label: currentDate.toLocaleString("default", { month: "short", year: "numeric" })
  });

  // Omni Dashboard exclusively for HR and Super Admins
  if (user?.is_hr || user?.isHr || user?.isSuperAdmin) {
    return (
      <ProtectedRoute>
        <div className="space-y-16 pb-20 max-w-7xl mx-auto px-4 md:px-8">
          <SystemUpdateBanner />
          <PersonalizedHeroBanner />

          {/* PIPELINE SECTION */}
          <div className="relative">
            <div className="mb-10 border-b border-border pb-6 relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div>
                <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground flex items-center">
                  Organization Pulse
                  {globalRange?.label && (
                    <span className="text-indigo-600 font-bold ml-4 px-3 py-1 bg-indigo-50 rounded-xl text-lg md:text-xl">— {globalRange.label}</span>
                  )}
                </h2>
                <p className="text-slate-500 mt-2 font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs">
                  Executive Task & Performance Governance
                </p>
              </div>
              <div className="shrink-0">
                <FloatingMonthPicker
                  selectedRange={globalRange}
                  onChange={setGlobalRange}
                />
              </div>
            </div>

            <div className="grid gap-8 relative">
              <DashboardStats selectedRange={globalRange} />
              <EmployeePipelineMatrix selectedRange={globalRange} />
              <TasksList selectedRange={globalRange} />
            </div>
          </div>

          <div className="relative mt-20">
            <SalesDashboard globalRange={globalRange} />
          </div>
        </div>


      </ProtectedRoute>
    );
  }

  // Pure Sales Dashboard for dedicated Sales personnel
  if (isSales) {
    return (
      <ProtectedRoute>
        <div className="pb-20 max-w-7xl mx-auto px-4 md:px-8 pt-8">
          <SystemUpdateBanner />
          <div className="mt-8">
            <PersonalizedHeroBanner />
          </div>
          <div className="mb-0 ml-4 pb-2">
            <FloatingMonthPicker
              selectedRange={globalRange}
              onChange={setGlobalRange}
            />
          </div>
        </div>
        <div className="mt-8">
          <SalesDashboard globalRange={globalRange} />
        </div>

      </ProtectedRoute >
    );
  }

  return (
    <ProtectedRoute>
      <div className="pb-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <SystemUpdateBanner />
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 mt-10 grid gap-12">
          <DashboardHeader />

          {/* HEAD VIEW MONTH PICKER */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-border pb-8">
            <div className="space-y-1">
              <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground flex items-center">
                {user?.is_head || user?.isHead
                  ? "Departmental Pulse"
                  : "Private Workflow"}
              </h2>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                {user?.is_head || user?.isHead ? "Subordinate Asset Monitoring" : "Personal Execution Roadmap"}
              </p>
            </div>

            <div className="shrink-0">
              <FloatingMonthPicker
                selectedRange={globalRange}
                onChange={setGlobalRange}
              />
            </div>
          </div>

          <DashboardStats selectedRange={globalRange} />

          {!(user?.is_head || user?.isHead) && (
            <PersonalPipelineRadar selectedMonth={globalRange.startDate} />
          )}

          <TasksList selectedRange={globalRange} />

          {(user?.is_head || user?.isHead) && (
            <div className="mt-4">
              <div className="mb-8 border-b border-border pb-4">
                <h3 className="text-lg font-black text-foreground">Subordinate Distribution</h3>
              </div>
              <EmployeePipelineMatrix selectedRange={globalRange} />
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
