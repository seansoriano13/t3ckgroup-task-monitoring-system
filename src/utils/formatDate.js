export const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const toLocalDatetimeString = (isoString) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date)) return "";
  const pad = (n) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const getCurrentLocalTime = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
};

export const formatTaskDateTime = (val) => {
  if (!val) return null;
  try {
    const d = new Date(val);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return val;
  }
};

export const formatDueDate = (val) => {
  if (!val) return null;
  try {
    const d = new Date(val);
    const options = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };

    // Only show time if it's NOT exactly 12:00 AM (00:00)
    if (d.getHours() !== 0 || d.getMinutes() !== 0) {
      options.hour = "numeric";
      options.minute = "2-digit";
      options.hour12 = true;
    }

    return d.toLocaleString("en-US", options);
  } catch {
    return val;
  }
};
