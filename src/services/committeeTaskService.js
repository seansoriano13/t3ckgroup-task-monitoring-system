import { supabase } from "../lib/supabase";
import { notificationService } from "./notificationService";
import { taskActivityService } from "./tasks/taskActivityService";

const logCommitteeTaskActivity = async (committeeTaskId, action, details = {}, actorId = null) => {
  try {
    await supabase.from("committee_task_logs").insert({
      committee_task_id: committeeTaskId,
      action,
      details,
      actor_id: actorId,
    });
  } catch (err) {
    console.error("Failed to log committee task activity", err);
  }
};

export const committeeTaskService = {
  // CREATE
  async createCommitteeTask(payload) {
    const { title, description, dueDate, createdBy, members } = payload;

    if (!members || members.length === 0) {
      throw new Error("Add at least one member to the committee task");
    }

    const { data: committeeTask, error: committeeError } = await supabase
      .from("committee_tasks")
      .insert([
        {
          title,
          description,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          created_by: createdBy,
          status: "ACTIVE",
        },
      ])
      .select()
      .single();

    if (committeeError) throw committeeError;

    const memberPayloads = members.map((m) => ({
      committee_task_id: committeeTask.id,
      employee_id: m.employeeId,
      task_description: m.taskDescription,
      status: "PENDING",
    }));

    const { error: membersError } = await supabase
      .from("committee_task_members")
      .insert(memberPayloads);

    if (membersError) {
      // rollback if needed
      await supabase.from("committee_tasks").delete().eq("id", committeeTask.id);
      throw membersError;
    }

    await logCommitteeTaskActivity(committeeTask.id, "CREATED", { title }, createdBy);

    // Notifications
    const { data: creator } = await supabase
      .from("employees")
      .select("name")
      .eq("id", createdBy)
      .single();

    for (const member of members) {
      notificationService.createNotification({
        recipient_id: member.employeeId,
        sender_id: createdBy,
        type: "COMMITTEE_ASSIGNED",
        title: "Assigned to Committee Task",
        message: `${creator?.name || "A Head"} assigned you to "${title}": ${member.taskDescription}`,
        reference_id: committeeTask.id,
      });
    }

    return committeeTask;
  },

  // READ (Heads see all they created or are part of, super admin sees all, employees see where they are members)
  async getCommitteeTasks(userId, isHead, isSuperAdmin) {
    let query = supabase
      .from("committee_tasks")
      .select(`
        *,
        creator:employees!committee_tasks_created_by_fkey(name, department, sub_department),
        members:committee_task_members(
          id, employee_id, task_description, status, grade, grade_remarks, rated_at, rated_by,
          employee:employees!committee_task_members_employee_id_fkey(name, avatar_path)
        )
      `)
      .neq("status", "CANCELLED")
      .order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    if (isSuperAdmin) return data;

    // Filter locally if needed
    return data.filter((ct) => {
      if (ct.created_by === userId) return true; // Created by this head
      return ct.members.some((m) => m.employee_id === userId); // Is a member
    });
  },

  async getCommitteeTaskById(id) {
    const { data, error } = await supabase
      .from("committee_tasks")
      .select(`
        *,
        creator:employees!committee_tasks_created_by_fkey(name, department, sub_department),
        members:committee_task_members(
          id, employee_id, task_description, status, grade, grade_remarks, rated_at, rated_by,
          employee:employees!committee_task_members_employee_id_fkey(name, avatar_path, department)
        )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  // UPDATE - Member Status (Employee marks done)
  async updateMemberStatus(memberId, status, userId) {
    const { data: member, error: fetchErr } = await supabase
      .from("committee_task_members")
      .select("*, committee_tasks(*)")
      .eq("id", memberId)
      .single();

    if (fetchErr) throw fetchErr;
    if (member.employee_id !== userId && member.committee_tasks.created_by !== userId) {
      throw new Error("Unauthorized to update this task");
    }

    const { error } = await supabase
      .from("committee_task_members")
      .update({ status })
      .eq("id", memberId);

    if (error) throw error;

    await logCommitteeTaskActivity(
      member.committee_task_id,
      status === "DONE" ? "MEMBER_DONE" : "MEMBER_PENDING",
      { memberId, employeeId: member.employee_id, taskDescription: member.task_description },
      userId
    );

    // Check if ALL members are done to auto-complete
    if (status === "DONE") {
      const { data: allMembers } = await supabase
        .from("committee_task_members")
        .select("status")
        .eq("committee_task_id", member.committee_task_id);

      const allDone = allMembers.every((m) => m.status === "DONE");
      if (allDone) {
        await this.markCommitteeTaskComplete(member.committee_task_id, userId);
      }
    }

    return true;
  },

  // UPDATE - Mark Complete manually
  async markCommitteeTaskComplete(committeeTaskId, actorId) {
    const { data, error } = await supabase
      .from("committee_tasks")
      .update({ status: "COMPLETED" })
      .eq("id", committeeTaskId)
      .select()
      .single();

    if (error) throw error;

    // Any pending members are auto-marked as skipped or just leave them? Let's leave them or mark DONE.
    // For now, if head forces complete, they remain what they are, but head can rate them.

    await logCommitteeTaskActivity(committeeTaskId, "COMPLETED", {}, actorId);

    return data;
  },

  // RATE EMPLOYEES
  async rateMembers(committeeTaskId, ratings, actorId) {
    // ratings = [{ memberId, grade, gradeRemarks }]
    for (const r of ratings) {
      await supabase
        .from("committee_task_members")
        .update({
          grade: r.grade,
          grade_remarks: r.gradeRemarks,
          rated_at: new Date().toISOString(),
          rated_by: actorId,
        })
        .eq("id", r.memberId);
    }

    // Once rated, move the committee task to HR_PENDING
    const { error } = await supabase
      .from("committee_tasks")
      .update({ status: "HR_PENDING" })
      .eq("id", committeeTaskId);

    if (error) throw error;

    await logCommitteeTaskActivity(
      committeeTaskId,
      "RATED",
      { ratings: ratings.map(r => ({ memberId: r.memberId, grade: r.grade })) },
      actorId
    );

    // Notify HR
    const { data: ct } = await supabase
      .from("committee_tasks")
      .select("*, creator:employees!committee_tasks_created_by_fkey(name)")
      .eq("id", committeeTaskId)
      .single();

    notificationService.broadcastToRole(["HR"], {
      sender_id: actorId,
      type: "COMMITTEE_TASK_READY_FOR_HR",
      title: "Committee Task Ready",
      message: `Committee task "${ct.title}" by ${ct.creator?.name} has been completed and graded. Ready for Verification.`,
      reference_id: committeeTaskId,
      excludeSuperAdmin: true,
    });

    return true;
  },

  // CANCEL / DELETE
  async cancelCommitteeTask(id, actorId) {
    const { error } = await supabase
      .from("committee_tasks")
      .update({ status: "CANCELLED" })
      .eq("id", id);
    if (error) throw error;

    await logCommitteeTaskActivity(id, "CANCELLED", {}, actorId);

    return true;
  },

  async updateMemberTaskDescription(memberId, taskDescription, committeeTaskId = null, actorId = null) {
    const { error } = await supabase
      .from("committee_task_members")
      .update({ task_description: taskDescription })
      .eq("id", memberId);
    if (error) throw error;

    if (committeeTaskId && actorId) {
      await logCommitteeTaskActivity(
        committeeTaskId,
        "CHECKLIST_UPDATED",
        { memberId, taskDescription },
        actorId
      );
    }

    return true;
  },

  async updateMemberAssignment(memberId, committeeTaskId, payload, actorId) {
    const { taskDescription, role, customRole } = payload;
    
    const { error } = await supabase
      .from("committee_task_members")
      .update({
        task_description: taskDescription,
        role: role || null,
        custom_role: customRole || null,
      })
      .eq("id", memberId);

    if (error) throw error;

    await logCommitteeTaskActivity(
      committeeTaskId,
      "MEMBER_UPDATED",
      { memberId, role: customRole || role, taskDescription },
      actorId
    );

    return true;
  },

  async removeMemberFromTask(memberId, committeeTaskId, actorId) {
    const { error } = await supabase
      .from("committee_task_members")
      .delete()
      .eq("id", memberId);

    if (error) throw error;

    await logCommitteeTaskActivity(
      committeeTaskId,
      "MEMBER_REMOVED",
      { memberId },
      actorId
    );

    return true;
  },

  // HR VERIFICATION
  async verifyCommitteeTask(id, actorId, remarks = "") {
    const { error } = await supabase
      .from("committee_tasks")
      .update({
        status: "HR_VERIFIED",
        hr_verified: true,
        hr_verified_at: new Date().toISOString(),
        hr_verified_by: actorId,
        hr_remarks: remarks,
      })
      .eq("id", id);

    if (error) throw error;

    await logCommitteeTaskActivity(id, "HR_VERIFIED", { remarks }, actorId);

    return true;
  },

  async rejectCommitteeTask(id, actorId, remarks) {
    const { error } = await supabase
      .from("committee_tasks")
      .update({
        status: "COMPLETED", // Goes back to completed for head to fix
        hr_remarks: remarks,
      })
      .eq("id", id);
      
    if (error) throw error;

    await logCommitteeTaskActivity(id, "HR_REJECTED", { remarks }, actorId);

    return true;
  },

  // GET HISTORY
  async getCommitteeTaskHistory(taskId) {
    const { data, error } = await supabase
      .from("committee_task_logs")
      .select("*, actor:employees!committee_task_logs_actor_id_fkey(name, avatar_path)")
      .eq("committee_task_id", taskId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  // ADD MEMBER ON THE FLY
  async addMemberToTask(committeeTaskId, payload, actorId) {
    const { employeeId, taskDescription, role, customRole } = payload;
    
    const { error } = await supabase
      .from("committee_task_members")
      .insert({
        committee_task_id: committeeTaskId,
        employee_id: employeeId,
        task_description: taskDescription,
        role: role || null,
        custom_role: customRole || null,
        status: "PENDING"
      });

    if (error) throw error;

    await logCommitteeTaskActivity(
      committeeTaskId,
      "MEMBER_ADDED",
      { addedEmployeeId: employeeId, role: customRole || role },
      actorId
    );

    // Get creator and task to notify
    const { data: ct } = await supabase
      .from("committee_tasks")
      .select("*, creator:employees!committee_tasks_created_by_fkey(name)")
      .eq("id", committeeTaskId)
      .single();

    notificationService.createNotification({
      recipient_id: employeeId,
      sender_id: actorId,
      type: "COMMITTEE_ASSIGNED",
      title: "Added to Active Committee Task",
      message: `${ct?.creator?.name || "A Head"} added you to "${ct?.title}": ${taskDescription}`,
      reference_id: committeeTaskId,
    });

    return true;
  }
};
