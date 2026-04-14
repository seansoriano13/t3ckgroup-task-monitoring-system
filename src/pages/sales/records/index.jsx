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
