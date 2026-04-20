import React from "react";
import "react-datepicker/dist/react-datepicker.css";

import { useAuth } from "../../../context/AuthContext";
import ProtectedRoute from "../../../components/ProtectedRoute.jsx";
import SalesFilters from "../../../components/SalesFilters.jsx";
import SalesTaskDetailsModal from "../../../components/SalesTaskDetailsModal.jsx";

// Extracted logic & views
import { useSalesRecordsFilters } from "./useSalesRecordsFilters";
import RecordsHeader from "./RecordsHeader";
import ActivitiesTable from "./ActivitiesTable";
import ActivitiesBoard from "./ActivitiesBoard";
import RevenueTable from "./RevenueTable";
import EditRevenueModal from "./EditRevenueModal";

export default function SalesRecordsPage() {
  const { user } = useAuth();

  const {
    canViewAllSales,
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    // activities filters
    searchTerm,
    setSearchTerm,
    filterEmp,
    setFilterEmp,
    filterStatus,
    setFilterStatus,
    filterType,
    setFilterType,
    timeframe,
    setTimeframe,
    selectedDateFilter,
    setSelectedDateFilter,
    sortBy,
    setSortBy,
    activePreset,
    presetOptions,
    applyPreset,
    // revenue filters (independent)
    revSearchTerm,
    setRevSearchTerm,
    revFilterEmp,
    setRevFilterEmp,
    revFilterStatus,
    setRevFilterStatus,
    revFilterRecordType,
    setRevFilterRecordType,
    revTimeframe,
    setRevTimeframe,
    revSelectedDateFilter,
    setRevSelectedDateFilter,
    revSortBy,
    setRevSortBy,
    // selection
    selectedActivity,
    setSelectedActivity,
    editingRevenue,
    setEditingRevenue,
    activitiesPage,
    setActivitiesPage,
    revenuePage,
    setRevenuePage,
    itemsPerPage,
    appSettings,
    isActLoading,
    isRevLoading,
    isVerificationEnforced,
    uniqueEmployees,
    filteredActivities,
    filteredRevenue,
    boardData,
    recordsSummary,
    planVariance,
    employeeInsights,
    updateRevMutation,
    deleteRevenueMutation,
  } = useSalesRecordsFilters(user);

  return (
    <ProtectedRoute>
      <div className="max-w-[1600px] mx-auto space-y-6 pb-10 px-2 sm:px-4">
        
        {/* HEADER & TABS */}
        <RecordsHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          viewMode={viewMode}
          setViewMode={setViewMode}
          recordCount={activeTab === "ACTIVITIES" ? filteredActivities.length : filteredRevenue.length}
        />

        {/* SHARED FILTERS */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
            Quick Views
          </span>
          {presetOptions.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className={`text-[10px] font-black px-3 py-1.5 rounded-xl border transition-all ${
                activePreset === preset.id
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                  : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="sticky top-2 z-10 bg-card/95 backdrop-blur border border-border rounded-2xl px-5 py-3 flex flex-wrap gap-2 shadow-sm">
          <span className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-muted border border-border text-foreground">
            Total: {recordsSummary.total}
          </span>
          <span className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            Completed: {recordsSummary.completedPct}%
          </span>
          {activeTab === "ACTIVITIES" && (
            <span className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
              Unplanned: {recordsSummary.unplannedPct}%
            </span>
          )}
          <span className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
            {activeTab === "ACTIVITIES" ? "Pending Expense" : "Unverified"}:{" "}
            {recordsSummary.pendingExpense}
          </span>
          {activeTab === "ACTIVITIES" && (
            <span
              className={`text-[10px] font-black px-3 py-1.5 rounded-lg border ${
                planVariance.direction === "balanced"
                  ? "bg-muted text-muted-foreground border-border"
                  : planVariance.direction === "over"
                    ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                    : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              Plan vs Actual: {planVariance.planned} vs {planVariance.completed} (
              {planVariance.delta > 0 ? "+" : ""}
              {planVariance.delta})
            </span>
          )}
        </div>

        <SalesFilters
          activeTab={activeTab}
          viewMode={viewMode}
          searchTerm={activeTab === "ACTIVITIES" ? searchTerm : revSearchTerm}
          setSearchTerm={activeTab === "ACTIVITIES" ? setSearchTerm : setRevSearchTerm}
          timeframe={activeTab === "ACTIVITIES" ? timeframe : revTimeframe}
          setTimeframe={activeTab === "ACTIVITIES" ? setTimeframe : setRevTimeframe}
          selectedDateFilter={activeTab === "ACTIVITIES" ? selectedDateFilter : revSelectedDateFilter}
          setSelectedDateFilter={activeTab === "ACTIVITIES" ? setSelectedDateFilter : setRevSelectedDateFilter}
          filterEmp={activeTab === "ACTIVITIES" ? filterEmp : revFilterEmp}
          setFilterEmp={activeTab === "ACTIVITIES" ? setFilterEmp : setRevFilterEmp}
          filterStatus={activeTab === "ACTIVITIES" ? filterStatus : revFilterStatus}
          setFilterStatus={activeTab === "ACTIVITIES" ? setFilterStatus : setRevFilterStatus}
          filterType={filterType}
          setFilterType={setFilterType}
          filterRecordType={revFilterRecordType}
          setFilterRecordType={setRevFilterRecordType}
          canViewAllSales={canViewAllSales}
          user={user}
          uniqueEmployees={uniqueEmployees}
          isVerificationEnforced={isVerificationEnforced}
          showDateFilter={true}
          sortBy={activeTab === "ACTIVITIES" ? sortBy : revSortBy}
          setSortBy={activeTab === "ACTIVITIES" ? setSortBy : setRevSortBy}
        />

        {/* ACTIVITIES VIEWS */}
        {activeTab === "ACTIVITIES" && viewMode === "TABLE" && (
          <ActivitiesTable
            filteredActivities={filteredActivities}
            isLoading={isActLoading}
            activitiesPage={activitiesPage}
            setActivitiesPage={setActivitiesPage}
            itemsPerPage={itemsPerPage}
            onActivityClick={setSelectedActivity}
            appSettings={appSettings}
          />
        )}

        {activeTab === "ACTIVITIES" && viewMode === "BOARD" && (
          <ActivitiesBoard
            boardData={boardData}
            timeframe={timeframe}
            onActivityClick={setSelectedActivity}
            appSettings={appSettings}
          />
        )}

        {/* REVENUE VIEW */}
        {activeTab === "REVENUE" && (
          <RevenueTable
            filteredRevenue={filteredRevenue}
            isLoading={isRevLoading}
            revenuePage={revenuePage}
            setRevenuePage={setRevenuePage}
            itemsPerPage={itemsPerPage}
            filterRecordType={revFilterRecordType}
            setFilterRecordType={setRevFilterRecordType}
            onRowClick={setEditingRevenue}
            user={user}
            isVerificationEnforced={isVerificationEnforced}
            deleteRevenueMutation={deleteRevenueMutation}
          />
        )}

        {employeeInsights.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
              Team Consistency Risk
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {employeeInsights.slice(0, 6).map((insight) => (
                <div key={insight.employeeId} className="bg-muted/30 border border-border rounded-xl p-4 hover:border-indigo-200 transition-colors">
                  <p className="font-black text-sm text-foreground">{insight.employeeName}</p>
                  <p className="text-[11px] text-muted-foreground mt-1.5 font-bold">
                    Consistency {insight.consistencyScore}% · Risk {insight.riskScore}%
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-wider">
                    Completion {insight.completionRate}% · Unplanned {insight.unplannedRate}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      <SalesTaskDetailsModal
        isOpen={!!selectedActivity}
        onClose={() => setSelectedActivity(null)}
        activity={selectedActivity}
        appSettings={appSettings}
      />
      
      <EditRevenueModal
        key={editingRevenue?.id}
        isOpen={!!editingRevenue}
        onClose={() => setEditingRevenue(null)}
        log={editingRevenue}
        onSave={(id, payload) => updateRevMutation.mutate({ id, payload })}
        isSaving={updateRevMutation.isPending}
        currentUser={user}
        isVerificationEnforced={isVerificationEnforced}
      />

    </ProtectedRoute>
  );
}
