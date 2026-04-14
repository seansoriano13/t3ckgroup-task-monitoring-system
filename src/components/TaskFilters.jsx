import React from "react";
import {
  Search,
  Filter,
  Users,
  Building2,
  Calendar as CalendarIcon,
  SlidersHorizontal,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { TASK_STATUS } from "../constants/status";

export default function TaskFilters({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  dateRange,
  setDateRange,
  deptFilter,
  setDeptFilter,
  subDeptFilter,
  setSubDeptFilter,
  employeeFilter,
  setEmployeeFilter,
  isManagement,
  isHr,
  hrViewMode = "ALL",
  uniqueDepts = [],
  uniqueSubDepts = [],
  uniqueEmployees = [],
  showStatusFilter = true,
  sortBy,
  setSortBy,
}) {
  const [startDate, endDate] = dateRange || [null, null];

  return (
    <div className="grid gap-3 md:gap-4">
      {/* Row 1: Search & Base Filters */}
      <div className="bg-white border border-gray-4 p-3 md:p-4 rounded-xl flex flex-col lg:flex-row gap-3 md:gap-4 relative z-20 shadow-sm">
        {/* Search - Grows to fill space */}
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-8"
            size={18}
          />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-1 border border-gray-4 text-gray-12 rounded-lg pl-10 pr-4 py-2.5 outline-none focus-within:border-primary transition-colors placeholder:text-gray-7 text-sm md:text-base"
          />
        </div>

        {/* Date & Selects Group */}
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          {/* DATE PICKER */}
          <div className="relative flex-1 sm:flex-initial">
            <div className="flex items-center bg-gray-1 border border-gray-4 rounded-lg px-3 py-2.5 h-[46px]">
              <CalendarIcon size={16} className="text-gray-8 mr-2 shrink-0" />
              <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => setDateRange(update)}
                isClearable={true}
                placeholderText="Date Range"
                className="bg-transparent outline-none text-gray-12 w-full sm:w-[150px] text-sm cursor-pointer"
              />
            </div>
          </div>

          <div className="flex gap-2 flex-1 sm:flex-initial flex-wrap">
            {/* Status Filter */}
            {showStatusFilter && (
              <div className="relative flex-1 min-w-[120px]">
                <Filter
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-8"
                  size={14}
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full appearance-none bg-gray-1 border border-gray-4 text-gray-12 rounded-lg pl-8 pr-4 py-2.5 outline-none text-xs md:text-sm h-[46px] cursor-pointer"
                >
                  <option value="ALL">Status</option>
                  <option value={TASK_STATUS.COMPLETE}>Complete</option>
                  <option value={TASK_STATUS.AWAITING_APPROVAL}>Awaiting Approval</option>
                  <option value={TASK_STATUS.INCOMPLETE}>Incomplete</option>
                  <option value={TASK_STATUS.NOT_APPROVED}>Not Approved</option>
                </select>
              </div>
            )}

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="flex-1 appearance-none bg-gray-1 border border-gray-4 text-gray-12 rounded-lg px-3 py-2.5 outline-none text-xs md:text-sm h-[46px] cursor-pointer min-w-[100px]"
            >
              <option value="ALL">Priority</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {/* Optional Sorting for Approvals Page */}
            {sortBy !== undefined && setSortBy && (
              <div className="relative flex-1 min-w-[130px]">
                <SlidersHorizontal
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-8"
                  size={14}
                />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full appearance-none bg-gray-1 border border-gray-4 text-gray-12 rounded-lg pl-8 pr-4 py-2.5 outline-none text-xs md:text-sm h-[46px] cursor-pointer"
                >
                  <option value="OLDEST">Oldest first</option>
                  <option value="NEWEST">Newest first</option>
                  <option value="NAME">By name</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Management Filters */}
      {isManagement && (!isHr || hrViewMode === "ALL") && (
        <div className="bg-gray-1 border border-gray-4 p-4 rounded-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 relative z-10 shadow-sm">
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-10 uppercase tracking-widest">
              <Building2 size={12} /> Dept
            </label>
            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setSubDeptFilter("ALL");
              }}
              disabled={!isHr}
              className="w-full bg-gray-2 border border-gray-4 text-gray-12 rounded-lg p-2.5 text-sm disabled:opacity-50 cursor-pointer"
            >
              <option value="ALL">All Depts</option>
              {uniqueDepts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-10 uppercase tracking-widest">
              <Building2 size={12} /> Sub-Dept
            </label>
            <select
              value={subDeptFilter}
              onChange={(e) => setSubDeptFilter(e.target.value)}
              disabled={deptFilter === "ALL"}
              className="w-full bg-gray-2 border border-gray-4 text-gray-12 rounded-lg p-2.5 text-sm disabled:opacity-50 cursor-pointer"
            >
              <option value="ALL">All Sub-Depts</option>
              {uniqueSubDepts.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 sm:col-span-2 md:col-span-1">
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-10">
              <Users size={12} /> Team Member
            </label>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="w-full bg-gray-2 border border-gray-4 text-gray-12 rounded-lg p-2.5 font-semibold text-sm cursor-pointer"
            >
              <option value="ALL">Everyone</option>
              {uniqueEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
