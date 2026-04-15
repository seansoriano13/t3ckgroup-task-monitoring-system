import { useAuth } from "../context/AuthContext";
import ProtectedRoute from "../components/ProtectedRoute";
import DashboardHeader from "../components/DashboardHeader.jsx";
import TasksList from "../components/TasksList.jsx";
import SalesDashboard from "../components/SalesDashboard.jsx";
import { useState } from "react";
import DashboardStats from "../components/DashboardStats.jsx";
import { Calendar } from "lucide-react";
import EmployeePipelineMatrix from "../components/EmployeePipelineMatrix.jsx";
import PersonalPipelineRadar from "../components/PersonalPipelineRadar.jsx";
import FloatingMonthPicker from "../components/FloatingMonthPicker.jsx";
import SystemUpdateBanner from "../components/SystemUpdateBanner.jsx";

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
        <div className="space-y-12 pb-10 max-w-350 mx-auto px-2 xl:px-0">
          {(user?.is_super_admin || user?.isSuperAdmin) && <SystemUpdateBanner />}

          {/* PIPELINE SECTION */}
          <div className="bg-gray-1 border border-gray-4 p-6 sm:p-10 rounded-4xl shadow-xl relative overflow-hidden">
            <div className="mb-8 border-b border-gray-4 pb-4 relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-gray-12 uppercase tracking-widest flex items-center gap-3">
                  Daily Task Accomplishment Report
                </h2>
                <p className="text-gray-9 mt-1 font-medium">
                  All task executions, approvals, and HR verifications.
                </p>
              </div>
            </div>

            <div className="grid gap-8 relative">
              <DashboardStats selectedRange={globalRange} />
              <EmployeePipelineMatrix selectedRange={globalRange} />
              <TasksList selectedRange={globalRange} />
            </div>
          </div>

          {/* SALES SECTION */}
          <div className="bg-gray-1 border border-gray-4 p-2 sm:p-10 pb-0 rounded-4xl shadow-xl relative overflow-hidden mt-12">
            <div className="relative w-full overflow-hidden">
              <SalesDashboard globalRange={globalRange} />
            </div>
          </div>
        </div>

        <FloatingMonthPicker
          selectedRange={globalRange}
          onChange={setGlobalRange}
        />
      </ProtectedRoute>
    );
  }

  // Pure Sales Dashboard for dedicated Sales personnel
  if (isSales) {
    return (
      <ProtectedRoute>
        <div className="pb-10">
          <SalesDashboard globalRange={globalRange} />
        </div>
        <FloatingMonthPicker
          selectedRange={globalRange}
          onChange={setGlobalRange}
        />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div>
        <div className="grid gap-8">
          <DashboardHeader />

          {/* HEAD VIEW MONTH PICKER */}
          <div className="flex items-center justify-between gap-4 border-b border-gray-4 pb-4 px-2">
            <div>
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">
                Dashboard
              </p>
              <h2 className="text-2xl font-black text-gray-12 uppercase">
                {user?.is_head || user?.isHead
                  ? "Department Tasks"
                  : "My Tasks"}
              </h2>
            </div>

            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 bg-gray-1 border border-gray-4 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-9 shadow-sm w-max">
                <Calendar size={12} />
                <span className="uppercase tracking-wider">
                  {globalRange.label}
                </span>
              </div>
              <p className="text-[9px] uppercase tracking-widest text-primary font-black mt-1">
                {globalRange.mode}
              </p>
            </div>
          </div>

          <DashboardStats selectedRange={globalRange} />
          {!(user?.is_head || user?.isHead) && (
             <PersonalPipelineRadar selectedMonth={globalRange.startDate} />
          )}
          {(user?.is_head || user?.isHead) && (
            <EmployeePipelineMatrix selectedRange={globalRange} />
          )}
          <TasksList selectedRange={globalRange} />
        </div>
        <FloatingMonthPicker
          selectedRange={globalRange}
          onChange={setGlobalRange}
        />
      </div>
    </ProtectedRoute>
  );
}
