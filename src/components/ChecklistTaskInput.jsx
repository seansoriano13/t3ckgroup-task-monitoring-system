import React, { useState, useEffect } from "react";
import { Plus, X, GripVertical } from "lucide-react";

export default function ChecklistTaskInput({
  value,
  onChange,
  name = "taskDescription",
}) {
  const [title, setTitle] = useState("");
  const [items, setItems] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Parse JSON on mount
  useEffect(() => {
    try {
      if (value) {
        const trimmed = value.trim();
        if (trimmed.startsWith("[")) {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            setItems(parsed);
            return;
          }
        } else if (trimmed.startsWith("{")) {
          const parsed = JSON.parse(trimmed);
          if (parsed && Array.isArray(parsed.items)) {
            setTitle(parsed.title || "");
            setItems(parsed.items);
            return;
          }
        }
      }
    } catch (e) {
      // Not valid JSON, ignore
    }
    // Starting state
    if (!value && items.length === 0) {
      setItems([{ text: "", checked: false }]);
    }
  }, []); // Only on mount

  const emitChange = (newTitle, newItems) => {
    // If there is no title, we could save it as an array to save space, but an object is consistent
    onChange({
      target: {
        name,
        value: JSON.stringify({ title: newTitle, items: newItems }),
      },
    });
  };

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    emitChange(newTitle, items);
  };

  const handleTextChange = (index, newText) => {
    const newItems = [...items];
    newItems[index].text = newText;
    setItems(newItems);
    emitChange(title, newItems);
  };

  const addItem = () => {
    const newItems = [...items, { text: "", checked: false }];
    setItems(newItems);
    emitChange(title, newItems);
  };

  const removeItem = (index) => {
    if (items.length === 1) return; // Always keep at least 1
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    emitChange(title, newItems);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // Set transparent drag image or basic format
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newItems = [...items];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, draggedItem);

    setItems(newItems);
    emitChange(title, newItems);
    setDraggedIndex(null);
  };

  // Detect Paste with Newlines to Auto-Populate multiple items
  const handlePaste = (e, index) => {
    const paste = (e.clipboardData || window.clipboardData).getData("text");
    if (paste && paste.includes("\n")) {
      e.preventDefault();
      const lines = paste.split(/\r?\n/).filter((line) => line.trim() !== "");

      if (lines.length > 0) {
        const newItems = [...items];
        // Replace the current item with the first pasted line
        newItems[index].text = lines[0];

        // Add the rest of the lines as new items
        const additionalItems = lines.slice(1).map((line) => ({
          text: line.trim(),
          checked: false,
        }));

        newItems.splice(index + 1, 0, ...additionalItems);
        setItems(newItems);
        emitChange(title, newItems);
      }
    }
  };

  return (
    <div className="bg-gray-1 border border-gray-4 rounded-lg p-3 space-y-4">
      <div className="border-b border-gray-3 pb-3">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Checklist Title (Optional)"
          className="w-full bg-transparent border-none outline-none font-bold text-sm text-gray-12 placeholder:text-gray-9"
        />
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            className={`flex items-center gap-2 group transition-all rounded p-1 ${
              draggedIndex === index ? "opacity-50" : "hover:bg-gray-2"
            }`}
          >
            <span className="text-gray-6 cursor-grab active:cursor-grabbing opacity-50 group-hover:opacity-100 flex-shrink-0 p-1 hover:bg-gray-4 rounded">
              <GripVertical size={16} />
            </span>
            <div className="w-4 h-4 border border-gray-5 rounded-sm flex-shrink-0 bg-gray-2" />
            <input
              type="text"
              value={item.text}
              onChange={(e) => handleTextChange(index, e.target.value)}
              onPaste={(e) => handlePaste(e, index)}
              placeholder="Task detail..."
              className="flex-1 bg-transparent border-b border-transparent focus:border-red-9 outline-none text-gray-12 text-sm py-1 transition-colors"
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="text-gray-6 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1 rounded hover:bg-gray-3"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-gray-3">
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-9 hover:text-primary transition-colors py-1 px-2 rounded hover:bg-gray-2"
          >
            <Plus size={14} /> Add Item
          </button>
          <span className="text-[10px] text-gray-8 italic pr-2">
            Tip: Standard paste or Drag-and-drop support enabled.
          </span>
        </div>
      </div>
    </div>
  );
}
