import React, { useState, useRef, useEffect, forwardRef } from "react";
import { createPortal } from "react-dom";

const   Dropdown = forwardRef(
  (
    {
      trigger,
      children,
      isOpen: controlledIsOpen,
      onToggle,
      onClose,
      className = "",
      popoverClassName = "absolute top-full left-0 mt-1.5 bg-muted border border-border rounded-xl shadow-2xl z-[110] popover-enter",
      placement = "bottom-start", // bottom-start, bottom-end, etc.
      disabled = false,
      usePortal = false,
    },
    ref,
  ) => {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const [coords, setCoords] = useState(null);
    const dropdownRef = useRef(null);
    const popoverRef = useRef(null);

    const isControlled = controlledIsOpen !== undefined;
    const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

    const handleToggle = (e) => {
      if (disabled) return;
      if (e) {
        e.stopPropagation();
      }

      if (isControlled) {
        if (onToggle) onToggle();
      } else {
        setInternalIsOpen((prev) => !prev);
        if (onToggle && !internalIsOpen) onToggle();
      }
    };

    const updateCoords = () => {
      if (dropdownRef.current && isOpen && usePortal) {
        const rect = dropdownRef.current.getBoundingClientRect();
        setCoords({
          left: rect.left + window.scrollX,
          top: rect.bottom + window.scrollY,
          rectTop: rect.top + window.scrollY,
          width: rect.width,
          right: window.innerWidth - rect.right - window.scrollX,
          windowHeight: document.documentElement.scrollHeight,
        });
      }
    };

    useEffect(() => {
      updateCoords();
      if (isOpen && usePortal) {
        // Reposition on window resize
        window.addEventListener("resize", updateCoords);
        // Optional: hide or reposition on scroll
        const handleScroll = (e) => {
          // If clicking inside the popover causes scroll, ignore it
          if (e.target.closest?.(".popover-enter")) return;
          updateCoords();
        };
        // use capture phase to catch scrolls on inner elements like overflow-x-auto
        window.addEventListener("scroll", handleScroll, true);
        return () => {
          window.removeEventListener("resize", updateCoords);
          window.removeEventListener("scroll", handleScroll, true);
        };
      }
    }, [isOpen, usePortal]);

    useEffect(() => {
      const handleClickOutside = (event) => {
        // Don't close if it's disabled or not open
        if (!isOpen || disabled) return;

        // If we clicked inside the dropdown, do nothing wrapper
        if (dropdownRef.current && dropdownRef.current.contains(event.target)) {
          return;
        }

        // If we clicked inside the portal popover, do nothing
        if (popoverRef.current && popoverRef.current.contains(event.target)) {
          return;
        }

        // Close dropdown
        if (isControlled) {
          if (onClose) onClose();
        } else {
          setInternalIsOpen(false);
          if (onClose) onClose();
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
    }, [isOpen, isControlled, onClose, disabled]);

    // Adjust placement class if customized
    let placementClass = "";
    if (placement === "bottom-end") {
      placementClass = "right-0";
    } else if (placement === "bottom-start") {
      placementClass = "left-0";
    }

    return (
      <div
        className={`relative ${className}`}
        ref={(node) => {
          dropdownRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
      >
        <div
          onClick={handleToggle}
          className={`w-full ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
        >
          {typeof trigger === "function"
            ? trigger({ isOpen, disabled })
            : trigger}
        </div>

        {isOpen &&
          (usePortal ? (
            createPortal(
              <div
                ref={popoverRef}
                className={`${popoverClassName}`}
                style={{
                  position: "absolute",
                  top: placement.startsWith("top")
                    ? undefined
                    : coords?.top
                      ? coords.top + 6
                      : 0,
                  bottom: placement.startsWith("top")
                    ? coords
                      ? coords.windowHeight - coords.rectTop + 6
                      : 0
                    : undefined,
                  // Respect placement
                  ...(placement.endsWith("end")
                    ? { right: coords?.right, left: "auto" }
                    : { left: coords?.left, right: "auto" }),
                  minWidth: coords?.width,
                }}
              >
                {typeof children === "function"
                  ? children({
                      close: () =>
                        isControlled ? onClose?.() : setInternalIsOpen(false),
                    })
                  : children}
              </div>,
              document.body,
            )
          ) : (
            <div
              ref={popoverRef}
              className={`${popoverClassName} ${placementClass}`}
            >
              {typeof children === "function"
                ? children({
                    close: () =>
                      isControlled ? onClose?.() : setInternalIsOpen(false),
                  })
                : children}
            </div>
          ))}
      </div>
    );
  },
);

Dropdown.displayName = "Dropdown";

export default Dropdown;
