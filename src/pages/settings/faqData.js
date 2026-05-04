import {
  BookOpen,
  CheckSquare,
  Users,
  BarChart2,
  ShieldCheck,
  Bell,
  Briefcase,
  ClipboardList,
} from "lucide-react";

// Map icon names ↔ icon components (needed for JSON serialization)
export const ICON_MAP = {
  BookOpen,
  CheckSquare,
  Users,
  BarChart2,
  ShieldCheck,
  Bell,
  Briefcase,
  ClipboardList,
};

export const ICON_NAMES = Object.keys(ICON_MAP);

export const CATEGORY_COLORS = [
  "#2eaadc",
  "#0f7b6c",
  "#9065b0",
  "#cb912f",
  "#d9730d",
  "#e03e3e",
  "#448361",
  "#6e4ff2",
  "#c14f3a",
  "#3a6fc1",
];

export function generateId() {
  return Math.random().toString(36).slice(2, 10);
}
