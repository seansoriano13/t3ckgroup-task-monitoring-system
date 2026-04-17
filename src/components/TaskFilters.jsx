import React, { useState } from "react";
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
import Select, { components } from "react-select";
import { TASK_STATUS } from "../constants/status";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Custom Control Component to render the icon natively inside React-Select
const IconControl = ({ children, ...props }) => {
  const Icon = props.selectProps.icon;
  const isActive = props.hasValue && props.getValue()[0]?.value !== "ALL" && props.getValue()[0]?.value !== "NEWEST";
  
  return (
    <components.Control {...props}>
      {Icon && (
        <span className={`pl-2 pr-1 flex items-center shrink-0 ${isActive ? 'text-foreground' : 'text-slate-400'}`}>
          <Icon size={14} />
        </span>
      )}
      {children}
    </components.Control>
  );
};

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
  disableDeptFilter,
  sortBy,
  setSortBy,
}) {
  const [startDate, endDate] = dateRange || [null, null];
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  // Shared react-select styles based on LogTaskModal
  const getSelectClassNames = (value, defaultVal = "ALL") => {
    const isActive = value && value !== defaultVal;
    return {
      control: (state) =>
        `min-h-[40px] md:min-h-[46px] w-full border ${
          state.isFocused 
            ? "border-primary/50 ring-1 ring-primary/20 bg-card" 
            : isActive
              ? "border-primary/20 bg-muted font-medium"
              : "border-border bg-card"
        } hover:border-border/80 rounded-lg px-2 shadow-sm transition-all cursor-pointer flex items-center`,
      menu: () =>
        `mt-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-[50] min-w-max popover-enter`,
      menuList: () => `p-1`,
      option: (state) =>
        `px-3 py-2 cursor-pointer transition-colors rounded-md text-[13px] ${
          state.isFocused 
            ? "bg-muted/80 text-foreground" 
            : state.isSelected 
              ? "bg-slate-200 text-foreground font-bold" 
              : "text-muted-foreground bg-transparent"
        }`,
      singleValue: () => `text-foreground font-[500] text-[13px]`,
      placeholder: () => `text-slate-400 text-[13px]`,
      input: () => `text-foreground text-[13px]`,
      indicatorSeparator: () => `hidden`,
      dropdownIndicator: () => `text-slate-400 hover:text-muted-foreground/80 p-1`,
      valueContainer: () => `gap-1 px-1`,
    };
  };

  // Option Definitions
  const sortOptions = [
    { value: "NEWEST", label: "Sort: Newest" },
    { value: "OLDEST", label: "Sort: Oldest" },
    { value: "NAME", label: "Sort: By Name" }
  ];

  const statusOptions = [
    { value: "ALL", label: "Status: All" },
    { value: TASK_STATUS.COMPLETE, label: "Complete" },
    { value: TASK_STATUS.AWAITING_APPROVAL, label: "Awaiting Approval" },
    { value: TASK_STATUS.INCOMPLETE, label: "Incomplete" },
    { value: TASK_STATUS.NOT_APPROVED, label: "Not Approved" }
  ];

  const priorityOptions = [
    { value: "ALL", label: "Priority: All" },
    { value: "HIGH", label: "High" },
    { value: "MEDIUM", label: "Medium" },
    { value: "LOW", label: "Low" }
  ];

  const deptOptions = [
    { value: "ALL", label: "Dept: All" },
    ...(!uniqueDepts.includes("SALES") ? [{ value: "SALES", label: "Dept: SALES" }] : []),
    ...uniqueDepts.filter((d) => d !== "ALL").map((d) => ({ value: d, label: `Dept: ${d}` }))
  ];

  const subDeptOptions = [
    { value: "ALL", label: "Sub-Dept: All" },
    ...uniqueSubDepts.filter((s) => s !== "ALL").map((s) => ({ value: s, label: `Sub: ${s}` }))
  ];

  const employeeOptions = [
    { value: "ALL", label: "Member: Everyone" },
    ...uniqueEmployees.map((emp) => ({ value: emp.id, label: emp.name }))
  ];

  return (
    <div className="grid gap-3 md:gap-4">
      {/* Row 1: Search & Permanent Filters */}
      <div className="bg-white border border-[#E5E7EB] p-3 md:p-4 rounded-xl flex flex-col xl:flex-row items-stretch xl:items-center gap-3 md:gap-4 relative z-20">
        
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
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
        <div className="flex items-center gap-2 w-full xl:w-auto overflow-x-auto justify-between xl:justify-start hide-scrollbar">
          <div className="flex gap-2 items-center flex-nowrap">
            
            {/* DATE PICKER */}
            <div className={`flex items-center border rounded-lg px-3 py-2.5 h-[40px] md:h-[46px] shadow-sm transition-colors shrink-0 ${startDate || endDate ? "bg-muted text-foreground border-primary/20 font-medium" : "bg-card border-border hover:border-border/80 text-foreground"}`}>
              <CalendarIcon size={16} className={`${startDate || endDate ? "text-foreground" : "text-slate-400"} mr-2 shrink-0`} />
              <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => setDateRange(update)}
                isClearable={true}
                placeholderText="Date Range"
                className={`bg-transparent outline-none w-[170px] text-[13px] cursor-pointer ${startDate || endDate ? "text-foreground placeholder:text-slate-400 font-medium" : "text-foreground placeholder:text-slate-400"}`}
              />
            </div>

            {/* SORTING */}
            {sortBy !== undefined && setSortBy && (
              <div className="min-w-[150px] shrink-0">
                <Select
                  options={sortOptions}
                  value={sortOptions.find(o => o.value === sortBy) || sortOptions[0]}
                  onChange={(selected) => setSortBy(selected.value)}
                  classNames={getSelectClassNames(sortBy, "NEWEST")}
                  components={{ Control: IconControl }}
                  icon={SlidersHorizontal}
                  isSearchable={false}
                  menuPosition="fixed"
                  unstyled
                />
              </div>
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
              className="ml-auto xl:ml-2 text-sm text-slate-400 hover:text-black font-semibold px-3 py-2 shrink-0 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Advanced Filters (Hidden by Default) */}
      {showAdvanced && (
        <div className="bg-gray-50 border border-[#E5E7EB] p-4 rounded-xl flex flex-wrap gap-3 relative z-10 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Status Filter */}
          {showStatusFilter && (
             <div className="flex-1 min-w-[170px]">
               <Select
                 options={statusOptions}
                 value={statusOptions.find(o => o.value === statusFilter) || statusOptions[0]}
                 onChange={(selected) => setStatusFilter(selected.value)}
                 classNames={getSelectClassNames(statusFilter, "ALL")}
                 components={{ Control: IconControl }}
                 icon={Filter}
                 isSearchable={false}
                 menuPosition="fixed"
                 unstyled
               />
             </div>
          )}

          {/* Priority */}
          <div className="flex-1 min-w-[150px]">
             <Select
               options={priorityOptions}
               value={priorityOptions.find(o => o.value === priorityFilter) || priorityOptions[0]}
               onChange={(selected) => setPriorityFilter(selected.value)}
               classNames={getSelectClassNames(priorityFilter, "ALL")}
               isSearchable={false}
               menuPosition="fixed"
               unstyled
             />
          </div>

          {/* Management specific */}
          {isManagement && (!isHr || hrViewMode === "ALL") && (
            <>
              {/* Dept */}
              <div className="flex-1 min-w-[180px]">
                <Select
                  options={deptOptions}
                  value={deptOptions.find(o => o.value === deptFilter) || deptOptions[0]}
                  onChange={(selected) => {
                    setDeptFilter(selected.value);
                    setSubDeptFilter("ALL");
                  }}
                  isDisabled={disableDeptFilter !== undefined ? disableDeptFilter : !isHr}
                  classNames={getSelectClassNames(deptFilter, "ALL")}
                  components={{ Control: IconControl }}
                  icon={Building2}
                  isSearchable={true}
                  menuPosition="fixed"
                  unstyled
                />
              </div>

              {/* Sub-Dept */}
              <div className="flex-1 min-w-[180px]">
                <Select
                  options={subDeptOptions}
                  value={subDeptOptions.find(o => o.value === subDeptFilter) || subDeptOptions[0]}
                  onChange={(selected) => setSubDeptFilter(selected.value)}
                  isDisabled={deptFilter === "ALL"}
                  classNames={getSelectClassNames(subDeptFilter, "ALL")}
                  components={{ Control: IconControl }}
                  icon={Building2}
                  isSearchable={true}
                  menuPosition="fixed"
                  unstyled
                />
              </div>

              {/* Employees */}
              <div className="flex-1 min-w-[180px]">
                <Select
                  options={employeeOptions}
                  value={employeeOptions.find(o => o.value === employeeFilter) || employeeOptions[0]}
                  onChange={(selected) => setEmployeeFilter(selected.value)}
                  classNames={getSelectClassNames(employeeFilter, "ALL")}
                  components={{ Control: IconControl }}
                  icon={Users}
                  isSearchable={true}
                  menuPosition="fixed"
                  unstyled
                />
              </div>
            </>
          )}

        </div>
      )}
    </div>
  );
}
