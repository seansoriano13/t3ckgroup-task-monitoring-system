import React, { useState, useEffect } from "react";
import { CheckCircle2, Circle } from "lucide-react";

export default function ChecklistTaskRenderer({
  description,
  onInlineCheck,
  isOwner,
  disabled,
}) {
  const [title, setTitle] = useState("");
  const [items, setItems] = useState([]);
  const [isJson, setIsJson] = useState(false);
  const [isObjectFormat, setIsObjectFormat] = useState(false);

  useEffect(() => {
    if (!description) {
      queueMicrotask(() => {
        setItems([]);
        setTitle("");
      });
      return;
    }

    try {
      const trimmed = description.trim();
      if (trimmed.startsWith("[")) {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          queueMicrotask(() => {
            setItems(parsed);
            setIsJson(true);
            setIsObjectFormat(false);
          });
          return;
        }
      } else if (trimmed.startsWith("{")) {
        const parsed = JSON.parse(trimmed);
        if (parsed && Array.isArray(parsed.items)) {
          queueMicrotask(() => {
            setTitle(parsed.title || "");
            setItems(parsed.items);
            setIsJson(true);
            setIsObjectFormat(true);
          });
          return;
        }
      }
    } catch (e) {
      console.error(e);
    }

    queueMicrotask(() => setIsJson(false));
  }, [description]);

  const handleCheck = (indexToToggle) => {
    if (disabled || !isOwner) return;
    if (!isJson) return; // Cannot inline-check legacy plaintext

    const newItems = items.map((item, i) => {
      if (i === indexToToggle) {
        return { ...item, checked: !item.checked };
      }
      return item;
    });

    setItems(newItems); // Optimistic UI update

    // Save backwards compatible to the format they originally used
    if (isObjectFormat) {
      onInlineCheck(JSON.stringify({ title, items: newItems }));
    } else {
      onInlineCheck(JSON.stringify(newItems));
    }
  };

  if (!isJson) {
    return (
      <div className="bg-muted/30 p-6 rounded-2xl border border-border text-foreground leading-relaxed text-[15px] whitespace-pre-wrap shadow-sm">
        {description}
      </div>
    );
  }

  return (
    <>
      {title && (
        <div className="pb-3 border-b border-border/50 mb-3">
          <h4 className="font-extrabold text-foreground uppercase tracking-wider text-[11px]">
            {title}
          </h4>
        </div>
      )}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div
            key={i}
            className={`flex items-start gap-4 py-2 px-3 rounded-xl transition-all duration-300 border border-transparent ${item.checked ? "bg-muted/20 opacity-60" : "bg-card shadow-sm border-border/10 hover:border-border/50"}`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCheck(i);
              }}
              disabled={disabled || !isOwner}
              className={`mt-1 shrink-0 transition-all duration-300 active:scale-75 disabled:cursor-not-allowed`}
            >
              {item.checked ? (
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200">
                  <CheckCircle2 size={12} className="text-white" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-slate-200 bg-card hover:border-indigo-400 hover:scale-110 transition-all" />
              )}
            </button>
            <span
              className={`flex-1 min-w-0 font-medium ${item.checked ? "line-through text-slate-400" : "text-slate-700"}`}
            >
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
