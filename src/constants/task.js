export const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low", dot: "bg-emerald-400" },
  { value: "MEDIUM", label: "Medium", dot: "bg-amber-400" },
  { value: "HIGH", label: "High", dot: "bg-red-400" },
];

export const LOG_TASK_SELECT_STYLES = {
  control: (state) =>
    `min-h-[44px] w-full bg-gray-1 border ${state.isFocused ? "border-gray-6 ring-1 ring-gray-6" : "border-gray-4"} hover:border-gray-5 rounded-lg px-2 shadow-sm transition-all cursor-pointer`,
  menu: () =>
    `mt-1 bg-gray-1 border border-gray-4 rounded-lg shadow-xl overflow-hidden z-[9999] popover-enter`,
  menuList: () => `p-1`,
  option: (state) =>
    `px-3 py-2 cursor-pointer transition-colors rounded-md text-[13px] ${state.isFocused ? "bg-gray-3 text-gray-12" : state.isSelected ? "bg-gray-4 text-gray-12 font-bold" : "text-gray-11 bg-transparent"}`,
  singleValue: () => `text-gray-12 font-semibold text-[13px]`,
  placeholder: () => `text-gray-7 text-[13px]`,
  input: () => `text-gray-12 text-[13px]`,
  indicatorSeparator: () => `hidden`,
  dropdownIndicator: () => `text-gray-8 hover:text-gray-10 p-1`,
  valueContainer: () => `gap-1`,
};
