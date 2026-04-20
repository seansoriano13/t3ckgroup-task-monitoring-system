import React from "react";
import { Search, SlidersHorizontal, ChevronDown, Calendar } from "lucide-react";
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
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 animate-content-in stagger-2">
      <div className="flex-1 relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60"
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
          className="w-full bg-muted/30 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all placeholder:text-muted-foreground/40 font-medium"
        />
      </div>

      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
        {shouldShowDateFilter && (
          <div className="flex bg-muted/40 border border-border rounded-xl overflow-hidden flex-1 sm:flex-none shadow-sm focus-within:border-primary/50 transition-all">
            <div className="relative border-r border-border">
              <select
                value={timeframe}
                onChange={(e) => {
                  setTimeframe(e.target.value);
                  setSelectedDateFilter(""); // Reset date when switching granularities
                }}
                className="pl-3 pr-8 py-2.5 text-[10px] text-foreground outline-none font-black uppercase tracking-widest bg-transparent cursor-pointer hover:bg-muted/60 transition-colors appearance-none"
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
              <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            <div className="relative flex items-center">
              <Calendar size={13} className="absolute left-3 text-primary/60 pointer-events-none" />
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
                portalId="root"
                placeholderText={
                  timeframe === "YEARLY"
                    ? "Select Year..."
                    : timeframe === "MONTHLY"
                    ? "Select Month..."
                    : "Select Date..."
                }
                className="pl-9 pr-3 py-2.5 text-xs text-foreground outline-none font-bold bg-transparent w-full min-w-[160px] cursor-pointer"
              />
            </div>
          </div>
        )}

        <div className="relative flex-1 sm:flex-none min-w-[160px]">
          <select
            value={canViewAllSales ? filterEmp : user?.id}
            onChange={(e) => setFilterEmp(e.target.value)}
            disabled={!canViewAllSales}
            className={`w-full appearance-none bg-muted/40 border border-border rounded-xl pl-3 pr-8 py-2.5 text-xs text-foreground outline-none focus:border-primary/50 font-bold transition-all ${!canViewAllSales ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted/60"}`}
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
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        <div className="relative flex-1 sm:flex-none min-w-[150px]">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full appearance-none bg-muted/40 border border-border rounded-xl pl-3 pr-8 py-2.5 text-xs text-foreground outline-none focus:border-primary/50 font-bold transition-all cursor-pointer hover:bg-muted/60"
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
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        {activeTab === "ACTIVITIES" && (
          <div className="relative flex-1 sm:flex-none min-w-[150px]">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full appearance-none bg-muted/40 border border-border rounded-xl pl-3 pr-8 py-2.5 text-xs text-foreground outline-none focus:border-primary/50 font-bold transition-all cursor-pointer hover:bg-muted/60"
            >
              <option value="ALL">All Activity Types</option>
              <option value="Sales Call">Sales Call</option>
              <option value="In-House">In-House</option>
              <option value="None">Blank / None</option>
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        )}

        {activeTab === "REVENUE" && (
          <div className="relative flex-1 sm:flex-none min-w-[150px]">
            <select
              value={filterRecordType}
              onChange={(e) => setFilterRecordType(e.target.value)}
              className="w-full appearance-none bg-muted/40 border border-border rounded-xl pl-3 pr-8 py-2.5 text-xs text-foreground outline-none focus:border-primary/50 font-bold transition-all cursor-pointer hover:bg-muted/60"
            >
              <option value="ALL">All Record Types</option>
              <option value="SALES_ORDER">Sales Orders</option>
              <option value="SALES_QUOTATION">Quotations</option>
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        )}

        {sortBy !== undefined && setSortBy && (
          <div className="relative flex-1 sm:flex-none min-w-[130px]">
            <SlidersHorizontal
              className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/60"
              size={13}
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full appearance-none bg-muted/40 border border-border rounded-xl pl-8 pr-8 py-2.5 text-xs text-foreground outline-none focus:border-primary/50 font-bold transition-all cursor-pointer hover:bg-muted/60"
            >
              <option value="NEWEST">Newest first</option>
              <option value="OLDEST">Oldest first</option>
              <option value="NAME">By name</option>
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        )}
      </div>
    </div>
  );
}
