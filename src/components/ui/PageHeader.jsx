import React from "react";

/**
 * Standard Page Header component to ensure visual consistency across all tabs.
 * Supports a title with an optional gradient on the last word, a description,
 * and optional children (actions/buttons) on the right side.
 */
const PageHeader = ({
  title,
  description,
  children,
  showGradient = true,
  className = "",
}) => {
  // Split title to apply gradient to the last part
  const titleWords = title.split(" ");
  const lastWord = titleWords.length > 1 ? titleWords[titleWords.length - 1] : "";
  const firstPart = titleWords.length > 1 ? titleWords.slice(0, -1).join(" ") : title;

  return (
    <div
      className={`flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6 ${className}`}
    >
      <div className="space-y-1">
        <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight flex flex-wrap items-center gap-x-2">
          <span>{firstPart}</span>
          {lastWord && showGradient ? (
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary pr-1">
              {lastWord}
            </span>
          ) : lastWord ? (
            <span>{lastWord}</span>
          ) : null}
        </h1>
        {description && (
          <p className="text-sm md:text-base text-muted-foreground font-medium max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {children}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
