import React from "react";
import {
  Search,
  Filter,
  Users,
  Calendar as CalendarIcon,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Input } from "@/components/ui/input";
import Dropdown from "./ui/Dropdown";
import { FilterTrigger, FilterOptionList } from "./ui/FilterDropdown";

export default function CommitteeTaskFilters({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  creatorFilter,
  setCreatorFilter,
  dueDate,
  setDueDate,
  uniqueCreators = [],
}) {
  const isAnyFilterActive =
    statusFilter !== "ALL" ||
    creatorFilter !== "ALL" ||
    dueDate !== null ||
    searchTerm !== "";

  const handleClearAll = () => {
    setSearchTerm("");
    if (setStatusFilter) setStatusFilter("ALL");
    if (setCreatorFilter) setCreatorFilter("ALL");
    if (setDueDate) setDueDate(null);
  };

  const statusOptions = [
    { value: "ALL", label: "Status: All" },
    { value: "ACTIVE", label: "Status: Active" },
    { value: "COMPLETED", label: "Status: Completed" },
  ];

  const creatorOptions = [
    { value: "ALL", label: "Creator: Everyone" },
    ...uniqueCreators.map((c) => ({ value: c.id, label: `Creator: ${c.name}` })),
  ];

  const currentStatusLabel =
    statusOptions.find((o) => o.value === statusFilter)?.label ||
    statusOptions[0].label;

  const currentCreatorLabel =
    creatorOptions.find((o) => o.value === creatorFilter)?.label ||
    creatorOptions[0].label;

  return (
    <div className="bg-card border border-border p-3 md:p-4 rounded-xl shadow-sm relative z-30">
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3">
        {/* Search */}
        <div className="relative flex-[2] min-w-0">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <Input
            type="text"
            placeholder="Search tasks, creators, or members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 block h-[40px] md:h-[46px]"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2 flex-[3]">
          {/* Status Dropdown */}
          <Dropdown
            className="flex-1 min-w-[140px]"
            popoverClassName="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-[50] min-w-full popover-enter"
            trigger={({ isOpen }) => (
              <FilterTrigger
                label={currentStatusLabel}
                isActive={statusFilter !== "ALL"}
                isOpen={isOpen}
                icon={Filter}
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

          {/* Creator Dropdown */}
          <Dropdown
            className="flex-1 min-w-[180px]"
            popoverClassName="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-[50] min-w-full max-h-[300px] overflow-y-auto popover-enter"
            trigger={({ isOpen }) => (
              <FilterTrigger
                label={currentCreatorLabel}
                isActive={creatorFilter !== "ALL"}
                isOpen={isOpen}
                icon={Users}
              />
            )}
          >
            {({ close }) => (
              <FilterOptionList
                options={creatorOptions}
                value={creatorFilter}
                onChange={setCreatorFilter}
                close={close}
              />
            )}
          </Dropdown>

          {/* Due Date Picker */}
          <div
            className={`bg-card flex items-center border rounded-lg px-3 py-2.5 h-[40px] md:h-[46px] shadow-sm transition-colors shrink-0 flex-1 min-w-[150px] ${
              dueDate
                ? "text-foreground border-primary/20 font-medium"
                : "border-border hover:border-border/80 text-foreground"
            }`}
          >
            <CalendarIcon
              size={16}
              className={`${dueDate ? "text-foreground" : "text-muted-foreground"} mr-2 shrink-0`}
            />
            <DatePicker
              selected={dueDate}
              onChange={(date) => setDueDate(date)}
              isClearable={true}
              placeholderText="Due Date"
              className={`bg-transparent outline-none w-full text-[13px] cursor-pointer ${
                dueDate
                  ? "text-foreground placeholder:text-muted-foreground font-medium"
                  : "text-foreground placeholder:text-muted-foreground"
              }`}
            />
          </div>

          {/* Clear All */}
          {isAnyFilterActive && (
            <button
              onClick={handleClearAll}
              className="text-xs text-muted-foreground hover:text-foreground font-semibold px-2 py-2 shrink-0 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
