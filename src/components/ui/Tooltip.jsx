"use client";

import * as React from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Tooltip component for consistent premium UI hints.
 * 
 * Props:
 *  children  - The trigger element
 *  content   - The tooltip content (string or ReactNode)
 *  side      - "top" | "right" | "bottom" | "left" (default: "top")
 *  align     - "start" | "center" | "end" (default: "center")
 *  className - optional extra classes for the content
 */

export function Tooltip({
  children,
  content,
  side = "top",
  align = "center",
  delay = 300,
  className,
  ...props
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!content) return children;

  return (
    <TooltipPrimitive.Root delay={delay} {...props}>
      <TooltipPrimitive.Trigger render={children} />
      {mounted && (
        <TooltipPrimitive.Portal container={document.body}>
          <TooltipPrimitive.Positioner 
            side={side} 
            align={align} 
            sideOffset={8} 
            className="z-[999999]"
          >
            <TooltipPrimitive.Popup
              className="outline-none"
              render={(popupProps, state) => (
                <AnimatePresence mode="wait">
                  {state.open && (
                    <motion.div
                      {...popupProps}
                      initial={{ opacity: 0, scale: 0.9, y: side === 'top' ? 5 : -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: side === 'top' ? 5 : -5 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className={cn(
                        "z-[999999] overflow-visible rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-bold text-white shadow-2xl select-none max-w-[260px] break-words border border-slate-800",
                        className
                      )}
                    >
                      {content}
                      <TooltipPrimitive.Arrow className="fill-slate-900" />
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            />
          </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
      )}
    </TooltipPrimitive.Root>
  );
}
