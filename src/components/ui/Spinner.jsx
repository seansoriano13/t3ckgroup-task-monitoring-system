import { cn } from "../../lib/utils";

export default function Spinner({
  size = "md",
  className,
  text = null,
  fullScreen = false,
}) {
  const sizeMap = {
    sm: "w-5 h-5 border-2",
    md: "w-10 h-10 border-[3px]",
    lg: "w-16 h-16 border-[4px]",
    xl: "w-24 h-24 border-[5px]",
  };

  const currentSize = sizeMap[size] || sizeMap.md;
  const classes = currentSize.split(" ");
  const borderClass = classes[2];
  const dimensionClasses = `${classes[0]} ${classes[1]}`;

  const spinnerContent = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        className,
      )}
    >
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full",
          dimensionClasses,
        )}
      >
        {/* Embossed Track Base */}
        <div
          className={cn(
            "absolute inset-0 rounded-full border-mauve-3/80 bg-transparent",
            "shadow-[inset_0_1px_2px_rgba(0,0,0,0.06),_0_1px_1px_rgba(255,255,255,0.7)]",
            borderClass,
          )}
        />

        {/* Minimalist Spinning Indicator */}
        <div
          className={cn(
            "absolute inset-0 rounded-full border-transparent border-t-mauve-9 border-r-mauve-9/20 animate-spin",
            borderClass,
          )}
        />
      </div>

      {/* Optional Loading Text */}
      {text && (
        <span className="text-[11px] font-semibold text-mauve-10 uppercase tracking-[0.15em]">
          {text}
        </span>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-9999 flex items-center justify-center bg-mauve-1/60 backdrop-blur-sm dropdown-backdrop">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
}
