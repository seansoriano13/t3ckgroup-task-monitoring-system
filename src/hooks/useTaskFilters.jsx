import { useMemo } from "react";
import { TASK_STATUS } from "../constants/status";

export function useTaskFilters(rawTasks = [], filters = {}, options = {}) {
  const {
    searchTerm = "",
    statusFilter = "ALL",
    priorityFilter = "ALL",
    hrFilter = "ALL",
    startDate = null,
    endDate = null,
    deptFilter = "ALL",
    subDeptFilter = "ALL",
    employeeFilter = "ALL",
  } = filters;

  const { isManagement = false, allEmployees = [] } = options;

  // --- 1. THE FILTER & SORT ENGINE ---
  const employeeMap = useMemo(() => {
    if (!isManagement || allEmployees.length === 0) return new Map();
    const map = new Map();
    for (const emp of allEmployees) {
      map.set(emp.id, emp);
    }
    return map;
  }, [isManagement, allEmployees]);

  const filteredTasks = useMemo(() => {
    const filtered = rawTasks.filter((task) => {
      if (task.status === "DELETED") return false;

      const desc = task.taskDescription || "";
      const project = task.projectTitle || "";
      const cat = task.categoryId || "";
      const empName = task.loggedByName || "";

      // Search
      const matchesSearch =
        desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.toLowerCase().includes(searchTerm.toLowerCase()) ||
        empName.toLowerCase().includes(searchTerm.toLowerCase());

      // Status Filter Logic
      let matchesStatus = true;
      if (statusFilter !== "ALL") {
        if (statusFilter === "INCOMPLETE") {
          matchesStatus = task.status === TASK_STATUS.INCOMPLETE;
        } else if (statusFilter === "COMPLETE_UNVERIFIED") {
          matchesStatus = task.status === TASK_STATUS.COMPLETE && !task.hrVerified;
        } else if (statusFilter === "COMPLETE_VERIFIED") {
          matchesStatus = task.status === TASK_STATUS.COMPLETE && task.hrVerified;
        } else if (statusFilter === "AWAITING_APPROVAL") {
          matchesStatus = task.status === TASK_STATUS.AWAITING_APPROVAL;
        } else if (statusFilter === "NOT APPROVED") {
          matchesStatus = task.status === TASK_STATUS.NOT_APPROVED;
        }
      }

      const matchesPriority =
        priorityFilter === "ALL" || task.priority === priorityFilter;

      // HR Filter
      let matchesHr = true;
      if (hrFilter === "VERIFIED") matchesHr = task.hrVerified === true;
      if (hrFilter === "PENDING")
        matchesHr = task.status === "COMPLETE" && !task.hrVerified;

      // Date Range
      let matchesDate = true;
      if (startDate && endDate) {
        const taskDate = new Date(task.createdAt);
        const filterStart = new Date(startDate).setHours(0, 0, 0, 0);
        const filterEnd = new Date(endDate).setHours(23, 59, 59, 999);
        matchesDate = taskDate >= filterStart && taskDate <= filterEnd;
      }

      // Hierarchy (Management Only)
      let matchesDept = true,
        matchesSubDept = true,
        matchesEmployee = true;
      if (isManagement) {
        // If allEmployees is still loading, skip hierarchy filters rather than
        // rejecting every task (taskOwner would be undefined for all tasks).
        if (employeeMap.size > 0) {
          const taskOwner = employeeMap.get(task.loggedById);
          if (deptFilter !== "ALL")
            matchesDept = taskOwner?.department === deptFilter;
          if (subDeptFilter !== "ALL")
            // getAllEmployees() maps sub_department → subDepartment (camelCase)
            matchesSubDept = taskOwner?.subDepartment === subDeptFilter;
          if (employeeFilter !== "ALL")
            matchesEmployee = task.loggedById === employeeFilter;
        }
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesHr &&
        matchesDate &&
        matchesDept &&
        matchesSubDept &&
        matchesEmployee
      );
    });

    // Strict Sorting Hierarchy
    return filtered.sort((a, b) => {
      const getStatusRank = (status) => {
        if (status === TASK_STATUS.NOT_APPROVED) return 4;
        if (status === TASK_STATUS.COMPLETE) return 3;
        if (status === TASK_STATUS.AWAITING_APPROVAL) return 2;
        return 1;
      };

      const rankA = getStatusRank(a.status);
      const rankB = getStatusRank(b.status);
      if (rankA !== rankB) return rankA - rankB;

      const priorityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const weightA = priorityWeight[a.priority] || 0;
      const weightB = priorityWeight[b.priority] || 0;
      if (weightA !== weightB) return weightB - weightA;

      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [
    rawTasks,
    searchTerm,
    statusFilter,
    priorityFilter,
    hrFilter,
    startDate,
    endDate,
    deptFilter,
    subDeptFilter,
    employeeFilter,
    employeeMap,
    isManagement,
  ]);

  // --- 2. THE EMPLOYEE DEEP-DIVE STATS ---
  const employeeStats = useMemo(() => {
    // Only calculate stats if a specific employee is selected
    if (employeeFilter === "ALL" || filteredTasks.length === 0) return null;

    const total = filteredTasks.length;
    const completed = filteredTasks.filter(
      (t) => t.status === "COMPLETE",
    ).length;
    const completionRate = Math.round((completed / total) * 100);

    const gradedTasks = filteredTasks.filter((t) => t.grade > 0);
    const avgGrade =
      gradedTasks.length > 0
        ? (
            gradedTasks.reduce((acc, t) => acc + t.grade, 0) /
            gradedTasks.length
          ).toFixed(1)
        : "N/A";

    const pendingHr = filteredTasks.filter(
      (t) => t.status === "COMPLETE" && !t.hrVerified,
    ).length;

    return { total, completionRate, avgGrade, pendingHr };
  }, [filteredTasks, employeeFilter]);

  return { filteredTasks, employeeStats };
}
