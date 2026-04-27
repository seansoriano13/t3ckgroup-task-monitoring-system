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
    } catch {
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
    } catch {
      // Not valid JSON
    }
  }

  return description;
};

export const formatChecklistToString = (description) => {
  if (!description) return "";
  
  if (typeof description !== 'string') {
    if (Array.isArray(description)) {
      return description.map(item => `• ${item.text || 'Task'}`).join('\n');
    } else if (description && Array.isArray(description.items)) {
      const prefix = description.title ? `${description.title}\n` : "";
      return prefix + description.items.map(item => `• ${item.text || 'Task'}`).join('\n');
    }
    return String(description);
  }

  const trimmed = description.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(item => `• ${item.text || 'Task'}`).join('\n');
      }
    } catch {
      // Not valid JSON
    }
  } else if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && Array.isArray(parsed.items)) {
        const prefix = parsed.title ? `${parsed.title}\n` : "";
        return prefix + parsed.items.map(item => `• ${item.text || 'Task'}`).join('\n');
      }
    } catch {
      // Not valid JSON
    }
  }

  return description;
};

export const extractOthersDetailsFromRemarks = (remarks) => {
  if (!remarks || typeof remarks !== "string") return null;
  const trimmed = remarks.trim();

  const globalOthersMatch = trimmed.match(/^\[OTHERS\]\s*(.+)$/i);
  if (globalOthersMatch?.[1]) return globalOthersMatch[1].trim();

  const committeeOthersMatch = trimmed.match(
    /^\[COMMITTEE\s*-\s*OTHERS\]\s*(.+)$/i,
  );
  if (committeeOthersMatch?.[1]) return committeeOthersMatch[1].trim();

  return null;
};

export const isCategoryMetadataRemarks = (remarks) => {
  if (!remarks || typeof remarks !== "string") return false;
  const trimmed = remarks.trim();
  return (
    /^\[OTHERS\]\s+.+$/i.test(trimmed) ||
    /^\[COMMITTEE\s*-\s*OTHERS\]\s+.+$/i.test(trimmed) ||
    /^\[COMMITTEE\s*-\s*[A-Z\s]+\]$/i.test(trimmed)
  );
};
