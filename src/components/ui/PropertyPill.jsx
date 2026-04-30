import React from "react";
import { ChevronDown } from "lucide-react";

/**
 * PropertyPill - A reusable pill-styled component for property selections,
 * mirroring the design in LogTaskModal.
 */
export default function PropertyPill({ 
  children, 
  onClick, 
  isActive, 
  isOpen,
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
      {Icon && <Icon size={13} className={isActive ? "text-violet-9" : "text-muted-foreground"} />}
      <span>{children}</span>
      {!disabled && (
        <ChevronDown 
          size={12} 
          className={`ml-1 transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${isActive ? "text-violet-8" : "text-mauve-7"}`} 
        />
      )}
    </button>
  );
}
