export const FieldBox = ({ label, isEditing, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider pl-1">
      {label}
    </label>
    <div
      className={`min-h-[44px] flex items-center w-full bg-gray-1 border ${isEditing ? "border-gray-4 focus-within:border-red-9" : "border-transparent"} rounded-lg transition-colors`}
    >
      {children}
    </div>
  </div>
);
