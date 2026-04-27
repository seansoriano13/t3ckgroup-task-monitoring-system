import { supabase } from "../lib/supabase";
import { notificationService } from "./notificationService";

export const committeeTaskActivityService = {
  async getActivityForTask(taskId) {
    if (!taskId) return [];

    const { data, error } = await supabase
      .from("committee_task_activity")
      .select(`
        *,
        author:employees!committee_task_activity_author_id_fkey(name, is_head, is_hr, is_super_admin)
      `)
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

  async addComment(taskId, authorId, content) {
    if (!taskId || !authorId || !content?.trim()) return null;

    const { data, error } = await supabase
      .from("committee_task_activity")
      .insert({
        task_id: taskId,
        author_id: authorId,
        type: "COMMENT",
        content: content.trim(),
      })
      .select(`*, author:employees!committee_task_activity_author_id_fkey(name, is_head, is_hr, is_super_admin)`)
      .single();

    if (error) throw error;

    // Send notifications
    try {
      const { data: ct } = await supabase
        .from("committee_tasks")
        .select("created_by, members:committee_task_members(employee_id)")
        .eq("id", taskId)
        .single();

      const { data: author } = await supabase
        .from("employees")
        .select("name")
        .eq("id", authorId)
        .single();

      const snippet = content.length > 50 ? content.substring(0, 50) + "..." : content;

      if (ct) {
        const recipients = new Set();
        if (ct.created_by !== authorId) recipients.add(ct.created_by);
        ct.members?.forEach(m => {
          if (m.employee_id !== authorId) recipients.add(m.employee_id);
        });

        for (const recipientId of recipients) {
          notificationService.createNotification({
            recipient_id: recipientId,
            sender_id: authorId,
            type: "COMMITTEE_TASK_COMMENT",
            title: "New Comment on Committee Task",
            message: `${author?.name || "Someone"} commented: "${snippet}"`,
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

  subscribeToActivity(taskId, onNewEntry, channelSuffix = "") {
    if (!taskId) return null;

    const channelName = `committee-task-activity-${taskId}${channelSuffix}`;
    return supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "committee_task_activity",
          filter: `task_id=eq.${taskId}`,
        },
        async (payload) => {
          try {
            const { data } = await supabase
              .from("committee_task_activity")
              .select(`*, author:employees!committee_task_activity_author_id_fkey(name, is_head, is_hr, is_super_admin)`)
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

  unsubscribeFromActivity(channel) {
    if (channel) {
      supabase.removeChannel(channel);
    }
  },
};
