export const formatTaskPreview = (description) => {
  if (!description) return "";
  
  if (typeof description !== 'string') {
    if (Array.isArray(description)) {
      return `Checklist: ${description.length} Items`;
    } else if (description && Array.isArray(description.items)) {
      return description.title 
        ? `${description.title} (${description.items.length} Items)` 
        : `Checklist: ${description.items.length} Items`;
    }
    return String(description);
  }

  const trimmed = description.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return `Checklist: ${parsed.length} Items`;
      }
    } catch (e) {
      // Not valid JSON
    }
  } else if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && Array.isArray(parsed.items)) {
        return parsed.title 
          ? `${parsed.title} (${parsed.items.length} Items)` 
          : `Checklist: ${parsed.items.length} Items`;
      }
    } catch (e) {
      // Not valid JSON
    }
  }

  return description;
};
