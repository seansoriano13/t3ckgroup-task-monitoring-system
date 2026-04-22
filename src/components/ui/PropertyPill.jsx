import React from "react";

/**
 * PropertyPill - A reusable pill-styled component for property selections,
 * mirroring the design in LogTaskModal.
 */
export default function PropertyPill({ 
  children, 
  onClick, 
  isActive, 
  disabled, 
  className = "",
  icon: Icon
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`property-pill ${isActive ? "active" : ""} ${disabled ? "static" : ""} ${className}`}
    >
      {Icon && <Icon size={13} className={isActive ? "text-indigo-500" : "text-slate-400"} />}
      {children}
    </button>
  );
}
