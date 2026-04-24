import { logTaskSelectClassNames } from "../styles/selectStyles";

export const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low", dot: "bg-green-8" },
  { value: "MEDIUM", label: "Medium", dot: "bg-amber-400" },
  { value: "HIGH", label: "High", dot: "bg-red-400" },
];

export const LOG_TASK_SELECT_STYLES = logTaskSelectClassNames;
