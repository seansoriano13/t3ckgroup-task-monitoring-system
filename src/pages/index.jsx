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
        <div className="space-y-12 pb-10 max-w-350 mx-auto px-2 xl:px-0">
          <SystemUpdateBanner />
          <PersonalizedHeroBanner />

          {/* PIPELINE SECTION */}
          <div className="relative">
            <div className="mb-8 border-b border-gray-4 pb-4 relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-gray-12 flex items-center uppercase">
                  Daily Task Accomplishment Report
                  {globalRange?.label && (
                    <span className="text-[#111827] ml-2">— {globalRange.label}</span>
                  )}
                </h2>
                <p className="text-gray-9 mt-1 font-medium">
                  All task executions, approvals, and HR verifications.
                </p>
              </div>
              <FloatingMonthPicker
                selectedRange={globalRange}
                onChange={setGlobalRange}
              />
            </div>

            <div className="grid gap-8 relative">
              <DashboardStats selectedRange={globalRange} />
              <EmployeePipelineMatrix selectedRange={globalRange} />
              <TasksList selectedRange={globalRange} />
            </div>
          </div>

          {/* SALES SECTION */}
          <div className="relative mt-12">
            <div className="relative w-full overflow-hidden">
              <SalesDashboard globalRange={globalRange} />
            </div>
          </div>
        </div>


      </ProtectedRoute>
    );
  }

  // Pure Sales Dashboard for dedicated Sales personnel
  if (isSales) {
    return (
      <ProtectedRoute>
        <div className="pb-10">
          <div className="max-w-350 mx-auto px-2 xl:px-0 pt-6 flex items-end justify-between">
            <div className="flex-1">
              <SystemUpdateBanner />
              <div className="mt-6">
                <PersonalizedHeroBanner />
              </div>
            </div>
            <div className="mb-0 ml-4 pb-2">
              <FloatingMonthPicker
                selectedRange={globalRange}
                onChange={setGlobalRange}
              />
            </div>
          </div>
          <SalesDashboard globalRange={globalRange} />
        </div>

      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div>
        <div className="max-w-350 mx-auto mb-6">
          <SystemUpdateBanner />
        </div>
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
          {(user?.is_head || user?.isHead) && (
            <EmployeePipelineMatrix selectedRange={globalRange} />
          )}
          <TasksList selectedRange={globalRange} />
        </div>

      </div>
    </ProtectedRoute>
  );
}
