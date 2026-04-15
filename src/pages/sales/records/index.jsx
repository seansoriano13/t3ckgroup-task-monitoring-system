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
    searchTerm,
    setSearchTerm,
    filterEmp,
    setFilterEmp,
    filterStatus,
    setFilterStatus,
    filterType,
    setFilterType,
    filterRecordType,
    setFilterRecordType,
    timeframe,
    setTimeframe,
    selectedDateFilter,
    setSelectedDateFilter,
    sortBy,
    setSortBy,
    activePreset,
    presetOptions,
    applyPreset,
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
          <span className="text-[11px] font-black uppercase tracking-widest text-gray-9">
            Quick Views
          </span>
          {presetOptions.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                activePreset === preset.id
                  ? "bg-primary text-white border-primary"
                  : "bg-gray-1 text-gray-11 border-gray-4 hover:bg-gray-2"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="sticky top-2 z-10 bg-gray-2/95 backdrop-blur border border-gray-4 rounded-xl p-3 flex flex-wrap gap-2">
          <span className="text-[11px] font-bold px-2 py-1 rounded bg-gray-1 border border-gray-4">
            Total: {recordsSummary.total}
          </span>
          <span className="text-[11px] font-bold px-2 py-1 rounded bg-green-500/10 text-green-700 border border-green-500/20">
            Completed: {recordsSummary.completedPct}%
          </span>
          {activeTab === "ACTIVITIES" && (
            <span className="text-[11px] font-bold px-2 py-1 rounded bg-blue-500/10 text-blue-700 border border-blue-500/20">
              Unplanned: {recordsSummary.unplannedPct}%
            </span>
          )}
          <span className="text-[11px] font-bold px-2 py-1 rounded bg-amber-500/10 text-amber-700 border border-amber-500/20">
            {activeTab === "ACTIVITIES" ? "Pending Expense" : "Unverified"}:{" "}
            {recordsSummary.pendingExpense}
          </span>
          {activeTab === "ACTIVITIES" && (
            <span
              className={`text-[11px] font-bold px-2 py-1 rounded border ${
                planVariance.direction === "balanced"
                  ? "bg-gray-1 text-gray-11 border-gray-4"
                  : planVariance.direction === "over"
                    ? "bg-yellow-500/10 text-yellow-700 border-yellow-500/20"
                    : "bg-red-500/10 text-red-700 border-red-500/20"
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
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          timeframe={timeframe}
          setTimeframe={setTimeframe}
          selectedDateFilter={selectedDateFilter}
          setSelectedDateFilter={setSelectedDateFilter}
          filterEmp={filterEmp}
          setFilterEmp={setFilterEmp}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterType={filterType}
          setFilterType={setFilterType}
          filterRecordType={filterRecordType}
          setFilterRecordType={setFilterRecordType}
          canViewAllSales={canViewAllSales}
          user={user}
          uniqueEmployees={uniqueEmployees}
          isVerificationEnforced={isVerificationEnforced}
          showDateFilter={true}
          sortBy={sortBy}
          setSortBy={setSortBy}
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
            filterRecordType={filterRecordType}
            setFilterRecordType={setFilterRecordType}
            onRowClick={setEditingRevenue}
            user={user}
            isVerificationEnforced={isVerificationEnforced}
            deleteRevenueMutation={deleteRevenueMutation}
          />
        )}

        {employeeInsights.length > 0 && (
          <div className="bg-gray-1 border border-gray-4 rounded-xl p-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-10 mb-3">
              Team Consistency Risk
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {employeeInsights.slice(0, 6).map((insight) => (
                <div key={insight.employeeId} className="bg-gray-2 border border-gray-4 rounded-lg p-3">
                  <p className="font-bold text-sm text-gray-12">{insight.employeeName}</p>
                  <p className="text-[11px] text-gray-9 mt-1">
                    Consistency {insight.consistencyScore}% | Risk {insight.riskScore}%
                  </p>
                  <p className="text-[10px] text-gray-8 mt-1">
                    Completion {insight.completionRate}% | Unplanned {insight.unplannedRate}%
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
