import { supabase } from "../lib/supabase.js";
import { notificationService } from "./notificationService.js";
import { storageService } from "./storageService.js";
import { TASK_STATUS } from "../constants/status.js";

export const taskService = {
  // 1. HR/HEAD VIEW: Get everything
  async getAllTasks() {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        `
        *, 
        creator:employees!tasks_logged_by_fk(name, department, sub_department, email, is_super_admin),
        editor:employees!tasks_edited_by_fk(name),
        evaluator:employees!tasks_evaluated_by_fkey(name),
        categories(description)
      `,
      )
      .neq("status", TASK_STATUS.DELETED)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data.map((task) => ({
      id: task.id,
      taskDescription: task.task_description,
      projectTitle: task.project_title || null,
      categoryId: task.category_id,
      categoryDesc: task.categories?.description,
      loggedById: task.logged_by,
      loggedByName: task.creator?.name,
      loggedByEmail: task.creator?.email,
      creator: task.creator,
      editedById: task.edited_by,
      editedByName: task.editor?.name,
      editedAt: task.edited_at,
      evaluatedById: task.evaluated_by,
      evaluatedByName: task.evaluator?.name,
      evaluatedAt: task.evaluated_at,
      startAt: task.start_at,
      endAt: task.end_at,
      status: task.status,
      priority: task.priority,
      remarks: task.remarks,
      hrRemarks: task.hr_remarks,
      grade: task.grade,
      hrVerifiedAt: task.hr_verified_at,
      hrVerified: task.hr_verified,
      attachments: task.attachment_urls || [],
      createdAt: task.created_at,
    }));
  },

  // 2. EMPLOYEE VIEW: Get only tasks logged by the current user
  async getMyTasks(userId) {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        `
        id,
        created_at,
        task_description,
        category_id,
        logged_by,
        edited_by,
        edited_at,
        evaluated_by,
        evaluated_at,
        start_at,
        end_at,
        status,
        priority,
        remarks,
        grade,
        hr_verified,
        hr_remarks,
        hr_verified_at,
        attachment_urls,
        creator:employees!tasks_logged_by_fk(name, department, sub_department, email),
        editor:employees!tasks_edited_by_fk(name),
        evaluator:employees!tasks_evaluated_by_fkey(name), 
        categories(description)
      `,
      )
      .eq("logged_by", userId)
      .neq("status", TASK_STATUS.DELETED)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // console.log("GET MY TASK", data);

    return data.map((task) => ({
      id: task.id,
      taskDescription: task.task_description,
      projectTitle: task.project_title || null,
      categoryId: task.category_id,
      categoryDesc: task.categories?.description,
      loggedById: task.logged_by,
      loggedByName: task.creator?.name,
      creator: task.creator,
      editedById: task.edited_by,
      editedByName: task.editor?.name,
      editedAt: task.edited_at,
      evaluatedById: task.evaluated_by,
      evaluatedByName: task.evaluator?.name,
      evaluatedAt: task.evaluated_at,
      startAt: task.start_at,
      endAt: task.end_at,
      status: task.status,
      priority: task.priority,
      remarks: task.remarks,
      hrRemarks: task.hr_remarks,
      hrVerified: task.hr_verified,
      hrVerifiedAt: task.hr_verified_at,
      grade: task.grade,
      attachments: task.attachment_urls || [],
      createdAt: task.created_at,
    }));
  },

  // 2.5. SINGLE FETCH: Get one task by ID (for deep linking)
  async getTaskById(taskId) {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        `
        *, 
        creator:employees!tasks_logged_by_fk(name, department, sub_department, email, is_super_admin),
        editor:employees!tasks_edited_by_fk(name),
        evaluator:employees!tasks_evaluated_by_fkey(name),
        categories(description)
      `,
      )
      .eq("id", taskId)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      taskDescription: data.task_description,
      projectTitle: data.project_title || null,
      categoryId: data.category_id,
      categoryDesc: data.categories?.description,
      loggedById: data.logged_by,
      loggedByName: data.creator?.name,
      loggedByEmail: data.creator?.email,
      creator: data.creator,
      editedById: data.edited_by,
      editedByName: data.editor?.name,
      editedAt: data.edited_at,
      evaluatedById: data.evaluated_by,
      evaluatedByName: data.evaluator?.name,
      evaluatedAt: data.evaluated_at,
      startAt: data.start_at,
      endAt: data.end_at,
      status: data.status,
      priority: data.priority,
      remarks: data.remarks,
      hrRemarks: data.hr_remarks,
      grade: data.grade,
      hrVerified: data.hr_verified,
      hrVerifiedAt: data.hr_verified_at,
      attachments: data.attachment_urls || [],
      createdAt: data.created_at,
    };
  },

  // 3. CREATE
  async createTask(payload) {
    let initialStatus = TASK_STATUS.INCOMPLETE;
    let hrVerified = false;
    let hrVerifiedAt = null;
    let evaluatedBy = null;
    let evaluatedAt = null;

    if (payload.isAutoVerified) {
      initialStatus = TASK_STATUS.COMPLETE;
      hrVerified = true;
      hrVerifiedAt = new Date().toISOString();
      evaluatedBy = payload.submittedById;
      evaluatedAt = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert([
        {
          task_description: payload.taskDescription,
          project_title: payload.projectTitle || null,
          category_id: payload.categoryId,
          logged_by: payload.loggedById,
          start_at: payload.startAt
            ? new Date(payload.startAt).toISOString()
            : new Date().toISOString(),
          end_at: payload.endAt ? new Date(payload.endAt).toISOString() : null,
          status: initialStatus,
          priority: payload.priority || "LOW",
          remarks: payload.remarks || "",
          hr_verified: hrVerified,
          hr_verified_at: hrVerifiedAt,
          evaluated_by: evaluatedBy,
          evaluated_at: evaluatedAt,
          attachment_urls: payload.attachments || [],
        },
      ])
      .select();

    if (error) throw error;

    // Trigger Notification: New Task Submitted -> Head
    // We need to fetch the creator's department to notify the correct Head
    const { data: creator } = await supabase
      .from("employees")
      .select("name, department, sub_department")
      .eq("id", payload.loggedById)
      .single();
    if (creator) {
      notificationService.notifyHeadByDepartment(
        creator.department,
        creator.sub_department,
        {
          sender_id: payload.submittedById || payload.loggedById,
          type: "NEW_TASK_SUBMITTED",
          title: "New Task Submitted",
          message: `${creator.name} submitted a new task: "${payload.taskDescription}".`,
          reference_id: data[0].id,
        },
      );

      // Special Notification: If someone else (HR/Admin) created this task for the employee
      if (
        payload.submittedById &&
        payload.submittedById !== payload.loggedById
      ) {
        notificationService.createNotification({
          recipient_id: payload.loggedById,
          sender_id: payload.submittedById,
          type: "TASK_ASSIGNED",
          title: "New Task Assigned",
          message: `${payload.submittedByName || "An administrator"} assigned you a new task: "${payload.taskDescription}".`,
          reference_id: data[0].id,
        });
      }
    }

    return data[0];
  },

  // 4. UPDATE (Used for Employee Edits AND Manager Grading)
  async updateTask(taskId, payload) {
    const updateData = {};

    // --- Guard rails for pipeline integrity ---
    // - If HR verification is being applied, the task must be in COMPLETE.
    // - If task is being moved back to INCOMPLETE, HR verification must be cleared.
    // - For COMPLETE/NOT APPROVED transitions, prevent "finalized with no evaluator" if caller didn't provide evaluatedBy.
    if (
      payload?.hrVerified === true &&
      payload?.status !== TASK_STATUS.COMPLETE
    ) {
      payload = { ...payload, status: TASK_STATUS.COMPLETE };
    }

    if (payload?.status === TASK_STATUS.INCOMPLETE) {
      updateData.hr_verified = false;
      updateData.hr_verified_at = null;
      updateData.hr_remarks = "";
    }

    if (payload?.status === TASK_STATUS.NOT_APPROVED) {
      updateData.hr_verified = false;
      updateData.hr_verified_at = null;
      // Preserve existing hr_remarks unless caller explicitly provided hrRemarks.
      if (payload?.hrRemarks !== undefined) {
        updateData.hr_remarks = payload.hrRemarks;
      }
    }

    // If the caller is attempting to transition workflow state, validate it against the current DB state.
    const needsTransitionCheck =
      payload?.status !== undefined || payload?.hrVerified !== undefined;

    let current = null;
    if (needsTransitionCheck) {
      const { data: cur, error: curErr } = await supabase
        .from("tasks")
        .select(
          "status, hr_verified, evaluated_by, logged_by, task_description, creator:employees!tasks_logged_by_fk(name, department, sub_department)",
        )
        .eq("id", taskId)
        .single();
      if (curErr) throw curErr;
      current = cur;
    }

    // Prevent approving/rejecting if the task isn't in the expected pre-state.
    // Head transitions include evaluatedBy; HR transitions do not.
    const isHeadApprove =
      payload?.status === TASK_STATUS.COMPLETE &&
      payload?.evaluatedBy !== undefined;
    const isHeadReject =
      payload?.status === TASK_STATUS.NOT_APPROVED &&
      payload?.evaluatedBy !== undefined;
    const isHrReject =
      payload?.status === TASK_STATUS.NOT_APPROVED &&
      payload?.evaluatedBy === undefined;

    if (isHeadApprove) {
      if (current?.status !== TASK_STATUS.INCOMPLETE && current?.status !== TASK_STATUS.AWAITING_APPROVAL) {
        throw new Error(
          `Invalid pipeline transition: can only approve tasks from INCOMPLETE or AWAITING APPROVAL`,
        );
      }
    }

    if (isHeadReject) {
      if (current?.status !== TASK_STATUS.INCOMPLETE && current?.status !== TASK_STATUS.AWAITING_APPROVAL) {
        throw new Error(
          `Invalid pipeline transition: can only reject tasks from INCOMPLETE or AWAITING APPROVAL`,
        );
      }
    }

    // If a caller tries to move to COMPLETE/NOT APPROVED without head evaluation metadata,
    // only HR should be allowed to do it via hrVerified/hrVerified=false paths.
    if (
      payload?.status === TASK_STATUS.COMPLETE &&
      payload?.evaluatedBy === undefined &&
      payload?.hrVerified !== true &&
      payload?.hrVerified !== false // Allow undo loop!
    ) {
      throw new Error(
        `Invalid pipeline state: status=COMPLETE requires evaluatedBy`,
      );
    }

    if (
      payload?.status === TASK_STATUS.NOT_APPROVED &&
      payload?.evaluatedBy === undefined &&
      payload?.hrVerified !== false
    ) {
      throw new Error(
        `Invalid pipeline state: status=NOT APPROVED requires evaluatedBy`,
      );
    }

    // HR rejection should only happen while the task is currently COMPLETE and unverified.
    if (isHrReject) {
      if (
        current?.status !== TASK_STATUS.COMPLETE ||
        current?.hr_verified !== false
      ) {
        throw new Error(
          `Invalid pipeline transition: HR reject requires status=COMPLETE and hrVerified=false`,
        );
      }
      // HR rejection should not require evaluated_by, since manager evaluation may already exist.
    }

    // Enforce HR verification/undo pre-conditions.
    if (payload?.hrVerified === true) {
      if (
        current?.status !== TASK_STATUS.COMPLETE ||
        current?.hr_verified !== false
      ) {
        throw new Error(
          `Invalid pipeline transition: HR verify requires status=COMPLETE and hrVerified=false`,
        );
      }
      // HR verification depends on head evaluation existing.
      if (current?.evaluated_by == null) {
        throw new Error(
          `Invalid pipeline state: HR verification requires evaluatedBy`,
        );
      }
    }

    // HR undo verification: HR should only be able to "un-verify" when the row is currently verified.
    // Head transitions may also set hrVerified=false, so we distinguish HR undo by absence of evaluatedBy.
    const isHrUndo =
      payload?.hrVerified === false &&
      payload?.status === TASK_STATUS.COMPLETE &&
      payload?.evaluatedBy === undefined;

    if (isHrUndo) {
      if (
        current?.status !== TASK_STATUS.COMPLETE ||
        current?.hr_verified !== true
      ) {
        throw new Error(
          `Invalid pipeline transition: HR undo requires status=COMPLETE and hrVerified=true`,
        );
      }
    }

    // --- IMMUTABILITY GUARD ---
    // If the task is presently verified, block edits to core content fields.
    // (HR undo can still proceed because this check drops if isHrUndo is true,
    // though HR undo payload usually shouldn't touch these anyway).
    if (current?.hr_verified === true && !isHrUndo) {
      const attemptedCoreEdits = [
        payload.taskDescription,
        payload.projectTitle,
        payload.categoryId,
        payload.priority,
        payload.startAt,
        payload.endAt,
        payload.attachments,
      ].some((val) => val !== undefined);

      if (attemptedCoreEdits) {
        throw new Error(
          "Cannot edit core details of a task that has already been verified by HR.",
        );
      }
    }

    // Employee Edit Fields
    if (payload.taskDescription !== undefined)
      updateData.task_description = payload.taskDescription;
    if (payload.projectTitle !== undefined)
      updateData.project_title = payload.projectTitle || null;
    if (payload.categoryId !== undefined)
      updateData.category_id = payload.categoryId;
    if (payload.priority !== undefined) updateData.priority = payload.priority;
    if (payload.startAt !== undefined) {
      updateData.start_at = payload.startAt
        ? new Date(payload.startAt).toISOString()
        : null;
    }
    if (payload.endAt !== undefined) {
      updateData.end_at = payload.endAt
        ? new Date(payload.endAt).toISOString()
        : null;
    }

    // Manager/HR Fields
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.remarks !== undefined) updateData.remarks = payload.remarks;
    if (payload.grade !== undefined) updateData.grade = payload.grade;
    if (payload.hrVerified !== undefined) {
      updateData.hr_verified = payload.hrVerified;
      updateData.hr_verified_at = payload.hrVerified
        ? new Date().toISOString()
        : null;
    }

    if (payload.evaluatedBy !== undefined) {
      updateData.evaluated_by = payload.evaluatedBy;
      updateData.evaluated_at = new Date().toISOString();
    }

    if (payload.hrRemarks !== undefined)
      updateData.hr_remarks = payload.hrRemarks;
      
    if (payload.attachments !== undefined) {
      updateData.attachment_urls = payload.attachments;
    }

    // 🔥 The Audit Trail Hookup
    if (payload.editedBy) {
      updateData.edited_by = payload.editedBy;
      updateData.edited_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(updateData)
      .eq("id", taskId)
      .select()
      .single();

    if (error) throw error;

    // 🔥 NOTIFICATION TRIGGERS 🔥
    if (current && payload.editedBy) {
      const taskNameSnippet = `"${current.task_description?.substring(0, 30)}${current.task_description?.length > 30 ? "..." : ""}"`;
      
      const isEmployeeSelfComplete = payload?.status === TASK_STATUS.AWAITING_APPROVAL && current?.status !== TASK_STATUS.AWAITING_APPROVAL;
      if (isEmployeeSelfComplete) {
         notificationService.broadcastToRole(["SUPER_ADMIN"], {
            sender_id: payload.editedBy,
            type: "TASK_AWAITING_APPROVAL",
            title: "Task Awaiting Approval",
            message: `${current.creator?.name} has submitted a task for your approval: ${taskNameSnippet}.`,
            reference_id: taskId,
         });
         
         // If ops manager is enabled, they will see it too, so we could notify them. Let's look at their sub_department.
         const empSubDept = current.creator?.sub_department;
         if (empSubDept || current.creator?.department) {
           notificationService.notifyHeadByDepartment(
             current.creator?.department,
             empSubDept,
             {
               sender_id: payload.editedBy,
               type: "TASK_AWAITING_APPROVAL",
               title: "Task Awaiting Approval",
               message: `${current.creator?.name} has submitted a task for your approval: ${taskNameSnippet}.`,
               reference_id: taskId,
             },
           );
         }
      }

      if (isHeadApprove) {
        // Notify HR only (not Super Admin — they have HR access already and get a richer signal on full completion)
        notificationService.broadcastToRole(["HR"], {
          sender_id: payload.editedBy,
          type: "TASK_APPROVED_BY_HEAD",
          title: "Task Ready for HR",
          message: `A Head approved task ${taskNameSnippet} from ${current.creator?.name}. Ready for Verification.`,
          reference_id: taskId,
          excludeSuperAdmin: true,
        });
      }

      if (isHeadReject || isHrReject) {
        notificationService.createNotification({
          recipient_id: current.logged_by,
          sender_id: payload.editedBy,
          type: "TASK_REJECTED",
          title: "Task Revision Required",
          message: `Your task ${taskNameSnippet} was rejected for revision. Check the remarks.`,
          reference_id: taskId,
        });
      }

      if (payload.hrVerified === true && current.hr_verified === false) {
        // Notify the owner
        notificationService.createNotification({
          recipient_id: current.logged_by,
          sender_id: payload.editedBy,
          type: "TASK_VERIFIED",
          title: "Task HR Verified",
          message: `Your task ${taskNameSnippet} has been officially verified by HR!`,
          reference_id: taskId,
        });

        // Also keep the Head in the loop
        const empSubDept = current.creator?.sub_department;
        if (empSubDept || current.creator?.department) {
          notificationService.notifyHeadByDepartment(
            current.creator?.department,
            empSubDept,
            {
              sender_id: payload.editedBy,
              type: "TASK_VERIFIED",
              title: "Staff Task Verified by HR",
              message: `Task ${taskNameSnippet} by ${current.creator?.name} under your department was verified by HR.`,
              reference_id: taskId,
            },
          );
        }

        // Notify Super Admin: Task is now fully completed (HR-verified)
        notificationService.broadcastToRole(["SUPER_ADMIN"], {
          sender_id: payload.editedBy,
          type: "TASK_COMPLETED",
          title: "Task Completed",
          message: `Task ${taskNameSnippet} by ${current.creator?.name} has been verified by HR and is now marked as complete.`,
          reference_id: taskId,
        });
      }

      if (
        payload.grade !== undefined &&
        payload.grade > 0 &&
        payload.status === TASK_STATUS.COMPLETE &&
        current.evaluated_by == null
      ) {
        notificationService.createNotification({
          recipient_id: current.logged_by,
          sender_id: payload.editedBy,
          type: "TASK_GRADED",
          title: "Task Successfully Graded",
          message: `You earned a grade of ${payload.grade} for ${taskNameSnippet}!`,
          reference_id: taskId,
        });
      }
    }

    return data;
  },

  // 5. DELETE
  async deleteTask(taskId, userId) {
    const { data: userRole } = await supabase
      .from("employees")
      .select("is_super_admin, is_head, is_hr")
      .eq("id", userId)
      .single();

    const { data: task } = await supabase
      .from("tasks")
      .select("logged_by, hr_verified, attachment_urls")
      .eq("id", taskId)
      .single();

    if (!task) throw new Error("Task not found");

    const isManager = userRole?.is_super_admin || userRole?.is_head || userRole?.is_hr;

    if (task.logged_by !== userId && !isManager) {
      throw new Error("Unauthorized to delete this task");
    }

    if (task.hr_verified === true && !userRole?.is_super_admin) {
      throw new Error("Cannot delete tasks that are already verified by HR.");
    }

    if (task.attachment_urls && task.attachment_urls.length > 0) {
      for (const url of task.attachment_urls) {
        try {
           await storageService.deleteAttachment(url);
        } catch (e) {
           console.error("Failed to clean up attachment", url, e);
        }
      }
    }

    const { error } = await supabase
      .from("tasks")
      .update({
        status: TASK_STATUS.DELETED,
        edited_by: userId,
        edited_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (error) throw error;
    return true;
  },
};
