export function getNextMonday() {
  const date = new Date();
  date.setDate(date.getDate() + ((1 + 7 - date.getDay()) % 7 || 7));
  return date;
}

export function getStartOfWeek(date) {
  let d;
  if (typeof date === "string") {
    const [y, m, day] = date.split("-").map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(date);
  }
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

export function formatDateToYMD(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
