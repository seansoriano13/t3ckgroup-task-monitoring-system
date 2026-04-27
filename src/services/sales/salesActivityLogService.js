import { supabase } from "../../lib/supabase";
import { notificationService } from "../notificationService";

export const salesActivityLogService = {
  /**
   * Fetch all activity entries for a sales activity, joined with author name
   */
  async getActivityForSalesActivity(salesActivityId) {
    if (!salesActivityId) return [];

    const { data, error } = await supabase
      .from("sales_activity_logs")
      .select(
        `
        *,
        author:employees!sales_activity_logs_author_id_fkey(name, is_head, is_hr, is_super_admin)
      `,
      )
      .eq("sales_activity_id", salesActivityId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return (data || []).map((entry) => ({
      id: entry.id,
      salesActivityId: entry.sales_activity_id,
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

  async getRecentSalesActivity({
    limit = 50,
    offset = 0,
    type = "ALL",
    authorId = "ALL",
    employeeId = "ALL",
    taskStatus = "ALL",
    dateFrom = null,
    dateTo = null,
    search = "",
  } = {}) {
    const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));
    const safeOffset = Math.max(0, Number(offset) || 0);

    let query = supabase
      .from("sales_activity_logs")
      .select(
        `
        *,
        activity:sales_activities!sales_activity_logs_sales_activity_id_fkey(
          id,
          account_name,
          status,
          employee_id,
          created_at,
          employee:employees!sales_activities_employee_id_fkey(name, department, sub_department)
        ),
        author:employees!sales_activity_logs_author_id_fkey(name, is_head, is_hr, is_super_admin)
      `,
      )
      .order("created_at", { ascending: false });

    if (type && type !== "ALL") query = query.eq("type", type);
    if (authorId && authorId !== "ALL") {
      if (authorId === "SYSTEM") query = query.is("author_id", null);
      else query = query.eq("author_id", authorId);
    }
    if (employeeId && employeeId !== "ALL") query = query.eq("activity.employee_id", employeeId);
    if (taskStatus && taskStatus !== "ALL") query = query.eq("activity.status", taskStatus);

    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", dateTo);

    const trimmed = (search || "").trim();
    if (trimmed) {
      const esc = trimmed.replace(/%/g, "\\%").replace(/_/g, "\\_");
      const like = `%${esc}%`;

      const { data: actMatch, error: actSearchErr } = await supabase
        .from("sales_activities")
        .select("id")
        .ilike("account_name", like)
        .limit(500);

      if (!actSearchErr) {
        const ids = (actMatch || []).map((a) => a.id).filter(Boolean);
        if (ids.length > 0) {
          const inList = ids.join(",");
          query = query.or(`content.ilike.${like},sales_activity_id.in.(${inList})`);
        } else {
          query = query.ilike("content", like);
        }
      } else {
        query = query.ilike("content", like);
      }
    }

    query = query.range(safeOffset, safeOffset + safeLimit - 1);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((entry) => ({
      id: entry.id,
      taskId: entry.sales_activity_id,
      taskDescription: entry.activity?.account_name || null,
      taskStatus: entry.activity?.status || null,
      taskLoggedBy: entry.activity?.employee_id || null,
      taskCreatorName: entry.activity?.employee?.name || null,
      taskCreatorDept: entry.activity?.employee?.department || null,
      taskCreatorSubDept: entry.activity?.employee?.sub_department || null,
      type: entry.type,
      content: entry.content,
      metadata: entry.metadata,
      createdAt: entry.created_at,
      authorId: entry.author_id,
      authorName: entry.author?.name || null,
      authorIsHead: entry.author?.is_head || false,
      authorIsHr: entry.author?.is_hr || false,
      authorIsSuperAdmin: entry.author?.is_super_admin || false,
    }));
  },

  /**
   * Add a human comment to the sales timeline
   */
  async addComment(salesActivityId, authorId, content) {
    if (!salesActivityId || !authorId || !content?.trim()) return null;

    const { data, error } = await supabase
      .from("sales_activity_logs")
      .insert({
        sales_activity_id: salesActivityId,
        author_id: authorId,
        type: "COMMENT",
        content: content.trim(),
      })
      .select(
        `*, author:employees!sales_activity_logs_author_id_fkey(name, is_head, is_hr, is_super_admin)`,
      )
      .single();

    if (error) throw error;

    // Trigger notification to relevant parties
    try {
      const { data: salesActivity } = await supabase
        .from("sales_activities")
        .select("employee_id, head_verified_by")
        .eq("id", salesActivityId)
        .single();

      const { data: author } = await supabase
        .from("employees")
        .select("name")
        .eq("id", authorId)
        .single();

      const snippet = content.length > 50 ? content.substring(0, 50) + "..." : content;

      if (salesActivity) {
        // Since sales_activities don't have a direct 'reported_to', let's use head_verified_by
        // or skip sending to the manager if they haven't verified it yet.
        // For now, if the commenter is not the employee, notify the employee.
        
        if (authorId !== salesActivity.employee_id) {
          notificationService.createNotification({
            recipient_id: salesActivity.employee_id,
            sender_id: authorId,
            type: "SALES_COMMENT",
            title: "New Comment on Sales Activity",
            message: `${author?.name || "A manager"} commented: "${snippet}"`,
            reference_id: String(salesActivityId),
          });
        }
      }
    } catch (err) {
      console.error("Failed to send sales comment notification:", err);
    }

    return {
      id: data.id,
      salesActivityId: data.sales_activity_id,
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
   * Add a system-generated event to the timeline
   */
  async addSystemEvent(salesActivityId, content, metadata = null) {
    if (!salesActivityId) return;
    try {
      await supabase.from("sales_activity_logs").insert({
        sales_activity_id: salesActivityId,
        author_id: null,
        type: "SYSTEM",
        content,
        metadata,
      });
    } catch (err) {
      console.error("Failed to log sales system event:", err);
    }
  },

  /**
   * Add a head approval/rejection entry
   */
  async addApprovalEntry(salesActivityId, authorId, content, metadata = null) {
    if (!salesActivityId) return;
    try {
      await supabase.from("sales_activity_logs").insert({
        sales_activity_id: salesActivityId,
        author_id: authorId,
        type: "APPROVAL",
        content: content || "",
        metadata,
      });
    } catch (err) {
      console.error("Failed to log sales approval entry:", err);
    }
  },

  /**
   * Subscribe to real-time activity updates for a sales activity
   */
  subscribeToActivity(salesActivityId, onNewEntry, channelSuffix = "") {
    if (!salesActivityId) return null;

    const channelName = `sales-activity-${salesActivityId}${channelSuffix}`;
    return supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sales_activity_logs",
          filter: `sales_activity_id=eq.${salesActivityId}`,
        },
        async (payload) => {
          // Re-fetch with author join since realtime doesn't include joins
          try {
            const { data } = await supabase
              .from("sales_activity_logs")
              .select(
                `*, author:employees!sales_activity_logs_author_id_fkey(name, is_head, is_hr, is_super_admin)`,
              )
              .eq("id", payload.new.id)
              .single();

            if (data) {
              onNewEntry({
                id: data.id,
                salesActivityId: data.sales_activity_id,
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
            console.error("Failed to hydrate realtime sales activity entry:", err);
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
