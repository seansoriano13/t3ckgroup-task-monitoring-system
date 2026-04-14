import React from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function SalesFilters({
  activeTab = "ACTIVITIES",
  viewMode = "BOARD",
  searchTerm,
  setSearchTerm,
  timeframe,
  setTimeframe,
  selectedDateFilter,
  setSelectedDateFilter,
  filterEmp,
  setFilterEmp,
  filterStatus,
  setFilterStatus,
  filterType,
  setFilterType,
  canViewAllSales = true,
  user,
  uniqueEmployees = [],
  isVerificationEnforced = false,
  showDateFilter = null, // Can explicitly pass a boolean to override viewMode check
  filterRecordType = "ALL",
  setFilterRecordType = () => {},
  sortBy,
  setSortBy,
}) {
  const shouldShowDateFilter =
    showDateFilter !== null ? showDateFilter : (viewMode === "BOARD" || activeTab === "REVENUE");

  return (
    <div className="bg-gray-1 border border-gray-4 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4">
      <div className="flex-1 relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-9"
        />
        <input
          type="text"
          placeholder={
            activeTab === "ACTIVITIES"
              ? "Search accounts, names, or remarks..."
              : "Search accounts, products, or reps..."
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-2 border border-gray-4 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-12 outline-none focus-within:gray-6 transition-colors"
        />
      </div>

      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
        {shouldShowDateFilter && (
          <div className="flex bg-gray-2 border border-gray-4 rounded-lg overflow-hidden flex-1 sm:flex-none shadow-sm focus-within:gray-6 transition-colors">
            <select
              value={timeframe}
              onChange={(e) => {
                setTimeframe(e.target.value);
                setSelectedDateFilter(""); // Reset date when switching granularities
              }}
              className="px-3 py-2 text-sm text-gray-12 outline-none font-semibold bg-transparent border-r border-gray-4 cursor-pointer"
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
            <DatePicker
              selected={selectedDateFilter ? new Date(selectedDateFilter) : null}
              onChange={(date) => {
                if (!date) {
                  setSelectedDateFilter("");
                  return;
                }
                if (timeframe === "YEARLY") {
                  setSelectedDateFilter(date.getFullYear().toString());
                } else if (timeframe === "MONTHLY") {
                  const m = String(date.getMonth() + 1).padStart(2, "0");
                  setSelectedDateFilter(`${date.getFullYear()}-${m}`);
                } else {
                  const y = date.getFullYear();
                  const m = String(date.getMonth() + 1).padStart(2, "0");
                  const d = String(date.getDate()).padStart(2, "0");
                  setSelectedDateFilter(`${y}-${m}-${d}`);
                }
              }}
              showMonthYearPicker={timeframe === "MONTHLY"}
              showYearPicker={timeframe === "YEARLY"}
              dateFormat={
                timeframe === "YEARLY"
                  ? "yyyy"
                  : timeframe === "MONTHLY"
                  ? "MMMM yyyy"
                  : "MMM d, yyyy"
              }
              isClearable={true}
              placeholderText={
                timeframe === "YEARLY"
                  ? "Select Year..."
                  : timeframe === "MONTHLY"
                  ? "Select Month..."
                  : "Select Date..."
              }
              className="px-3 py-2 text-sm text-gray-12 outline-none font-bold bg-transparent w-full min-w-[140px] cursor-pointer"
            />
          </div>
        )}

        <select
          value={canViewAllSales ? filterEmp : user?.id}
          onChange={(e) => setFilterEmp(e.target.value)}
          disabled={!canViewAllSales}
          className={`bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus:border-gray-6 font-semibold flex-1 sm:flex-none ${!canViewAllSales ? "opacity-70 cursor-not-allowed" : ""}`}
        >
          {canViewAllSales ? (
            <option value="ALL">All Representatives</option>
          ) : (
            <option value={user?.id}>My Records</option>
          )}
          {canViewAllSales &&
            uniqueEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus-within:border-gray-6 font-semibold flex-1 sm:flex-none cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          {activeTab === "ACTIVITIES" ? (
            <>
              <option value="INCOMPLETE">Planned / Incomplete</option>
              <option value="APPROVED">Approved / Completed</option>
              <option value="PENDING">Pending Expense Approval</option>
            </>
          ) : (
            <>
              <option value="APPROVED">Completed</option>
              <option value="INCOMPLETE">Lost</option>
              {isVerificationEnforced && (
                <option value="UNVERIFIED">Pending Verification</option>
              )}
            </>
          )}
        </select>

        {activeTab === "ACTIVITIES" && (
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus-within:border-gray-6 font-semibold flex-1 sm:flex-none cursor-pointer"
          >
            <option value="ALL">All Activity Types</option>
            <option value="Sales Call">Sales Call</option>
            <option value="In-House">In-House</option>
            <option value="None">Blank / None</option>
          </select>
        )}

        {activeTab === "REVENUE" && (
          <select
            value={filterRecordType}
            onChange={(e) => setFilterRecordType(e.target.value)}
            className="bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus-within:border-gray-6 font-semibold flex-1 sm:flex-none cursor-pointer"
          >
            <option value="ALL">All Record Types</option>
            <option value="SALES_ORDER">Sales Orders</option>
            <option value="SALES_QUOTATION">Quotations</option>
          </select>
        )}

        {sortBy !== undefined && setSortBy && (
          <div className="relative flex-1 sm:flex-none min-w-[130px]">
            <SlidersHorizontal
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-8"
              size={14}
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full appearance-none bg-gray-2 border border-gray-4 rounded-lg pl-8 pr-4 py-2 text-sm text-gray-12 outline-none focus-within:border-gray-6 font-semibold cursor-pointer"
            >
              <option value="NEWEST">Newest first</option>
              <option value="OLDEST">Oldest first</option>
              <option value="NAME">By name</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
