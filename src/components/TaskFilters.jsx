import React, { useState } from "react";
import {
  Search,
  Filter,
  Users,
  Building2,
  Calendar as CalendarIcon,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { TASK_STATUS } from "../constants/status";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PriorityDropdown from "./dropdowns/PriorityDropdown";
import Dropdown from "./ui/Dropdown";

import { FilterTrigger, FilterOptionList } from "./ui/FilterDropdown";

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
  disableStatusFilter = false,
  disableDeptFilter,
  sortBy,
  setSortBy,
  forceAdvancedOpen = false,
  onAdvancedOpenChange,
}) {
  const [startDate, endDate] = dateRange || [null, null];
  const [showAdvanced, setShowAdvancedRaw] = useState(forceAdvancedOpen || !!employeeFilter);

  const isFiltersReadOnly = !isManagement || (isHr && hrViewMode === "PERSONAL");

  const setShowAdvanced = (val) => {
    setShowAdvancedRaw(val);
    if (onAdvancedOpenChange) onAdvancedOpenChange(val);
  };

  const isAnyFilterActive =
    statusFilter !== "ALL" ||
    priorityFilter !== "ALL" ||
    (deptFilter !== "ALL" && !disableDeptFilter) ||
    subDeptFilter !== "ALL" ||
    employeeFilter !== "ALL" ||
    startDate !== null ||
    endDate !== null ||
    searchTerm !== "";

  const handleClearAll = () => {
    setSearchTerm("");
    if (setStatusFilter && showStatusFilter) setStatusFilter("ALL");
    if (setPriorityFilter) setPriorityFilter("ALL");
    if (setDeptFilter && !disableDeptFilter) setDeptFilter("ALL");
    if (setSubDeptFilter) setSubDeptFilter("ALL");
    if (setEmployeeFilter) setEmployeeFilter("ALL");
    setDateRange([null, null]);
  };

  // Option Definitions
  const sortOptions = [
    { value: "NEWEST", label: "Sort: Newest" },
    { value: "OLDEST", label: "Sort: Oldest" },
    { value: "NAME", label: "Sort: By Name" },
  ];

  const statusOptions = [
    { value: "ALL", label: "Status: All" },
    { value: TASK_STATUS.COMPLETE, label: "Complete" },
    { value: TASK_STATUS.AWAITING_APPROVAL, label: "Awaiting Approval" },
    { value: TASK_STATUS.INCOMPLETE, label: "Incomplete" },
    { value: TASK_STATUS.NOT_APPROVED, label: "Not Approved" },
  ];

  const deptOptions = [
    { value: "ALL", label: "Dept: All" },
    ...(!uniqueDepts.includes("SALES")
      ? [{ value: "SALES", label: "Dept: SALES" }]
      : []),
    ...uniqueDepts
      .filter((d) => d !== "ALL")
      .map((d) => ({ value: d, label: `Dept: ${d}` })),
  ];

  const subDeptOptions = [
    { value: "ALL", label: "Sub-Dept: All" },
    ...uniqueSubDepts
      .filter((s) => s !== "ALL")
      .map((s) => ({ value: s, label: `Sub: ${s}` })),
  ];

  const employeeOptions = [
    { value: "ALL", label: "Member: Everyone" },
    ...uniqueEmployees.map((emp) => ({ value: emp.id, label: emp.name })),
  ];

  const currentSortLabel =
    sortOptions.find((o) => o.value === sortBy)?.label || sortOptions[0].label;
  const currentStatusLabel =
    statusOptions.find((o) => o.value === statusFilter)?.label ||
    statusOptions[0].label;
  const currentDeptLabel =
    deptOptions.find((o) => o.value === deptFilter)?.label ||
    deptOptions[0].label;
  const currentSubDeptLabel =
    subDeptOptions.find((o) => o.value === subDeptFilter)?.label ||
    subDeptOptions[0].label;
  const currentEmployeeLabel =
    employeeOptions.find((o) => o.value === employeeFilter)?.label ||
    employeeOptions[0].label;

  return (
    <div className="grid gap-3 md:gap-4">
      {/* Row 1: Search & Permanent Filters */}
      <div className="bg-card border border-[#E5E7EB] p-3 md:p-4 rounded-xl flex flex-col xl:flex-row items-stretch xl:items-center gap-3 md:gap-4 relative z-20">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <Input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 block h-[40px] md:h-[46px]"
          />
        </div>

        {/* Action Group */}
        <div className="flex items-center gap-2 w-full xl:w-auto flex-wrap justify-between xl:justify-start relative z-10">
          <div className="flex gap-2 items-center flex-wrap">
            {/* DATE PICKER */}
            <div
              className={`bg-card flex items-center border rounded-lg px-3 py-2.5 h-[40px] md:h-[46px] shadow-sm transition-colors shrink-0 ${
                startDate || endDate
                  ? "text-foreground border-primary/20 font-medium"
                  : "border-border hover:border-border/80 text-foreground"
              }`}
            >
              <CalendarIcon
                size={16}
                className={`${startDate || endDate ? "text-foreground" : "text-muted-foreground"} mr-2 shrink-0`}
              />
              <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => setDateRange(update)}
                isClearable={true}
                placeholderText="Date Range"
                className={`bg-transparent outline-none w-[170px] text-[13px] cursor-pointer ${
                  startDate || endDate
                    ? "text-foreground placeholder:text-muted-foreground font-medium"
                    : "text-foreground placeholder:text-muted-foreground"
                }`}
              />
            </div>

            {/* SORTING */}
            {sortBy !== undefined && setSortBy && (
              <Dropdown
                usePortal={true}
                className="min-w-[150px] shrink-0"
                popoverClassName="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-[50] min-w-full popover-enter"
                trigger={({ isOpen }) => (
                  <FilterTrigger
                    label={currentSortLabel}
                    isActive={sortBy !== "NEWEST"}
                    isOpen={isOpen}
                    icon={SlidersHorizontal}
                  />
                )}
              >
                {({ close }) => (
                  <FilterOptionList
                    options={sortOptions}
                    value={sortBy}
                    onChange={setSortBy}
                    close={close}
                  />
                )}
              </Dropdown>
            )}

            <Button
              variant={showAdvanced ? "secondary" : "outline"}
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`flex items-center gap-2 h-[40px] md:h-[46px] text-[13px] shrink-0 font-semibold`}
            >
              <Filter size={16} />
              Add Filter
            </Button>
          </div>

          {/* CLEAR ALL ESCAPE HATCH */}
          {isAnyFilterActive && (
            <button
              onClick={handleClearAll}
              className="ml-auto xl:ml-2 text-sm text-muted-foreground hover:text-black font-semibold px-3 py-2 shrink-0 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Advanced Filters */}
      {showAdvanced && (
        <div className="bg-mauve-2 border border-[#E5E7EB] p-4 rounded-xl flex flex-wrap gap-3 relative z-10 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Status Filter */}
          {showStatusFilter && (
            <Dropdown
              disabled={disableStatusFilter}
              className="flex-1 min-w-[170px]"
              popoverClassName="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-[50] min-w-full popover-enter"
              trigger={({ isOpen, disabled }) => (
                <FilterTrigger
                  label={currentStatusLabel}
                  isActive={statusFilter !== "ALL"}
                  isOpen={isOpen}
                  icon={Filter}
                  disabled={disabled}
                />
              )}
            >
              {({ close }) => (
                <FilterOptionList
                  options={statusOptions}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  close={close}
                />
              )}
            </Dropdown>
          )}

          {/* Priority */}
          <PriorityDropdown
            value={priorityFilter}
            onChange={(val) => setPriorityFilter(val)}
            className="flex-1 min-w-[150px]"
            hasAll={true}
            customTrigger={({ isOpen, currentPriority }) => {
              const isActive = priorityFilter && priorityFilter !== "ALL";
              return (
                <div
                  className={`h-[40px] md:h-[46px] w-full flex items-center justify-between px-3 rounded-lg border transition-all cursor-pointer ${
                    isOpen
                      ? "border-mauve-6 ring-1 ring-mauve-6 bg-card"
                      : isActive
                        ? "border-mauve-6 font-medium"
                        : "border-border bg-card hover:border-border/80"
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    {currentPriority.value !== "ALL" && (
                      <div
                        className={`w-2 h-2 shrink-0 rounded-full ${currentPriority.dot}`}
                      />
                    )}
                    <span className="text-[13px] text-foreground font-[500] truncate block w-full text-left">
                      {currentPriority.value === "ALL"
                        ? "Priority: All"
                        : currentPriority.label}
                    </span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`ml-1 shrink-0 text-muted-foreground transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              );
            }}
          />

              {/* Dept */}
              <Dropdown
                disabled={
                  disableDeptFilter !== undefined ? disableDeptFilter : (!isHr || isFiltersReadOnly)
                }
                className="flex-1 min-w-[180px]"
                popoverClassName="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-[50] min-w-full popover-enter max-h-[300px] overflow-y-auto"
                trigger={({ isOpen, disabled }) => (
                  <FilterTrigger
                    label={currentDeptLabel}
                    isActive={deptFilter !== "ALL"}
                    isOpen={isOpen}
                    icon={Building2}
                    disabled={disabled}
                  />
                )}
              >
                {({ close }) => (
                  <FilterOptionList
                    options={deptOptions}
                    value={deptFilter}
                    onChange={(val) => {
                      setDeptFilter(val);
                      setSubDeptFilter("ALL");
                    }}
                    close={close}
                  />
                )}
              </Dropdown>

              {/* Sub-Dept */}
              <Dropdown
                disabled={deptFilter === "ALL" || isFiltersReadOnly}
                className="flex-1 min-w-[180px]"
                popoverClassName="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-[50] min-w-full popover-enter max-h-[300px] overflow-y-auto"
                trigger={({ isOpen, disabled }) => (
                  <FilterTrigger
                    label={currentSubDeptLabel}
                    isActive={subDeptFilter !== "ALL"}
                    isOpen={isOpen}
                    icon={Building2}
                    disabled={disabled}
                  />
                )}
              >
                {({ close }) => (
                  <FilterOptionList
                    options={subDeptOptions}
                    value={subDeptFilter}
                    onChange={setSubDeptFilter}
                    close={close}
                  />
                )}
              </Dropdown>

              {/* Employees */}
              <Dropdown
                disabled={isFiltersReadOnly}
                className="flex-1 min-w-[180px]"
                popoverClassName="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-[50] min-w-full popover-enter max-h-[300px] overflow-y-auto w-[250px]"
                trigger={({ isOpen, disabled }) => (
                  <FilterTrigger
                    label={currentEmployeeLabel}
                    isActive={employeeFilter !== "ALL"}
                    isOpen={isOpen}
                    icon={Users}
                    disabled={disabled}
                  />
                )}
              >
                {({ close }) => (
                  <FilterOptionList
                    options={employeeOptions}
                    value={employeeFilter}
                    onChange={setEmployeeFilter}
                    close={close}
                  />
                )}
              </Dropdown>
        </div>
      )}
    </div>
  );
}
