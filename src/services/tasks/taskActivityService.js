import { supabase } from "../../lib/supabase";
import { notificationService } from "../notificationService";

export const taskActivityService = {
  /**
   * Fetch all activity entries for a task, joined with author name
   */
  async getActivityForTask(taskId) {
    if (!taskId) return [];

    const { data, error } = await supabase
      .from("task_activity")
      .select(
        `
        *,
        author:employees!task_activity_author_id_fkey(name, is_head, is_hr, is_super_admin)
      `,
      )
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return (data || []).map((entry) => ({
      id: entry.id,
      taskId: entry.task_id,
      authorId: entry.author_id,
      authorName: entry.author?.name || null,
      authorIsHead: entry.author?.is_head || false,
      authorIsHr: entry.author?.is_hr || false,
      authorIsSuperAdmin: entry.author?.is_super_admin || false,
      type: entry.type,
      content: entry.content,
      metadata: entry.metadata,
      createdAt: entry.created_at,
    }));
  },

  /**
   * Add a human comment to the task timeline
   */
  async addComment(taskId, authorId, content) {
    if (!taskId || !authorId || !content?.trim()) return null;

    const { data, error } = await supabase
      .from("task_activity")
      .insert({
        task_id: taskId,
        author_id: authorId,
        type: "COMMENT",
        content: content.trim(),
      })
      .select(
        `*, author:employees!task_activity_author_id_fkey(name, is_head, is_hr, is_super_admin)`,
      )
      .single();

    if (error) throw error;

    // Trigger notification to relevant parties
    try {
      const { data: task } = await supabase
        .from("tasks")
        .select("logged_by, reported_to")
        .eq("id", taskId)
        .single();

      const { data: author } = await supabase
        .from("employees")
        .select("name")
        .eq("id", authorId)
        .single();

      const snippet = content.length > 50 ? content.substring(0, 50) + "..." : content;

      if (task) {
        // If commenter is the task owner → notify the assigned head
        if (authorId === task.logged_by && task.reported_to) {
          notificationService.createNotification({
            recipient_id: task.reported_to,
            sender_id: authorId,
            type: "TASK_COMMENT",
            title: "New Comment on Task",
            message: `${author?.name || "Someone"} commented: "${snippet}"`,
            reference_id: taskId,
          });
        }
        // If commenter is NOT the task owner → notify the task owner
        else if (authorId !== task.logged_by) {
          notificationService.createNotification({
            recipient_id: task.logged_by,
            sender_id: authorId,
            type: "TASK_COMMENT",
            title: "New Comment on Your Task",
            message: `${author?.name || "A manager"} commented: "${snippet}"`,
            reference_id: taskId,
          });
        }
      }
    } catch (err) {
      console.error("Failed to send comment notification:", err);
    }

    return {
      id: data.id,
      taskId: data.task_id,
      authorId: data.author_id,
      authorName: data.author?.name || null,
      authorIsHead: data.author?.is_head || false,
      authorIsHr: data.author?.is_hr || false,
      authorIsSuperAdmin: data.author?.is_super_admin || false,
      type: data.type,
      content: data.content,
      metadata: data.metadata,
      createdAt: data.created_at,
    };
  },

  /**
   * Add a system-generated event to the timeline (called internally by mutations)
   */
  async addSystemEvent(taskId, content, metadata = null) {
    if (!taskId) return;
    try {
      await supabase.from("task_activity").insert({
        task_id: taskId,
        author_id: null,
        type: "SYSTEM",
        content,
        metadata,
      });
    } catch (err) {
      console.error("Failed to log system event:", err);
    }
  },

  /**
   * Add a head approval/rejection entry
   */
  async addApprovalEntry(taskId, authorId, content, metadata = null) {
    if (!taskId) return;
    try {
      await supabase.from("task_activity").insert({
        task_id: taskId,
        author_id: authorId,
        type: "APPROVAL",
        content: content || "",
        metadata,
      });
    } catch (err) {
      console.error("Failed to log approval entry:", err);
    }
  },

  /**
   * Add an HR verification/rejection entry
   */
  async addHrEntry(taskId, authorId, content, metadata = null) {
    if (!taskId) return;
    try {
      await supabase.from("task_activity").insert({
        task_id: taskId,
        author_id: authorId,
        type: "HR_NOTE",
        content: content || "Verified",
        metadata,
      });
    } catch (err) {
      console.error("Failed to log HR entry:", err);
    }
  },

  /**
   * Subscribe to real-time activity updates for a task
   */
  subscribeToActivity(taskId, onNewEntry) {
    if (!taskId) return null;

    return supabase
      .channel(`task-activity-${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "task_activity",
          filter: `task_id=eq.${taskId}`,
        },
        async (payload) => {
          // Re-fetch with author join since realtime doesn't include joins
          try {
            const { data } = await supabase
              .from("task_activity")
              .select(
                `*, author:employees!task_activity_author_id_fkey(name, is_head, is_hr, is_super_admin)`,
              )
              .eq("id", payload.new.id)
              .single();

            if (data) {
              onNewEntry({
                id: data.id,
                taskId: data.task_id,
                authorId: data.author_id,
                authorName: data.author?.name || null,
                authorIsHead: data.author?.is_head || false,
                authorIsHr: data.author?.is_hr || false,
                authorIsSuperAdmin: data.author?.is_super_admin || false,
                type: data.type,
                content: data.content,
                metadata: data.metadata,
                createdAt: data.created_at,
              });
            }
          } catch (err) {
            console.error("Failed to hydrate realtime activity entry:", err);
          }
        },
      )
      .subscribe();
  },

  /**
   * Unsubscribe from real-time activity channel
   */
  unsubscribeFromActivity(channel) {
    if (channel) {
      supabase.removeChannel(channel);
    }
  },
};
