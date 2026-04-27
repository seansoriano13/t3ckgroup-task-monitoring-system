import { Navigate } from "react-router";

// /approvals is now split into:
//   /approvals/tasks           → Head/Manager grading queue
//   /approvals/hr-verification → HR-only verification queue
//
// This file acts as a redirect shim for legacy links and nav entries.
export default function ApprovalsRedirect() {
  return <Navigate to="/approvals/tasks" replace />;
}
