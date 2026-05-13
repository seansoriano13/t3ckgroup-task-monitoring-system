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
import CommitteeTasksList from "../components/CommitteeTasksList.jsx";
import PageHeader from "../components/ui/PageHeader";
import PageContainer from "../components/ui/PageContainer";
import SectionHeader from "../components/ui/SectionHeader";
import TabGroup from "../components/ui/TabGroup";
import { Users, CheckSquare, DollarSign } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();

  const hasSales = user?.has_sales_flow;
  const hasTask = user?.has_task_flow;

  const isOmni =
    user?.is_hr || user?.isHr || user?.isSuperAdmin || (hasTask && hasSales);

  // --- GLOBAL RANGE SELECTION ---
  const currentDate = new Date();
  const currentMonthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-01`;
  const [globalRange, setGlobalRange] = useState({
    mode: "MONTHLY",
    startDate: currentMonthYear,
    endDate: currentMonthYear, // Fallback, will be instantly overwritten by the TimeRangeSelector
    label: currentDate.toLocaleString("default", {
      month: "short",
      year: "numeric",
    }),
  });

  const [activeTab, setActiveTabRaw] = useState(() => {
    return sessionStorage.getItem("dashboardActiveTab") || "tasks";
  });

  const setActiveTab = (tab) => {
    setActiveTabRaw(tab);
    sessionStorage.setItem("dashboardActiveTab", tab);
  };

  // Omni Dashboard exclusively for HR, Super Admins, and Hybrid users
  if (isOmni) {
    return (
      <ProtectedRoute>
        <PageContainer spaceY="10" className="pt-4">
          <SystemUpdateBanner />
          <PersonalizedHeroBanner />

          {/* PIPELINE SECTION */}
          <div className="relative">
            <PageHeader
              title="Accomplishment Report"
              description="Executive Performance Governance"
            >
              {globalRange?.label && (
                <span className="text-mauve-11 font-bold px-3 py-1 bg-mauve-2 border border-mauve-4 rounded-xl text-lg md:text-xl shrink-0 shadow-sm">
                  — {globalRange.label}
                </span>
              )}
              <FloatingMonthPicker
                selectedRange={globalRange}
                onChange={setGlobalRange}
              />
            </PageHeader>

            <div className="mt-6 mb-8">
              <TabGroup
                tabs={[
                  { value: "tasks", label: "Tasks", icon: CheckSquare },
                  {
                    value: "sales",
                    label: "Sales Activities",
                    icon: DollarSign,
                  },
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
                variant="pill"
                size="md"
              />
            </div>

            <div className="grid gap-14 relative mt-10">
              {activeTab === "tasks" ? (
                <>
                  {user?.is_hr ||
                  user?.isHr ||
                  user?.isSuperAdmin ||
                  user?.is_head ||
                  user?.isHead ? (
                    <>
                      <DashboardStats selectedRange={globalRange} />
                      <EmployeePipelineMatrix selectedRange={globalRange} />
                    </>
                  ) : (
                    <PersonalPipelineRadar
                      selectedRange={globalRange}
                      mode="tasks"
                    />
                  )}

                  <TasksList selectedRange={globalRange} />
                  <CommitteeTasksList selectedRange={globalRange} />
                </>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <SalesDashboard globalRange={globalRange} isEmbedded={true} />
                </div>
              )}
            </div>
          </div>
        </PageContainer>
      </ProtectedRoute>
    );
  }

  // Pure Sales Dashboard for dedicated Sales personnel
  if (hasSales && !hasTask) {
    return (
      <ProtectedRoute>
        <PageContainer spaceY="8" className="pt-8">
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
          <div className="mt-8">
            <SalesDashboard globalRange={globalRange} />
          </div>
        </PageContainer>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageContainer spaceY="10" className="pt-4">
        <SystemUpdateBanner />

        <div className="grid gap-12">
          <DashboardHeader />

          {/* HEAD VIEW MONTH PICKER */}
          <PageHeader
            title={
              user?.is_head || user?.isHead
                ? "Departmental Pulse"
                : "Private Workflow"
            }
            description={
              user?.is_head || user?.isHead
                ? "Subordinate Asset Monitoring"
                : "Personal Execution Roadmap"
            }
          >
            {globalRange?.label && (
              <span className="text-mauve-11 font-bold px-3 py-1 bg-mauve-2 border border-mauve-4 rounded-xl text-lg md:text-xl shrink-0 shadow-sm">
                — {globalRange.label}
              </span>
            )}
            <FloatingMonthPicker
              selectedRange={globalRange}
              onChange={setGlobalRange}
            />
          </PageHeader>

          {user?.is_head ||
          user?.isHead ||
          user?.is_hr ||
          user?.isHr ||
          user?.isSuperAdmin ? (
            <DashboardStats selectedRange={globalRange} />
          ) : (
            <PersonalPipelineRadar selectedRange={globalRange} />
          )}

          <TasksList selectedRange={globalRange} />

          <CommitteeTasksList selectedRange={globalRange} />

          {(user?.is_head || user?.isHead) && (
            <div className="mt-12 space-y-6">
              <SectionHeader
                icon={Users}
                title="Subordinate Distribution"
                description="Team Pipeline Overview"
                rangeLabel={globalRange?.label}
              />
              <EmployeePipelineMatrix selectedRange={globalRange} />
            </div>
          )}
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
