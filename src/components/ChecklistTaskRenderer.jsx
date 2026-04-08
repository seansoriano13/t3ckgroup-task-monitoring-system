import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

export default function ChecklistTaskRenderer({ description, onInlineCheck, isOwner, disabled }) {
  const [title, setTitle] = useState("");
  const [items, setItems] = useState([]);
  const [isJson, setIsJson] = useState(false);
  const [isObjectFormat, setIsObjectFormat] = useState(false);

  useEffect(() => {
    if (!description) {
      setItems([]);
      setTitle("");
      return;
    }

    try {
      const trimmed = description.trim();
      if (trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          setItems(parsed);
          setIsJson(true);
          setIsObjectFormat(false);
          return;
        }
      } else if (trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);
        if (parsed && Array.isArray(parsed.items)) {
          setTitle(parsed.title || "");
          setItems(parsed.items);
          setIsJson(true);
          setIsObjectFormat(true);
          return;
        }
      }
    } catch (e) {
      // Fallback
    }

    setIsJson(false);
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
       <div className="bg-gray-1 p-5 rounded-xl border border-transparent text-gray-12 leading-relaxed text-sm whitespace-pre-wrap">
          {description}
       </div>
     );
  }

  return (
    <div className="bg-gray-1 p-4 rounded-xl border border-gray-4 text-gray-12 text-sm leading-relaxed whitespace-pre-wrap space-y-3 shadow-inner">
      {title && (
         <div className="pb-2 border-b border-gray-3 mb-2">
            <h4 className="font-bold text-gray-12">{title}</h4>
         </div>
      )}
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className={`flex items-start gap-3 py-1.5 transition-opacity ${item.checked ? 'opacity-60 hover:opacity-100' : ''}`}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCheck(i);
              }}
              disabled={disabled || !isOwner}
              className={`mt-0.5 shrink-0 transition-transform active:scale-75 disabled:cursor-not-allowed`}
            >
              {item.checked ? (
                <CheckCircle2 size={18} className="text-green-500" />
              ) : (
                <Circle size={18} className="text-gray-6 hover:text-gray-8 transition-colors hover:scale-110" />
              )}
            </button>
            <span className={`flex-1 min-w-0 ${item.checked ? 'line-through text-gray-8' : 'text-gray-12 font-medium'}`}>
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
