import React, { useState } from "react";
import {
  Search,
  Filter,
  Users,
  Calendar as CalendarIcon,
  SlidersHorizontal,
  ChevronDown,
  Activity,
  FileText,
  CheckCircle2,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Dropdown from "./ui/Dropdown";

// Shared styled trigger for custom dropdowns
function FilterTrigger({ label, isActive, isOpen, icon: Icon }) {
  return (
    <div
      className={`h-[40px] md:h-[46px] w-full flex items-center justify-between px-3 rounded-lg border transition-all cursor-pointer ${isOpen
        ? "border-primary/50 ring-1 ring-primary/20 bg-card"
        : isActive
          ? "border-primary/20 font-medium"
          : "border-border hover:border-border/80"
        }`}
    >
      <div className="flex items-center gap-2 overflow-hidden flex-1">
        {Icon && (
          <Icon size={14} className={`shrink-0 ${isActive ? 'text-foreground' : 'text-slate-400'}`} />
        )}
        <span className="text-[13px] text-foreground font-[500] truncate block w-full text-left">
          {label}
        </span>
      </div>
      <ChevronDown
        size={14}
        className={`ml-1 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""
          }`}
      />
    </div>
  );
}

// Shared popover option list
function FilterOptionList({ options, value, onChange, close }) {
  return (
    <div className="p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(opt.value);
            close();
          }}
          className={`w-full text-left px-3 py-2 rounded-md text-[13px] transition-colors font-medium ${value === opt.value
            ? "bg-slate-200 text-foreground font-bold"
            : "text-muted-foreground hover:bg-muted/80"
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

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
  showDateFilter = null,
  filterRecordType = "ALL",
  setFilterRecordType = () => { },
  sortBy,
  setSortBy,
}) {
  const [showAdvanced, setShowAdvanced] = useState(
    (canViewAllSales ? filterEmp !== "ALL" : filterEmp !== user?.id) ||
    filterStatus !== "ALL" ||
    (activeTab === "ACTIVITIES" && filterType !== "ALL") ||
    (activeTab === "REVENUE" && filterRecordType !== "ALL")
  );

  const shouldShowDateFilter =
    showDateFilter !== null
      ? showDateFilter
      : viewMode === "BOARD" || activeTab === "REVENUE";

  const isAnyFilterActive =
    (canViewAllSales ? filterEmp !== "ALL" : filterEmp !== user?.id) ||
    filterStatus !== "ALL" ||
    (activeTab === "ACTIVITIES" && filterType !== "ALL") ||
    (activeTab === "REVENUE" && filterRecordType !== "ALL") ||
    selectedDateFilter !== "" ||
    searchTerm !== "";

  const handleClearAll = () => {
    setSearchTerm("");
    setSelectedDateFilter("");
    if (canViewAllSales) setFilterEmp("ALL");
    setFilterStatus("ALL");
    if (activeTab === "ACTIVITIES") setFilterType("ALL");
    if (activeTab === "REVENUE") setFilterRecordType("ALL");
  };

  const timeframeOptions = [
    { value: "DAILY", label: "Daily" },
    { value: "WEEKLY", label: "Weekly" },
    { value: "MONTHLY", label: "Monthly" },
    { value: "YEARLY", label: "Yearly" },
  ];

  const empOptions = [
    ...(canViewAllSales ? [{ value: "ALL", label: "All Representatives" }] : [{ value: user?.id, label: "My Records" }]),
    ...(canViewAllSales ? uniqueEmployees.map((emp) => ({ value: emp.id, label: emp.name })) : []),
  ];

  const statusOptions =
    activeTab === "ACTIVITIES"
      ? [
        { value: "ALL", label: "All Statuses" },
        { value: "INCOMPLETE", label: "Planned / Incomplete" },
        { value: "APPROVED", label: "Approved / Completed" },
        { value: "PENDING", label: "Pending Expense Approval" },
      ]
      : [
        { value: "ALL", label: "All Statuses" },
        { value: "APPROVED", label: "Completed" },
        { value: "INCOMPLETE", label: "Lost" },
        ...(isVerificationEnforced
          ? [{ value: "UNVERIFIED", label: "Pending Verification" }]
          : []),
      ];

  const typeOptions = [
    { value: "ALL", label: "All Activity Types" },
    { value: "Sales Call", label: "Sales Call" },
    { value: "In-House", label: "In-House" },
    { value: "None", label: "Blank / None" },
  ];

  const recordTypeOptions = [
    { value: "ALL", label: "All Record Types" },
    { value: "SALES_ORDER", label: "Sales Orders" },
    { value: "SALES_QUOTATION", label: "Quotations" },
  ];

  const sortOptions = [
    { value: "NEWEST", label: "Newest first" },
    { value: "OLDEST", label: "Oldest first" },
    { value: "NAME", label: "By name" },
  ];

  const currentEmpLabel = empOptions.find((o) => o.value === (canViewAllSales ? filterEmp : user?.id))?.label || "All Representatives";
  const currentStatusLabel = statusOptions.find((o) => o.value === filterStatus)?.label || "All Statuses";
  const currentTypeLabel = typeOptions.find((o) => o.value === filterType)?.label || "All Activity Types";
  const currentRecordTypeLabel = recordTypeOptions.find((o) => o.value === filterRecordType)?.label || "All Record Types";
  const currentSortLabel = sortOptions.find((o) => o.value === sortBy)?.label || "Newest first";
  const currentTimeframeLabel = timeframeOptions.find((o) => o.value === timeframe)?.label || "Daily";

  return (
    <div className="grid gap-3 md:gap-4">
      {/* Row 1: Search & Permanent Filters */}
      <div className="bg-white border border-[#E5E7EB] p-3 md:p-4 rounded-xl flex flex-col xl:flex-row items-stretch xl:items-center gap-3 md:gap-4 relative z-20">

        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input
            type="text"
            placeholder={
              activeTab === "ACTIVITIES"
                ? "Search accounts, names, or remarks..."
                : "Search accounts, products, or reps..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 block h-[40px] md:h-[46px]"
          />
        </div>

        {/* Action Group */}
        <div className="flex items-center gap-2 w-full xl:w-auto flex-wrap justify-between xl:justify-start relative z-10">
          <div className="flex gap-2 items-center flex-wrap">

            {/* DATE PICKER */}
            {shouldShowDateFilter && (
              <div
                className={`bg-card  flex items-center border rounded-lg h-[40px] md:h-[46px] shadow-sm transition-colors shrink-0 ${selectedDateFilter
                  ? "text-foreground border-primary/20 font-medium"
                  : "border-border hover:border-border/80 text-foreground"
                  }`}
              >
                {/* Timeframe Dropdown inside DatePicker wrapper */}
                <Dropdown
                  usePortal={true}
                  className="h-full border-r border-border flex-center"
                  popoverClassName="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-[50] min-w-[120px] popover-enter p-1"
                  trigger={({ isOpen }) => (
                    <div className="flex items-center px-3 gap-1.5 cursor-pointer hover:bg-muted/60 transition-colors h-full rounded-l-lg">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-foreground">
                        {currentTimeframeLabel}
                      </span>
                      <ChevronDown
                        size={10}
                        className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </div>
                  )}
                >
                  {({ close }) => (
                    <FilterOptionList
                      options={timeframeOptions}
                      value={timeframe}
                      onChange={(val) => {
                        setTimeframe(val);
                        const today = new Date();
                        const y = today.getFullYear();
                        const m = String(today.getMonth() + 1).padStart(2, "0");
                        const d = String(today.getDate()).padStart(2, "0");
                        if (val === "YEARLY") {
                          setSelectedDateFilter(`${y}`);
                        } else if (val === "MONTHLY") {
                          setSelectedDateFilter(`${y}-${m}`);
                        } else {
                          setSelectedDateFilter(`${y}-${m}-${d}`);
                        }
                      }}
                      close={close}
                    />
                  )}
                </Dropdown>

                <div className="relative flex items-center px-2">
                  <CalendarIcon size={14} className={`${selectedDateFilter ? "text-foreground" : "text-slate-400"} mr-2 shrink-0`} />
                  <DatePicker
                    selected={selectedDateFilter ? new Date(selectedDateFilter) : null}
                    onChange={(date) => {
                      if (!date) { setSelectedDateFilter(""); return; }
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
                      timeframe === "YEARLY" ? "yyyy" : timeframe === "MONTHLY" ? "MMMM yyyy" : "MMM d, yyyy"
                    }
                    isClearable={true}
                    portalId="root"
                    placeholderText={
                      timeframe === "YEARLY" ? "Select Year" : timeframe === "MONTHLY" ? "Select Month" : "Select Date"
                    }
                    className={`bg-transparent outline-none w-[110px] text-[13px] cursor-pointer ${selectedDateFilter ? "text-foreground placeholder:text-slate-400 font-medium" : "text-foreground placeholder:text-slate-400"
                      }`}
                  />
                </div>
              </div>
            )}

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
              className="ml-auto xl:ml-2 text-sm text-slate-400 hover:text-black font-semibold px-3 py-2 shrink-0 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Advanced Filters */}
      {showAdvanced && (
        <div className="bg-gray-50 border border-[#E5E7EB] p-4 rounded-xl flex flex-wrap gap-3 relative z-10 animate-in fade-in slide-in-from-top-2 duration-200">

          {/* Status Filter */}
          <Dropdown
            className="flex-1 min-w-[170px]"
            popoverClassName="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-[50] min-w-full popover-enter"
            trigger={({ isOpen }) => (
              <FilterTrigger
                label={currentStatusLabel}
                isActive={filterStatus !== "ALL"}
                isOpen={isOpen}
                icon={CheckCircle2}
              />
            )}
          >
            {({ close }) => (
              <FilterOptionList
                options={statusOptions}
                value={filterStatus}
                onChange={setFilterStatus}
                close={close}
              />
            )}
          </Dropdown>

          {/* Employee Filter */}
          <Dropdown
            className="flex-1 min-w-[180px]"
            popoverClassName="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-[50] min-w-full popover-enter max-h-[300px] overflow-y-auto"
            disabled={!canViewAllSales}
            trigger={({ isOpen, disabled }) => (
              <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
                <FilterTrigger
                  label={currentEmpLabel}
                  isActive={canViewAllSales && filterEmp !== "ALL"}
                  isOpen={isOpen}
                  icon={Users}
                />
              </div>
            )}
          >
            {({ close }) =>
              canViewAllSales ? (
                <FilterOptionList
                  options={empOptions}
                  value={filterEmp}
                  onChange={setFilterEmp}
                  close={close}
                />
              ) : null
            }
          </Dropdown>

          {/* Activity Type Filter */}
          {activeTab === "ACTIVITIES" && (
            <Dropdown
              className="flex-1 min-w-[170px]"
              popoverClassName="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-[50] min-w-full popover-enter"
              trigger={({ isOpen }) => (
                <FilterTrigger
                  label={currentTypeLabel}
                  isActive={filterType !== "ALL"}
                  isOpen={isOpen}
                  icon={Activity}
                />
              )}
            >
              {({ close }) => (
                <FilterOptionList
                  options={typeOptions}
                  value={filterType}
                  onChange={setFilterType}
                  close={close}
                />
              )}
            </Dropdown>
          )}

          {/* Record Type Filter */}
          {activeTab === "REVENUE" && (
            <Dropdown
              className="flex-1 min-w-[170px]"
              popoverClassName="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-[50] min-w-full popover-enter"
              trigger={({ isOpen }) => (
                <FilterTrigger
                  label={currentRecordTypeLabel}
                  isActive={filterRecordType !== "ALL"}
                  isOpen={isOpen}
                  icon={FileText}
                />
              )}
            >
              {({ close }) => (
                <FilterOptionList
                  options={recordTypeOptions}
                  value={filterRecordType}
                  onChange={setFilterRecordType}
                  close={close}
                />
              )}
            </Dropdown>
          )}
        </div>
      )}
    </div>
  );
}
