import React, { useState, useMemo } from "react";
import Dropdown from "../ui/Dropdown";
import { Tag, ChevronDown, Search, Check } from "lucide-react";

export default function CategoryDropdown({
  value,
  onChange,
  categories = [],
  isLoading = false,
  disabled = false,
  className = "",
  triggerClassName,
  onResetOthers, // Optional callback to reset things like committeeRole when category changes
}) {
  const [search, setSearch] = useState("");

  const searchedCategories = useMemo(() => {
    if (!search) return categories;
    return categories.filter(
      (cat) =>
        cat.category_id.toLowerCase().includes(search.toLowerCase()) ||
        cat.description?.toLowerCase().includes(search.toLowerCase())
    );
  }, [categories, search]);

  return (
    <Dropdown
      disabled={disabled}
      className={`z-[100] ${className}`}
      popoverClassName="absolute top-full left-0 mt-1.5 bg-muted border border-border rounded-xl shadow-2xl z-[110] w-[280px] popover-enter"
      trigger={({ isOpen }) => (
        <button
          type="button"
          className={
            triggerClassName ||
            `property-pill ${isOpen ? "active" : ""} ${disabled ? "static" : ""}`
          }
        >
          <Tag size={13} className={value ? "text-indigo-500" : "text-slate-400"} />
          <span className={value ? "text-foreground" : "text-gray-7"}>
            {value || "Category"}
            {!value && <span className="text-destructive ml-0.5">*</span>}
          </span>
          {!disabled && (
            <ChevronDown
              size={12}
              className={value ? "text-indigo-400" : "text-gray-7"}
            />
          )}
        </button>
      )}
    >
      {({ close }) => (
        <>
          <div className="p-2 border-b border-gray-3">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-card rounded-lg border border-gray-3">
              <Search size={14} className="text-gray-7 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search categories…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent outline-none text-xs text-foreground placeholder:text-gray-7"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-[260px] overflow-y-auto p-1">
            {searchedCategories.length === 0 ? (
              <p className="text-xs text-gray-7 text-center py-4">
                {isLoading ? "Loading…" : "No categories found"}
              </p>
            ) : (
              searchedCategories.map((cat) => (
                <button
                  key={cat.category_id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onChange) onChange(cat.category_id);
                    if (onResetOthers) onResetOthers();
                    close();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                    value === cat.category_id
                      ? "bg-slate-200 text-foreground font-bold"
                      : "text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <span className="truncate flex-1">
                    <span className="font-semibold">{cat.category_id}</span>
                    <span className="text-slate-400 ml-1.5">
                      — {cat.description}
                    </span>
                  </span>
                  {value === cat.category_id && (
                    <Check
                      size={14}
                      className="text-muted-foreground/80 flex-shrink-0"
                    />
                  )}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </Dropdown>
  );
}
