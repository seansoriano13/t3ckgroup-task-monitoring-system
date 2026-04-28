/**
 * notificationRouter.js
 * Centralised deep-link routing logic for notification clicks.
 * Extracted from NotificationDrawer so the component stays lean.
 */

/**
 * @param {object} notif   - The notification object
 * @param {object} user    - The current auth user
 * @param {function} navigate - react-router navigate fn
 * @param {function} onClose  - Drawer close callback
 */
export function handleNotificationRoute(notif, user, navigate, onClose) {
  if (!notif.reference_id && !notif.type.includes("CONQUERED")) return;

  if (notif.type === "COMMITTEE_TASK_COMMENT") {
    navigate("/committee");
    window.dispatchEvent(
      new CustomEvent("OPEN_CHAT_MODAL", {
        detail: {
          entityId: notif.reference_id,
          entityType: "COMMITTEE_TASK",
        },
      }),
    );
  } else if (
    notif.type === "COMMITTEE_ASSIGNED" ||
    notif.type === "COMMITTEE_TASK_READY_FOR_HR"
  ) {
    navigate("/committee");
    window.dispatchEvent(
      new CustomEvent("OPEN_ENTITY_DETAILS", {
        detail: { id: notif.reference_id, type: "COMMITTEE_TASK" },
      }),
    );
  } else if (notif.type.includes("TASK")) {
    const isHrUser = user?.isHr || user?.is_hr;
    const isHeadUser = user?.isHead || user?.is_head;
    const isSA = user?.isSuperAdmin || user?.is_super_admin;

    if (notif.type === "TASK_APPROVED_BY_HEAD" && isHrUser) {
      navigate("/approvals/hr-verification", {
        state: { openTaskId: notif.reference_id },
      });
    } else if (isHeadUser || isSA) {
      navigate("/approvals/tasks", {
        state: { openTaskId: notif.reference_id },
      });
    } else if (isHrUser) {
      navigate("/approvals/hr-verification", {
        state: { openTaskId: notif.reference_id },
      });
    } else {
      navigate("/tasks", { state: { openTaskId: notif.reference_id } });
    }
  } else if (notif.type === "SALES_PLAN_SUBMITTED") {
    const isManagement =
      user?.isSuperAdmin ||
      user?.isHead ||
      user?.is_super_admin ||
      user?.is_head;
    if (isManagement) {
      navigate("/approvals/sales", {
        state: { highlightPlanId: notif.reference_id },
      });
    } else {
      navigate("/sales/schedule");
    }
  } else if (notif.type === "PLAN_AMENDMENT_REQUESTED") {
    navigate("/approvals/sales", {
      state: { highlightPlanId: notif.reference_id },
    });
  } else if (notif.type === "SALES_QUOTA_PUBLISHED") {
    navigate("/");
  } else if (notif.type === "PLAN_AMENDMENT_RESULT") {
    navigate("/sales/schedule", {
      state: { highlightPlanId: notif.reference_id },
    });
  } else if (notif.type === "UNPLANNED_ACTIVITY") {
    navigate("/sales/records", {
      state: { openActivityId: notif.reference_id },
    });
  } else if (
    notif.type === "SALES_DAY_CONQUERED" ||
    notif.type === "SALES_WEEK_CONQUERED"
  ) {
    const date =
      notif.reference_id ||
      (notif.created_at ? notif.created_at.split("T")[0] : null);
    const isManagement =
      user?.isSuperAdmin ||
      user?.isHead ||
      user?.isHr ||
      user?.is_super_admin ||
      user?.is_head ||
      user?.is_hr;
    if (isManagement) {
      navigate("/sales/records", {
        state: {
          eventType: notif.type,
          fallbackDate: date,
          fallbackEmpId: notif.sender_id,
        },
      });
    } else {
      navigate("/sales/daily", { state: { date } });
    }
  } else if (notif.type.includes("REVENUE")) {
    navigate("/sales/records", {
      state: { openRevenueId: notif.reference_id },
    });
  } else if (notif.type === "SALES_EXPENSE_PENDING") {
    const isManagement =
      user?.isSuperAdmin ||
      user?.isHead ||
      user?.is_super_admin ||
      user?.is_head;
    if (isManagement) {
      navigate("/approvals/sales", {
        state: { highlightActivityId: notif.reference_id },
      });
    } else {
      navigate("/approvals/tasks", {
        state: { highlightExpenseId: notif.reference_id },
      });
    }
  } else if (notif.type === "SALES_EXPENSE_PROCESSED") {
    navigate("/sales/daily", {
      state: { highlightActivityId: notif.reference_id },
    });
  } else if (notif.type === "DAY_DELETE_REQUESTED") {
    navigate("/approvals/sales", {
      state: { highlightDeletionDate: notif.reference_id },
    });
  } else if (notif.type === "DAY_DELETE_RESULT") {
    navigate("/sales/daily", { state: { date: notif.reference_id } });
  }

  onClose();
}
