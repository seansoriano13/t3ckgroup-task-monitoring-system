import { supabase } from "../../lib/supabase";

export const revenueActivityLogService = {
  async addSystemEvent(revenueLogId, content, metadata = null, authorId = null) {
    if (!revenueLogId) return;
    try {
      await supabase.from("revenue_activity_logs").insert({
        revenue_log_id: revenueLogId,
        author_id: authorId || null,
        type: "SYSTEM",
        content,
        metadata,
      });
    } catch (err) {
      console.error("Failed to log revenue system event:", err);
    }
  },

  async addApprovalEntry(revenueLogId, authorId, content, metadata = null) {
    if (!revenueLogId) return;
    try {
      await supabase.from("revenue_activity_logs").insert({
        revenue_log_id: revenueLogId,
        author_id: authorId || null,
        type: "APPROVAL",
        content: content || "",
        metadata,
      });
    } catch (err) {
      console.error("Failed to log revenue approval event:", err);
    }
  },

  /**
   * Paginated feed for the Super Admin Activity Log — Revenue tab
   */
  async getRecentRevenueActivity({
    limit = 50,
    offset = 0,
    type = "ALL",
    authorId = "ALL",
    employeeId = "ALL",
    dateFrom = null,
    dateTo = null,
    search = "",
  } = {}) {
    const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));
    const safeOffset = Math.max(0, Number(offset) || 0);

    let query = supabase
      .from("revenue_activity_logs")
      .select(
        `
        *,
        revenue_log:sales_revenue_logs${employeeId && employeeId !== "ALL" ? "!inner" : ""}(
          id,
          account,
          revenue_amount,
          is_verified,
          employee_id,
          employee:employees!sales_revenue_logs_employee_id_fkey(name, department, sub_department)
        ),
        author:employees(name, is_head, is_hr, is_super_admin, avatar_path)
      `,
      )
      .order("created_at", { ascending: false });

    if (type && type !== "ALL") query = query.eq("type", type);
    if (authorId && authorId !== "ALL") {
      if (authorId === "SYSTEM") query = query.is("author_id", null);
      else query = query.eq("author_id", authorId);
    }
    if (employeeId && employeeId !== "ALL")
      query = query.eq("revenue_log.employee_id", employeeId);
    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", dateTo);

    const trimmed = (search || "").trim();
    if (trimmed) {
      const esc = trimmed.replace(/%/g, "\\%").replace(/_/g, "\\_");
      const like = `%${esc}%`;

      const { data: logMatch } = await supabase
        .from("sales_revenue_logs")
        .select("id")
        .ilike("account", like)
        .limit(500);

      const ids = (logMatch || []).map((r) => r.id).filter(Boolean);
      if (ids.length > 0) {
        query = query.or(`content.ilike.${like},revenue_log_id.in.(${ids.join(",")})`);
      } else {
        query = query.ilike("content", like);
      }
    }

    query = query.range(safeOffset, safeOffset + safeLimit - 1);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((entry) => ({
      id: entry.id,
      taskId: entry.revenue_log_id,
      taskDescription: entry.revenue_log?.account || "Revenue Log",
      taskStatus: entry.revenue_log?.is_verified ? "VERIFIED" : null,
      taskLoggedBy: entry.revenue_log?.employee_id || null,
      taskCreatorName: entry.revenue_log?.employee?.name || null,
      taskCreatorDept: entry.revenue_log?.employee?.department || null,
      taskCreatorSubDept: entry.revenue_log?.employee?.sub_department || null,
      type: entry.type,
      content: entry.content,
      metadata: entry.metadata,
      createdAt: entry.created_at,
      authorId: entry.author_id,
      authorName: entry.author?.name || null,
      authorIsHead: entry.author?.is_head || false,
      authorIsHr: entry.author?.is_hr || false,
      authorIsSuperAdmin: entry.author?.is_super_admin || false,
      revenueAmount: entry.revenue_log?.revenue_amount || null,
    }));
  },

  subscribeToAllActivity(onNewEntry) {
    const channelName = `revenue-activity-all-${Math.random().toString(36).substring(7)}`;
    return supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "revenue_activity_logs" },
        async (payload) => {
          try {
            const { data } = await supabase
              .from("revenue_activity_logs")
              .select(
                `*, author:employees(name, is_head, is_hr, is_super_admin, avatar_path)`,
              )
              .eq("id", payload.new.id)
              .single();

            if (data) onNewEntry(data);
          } catch (err) {
            console.error("Failed to hydrate revenue activity realtime entry:", err);
          }
        },
      )
      .subscribe();
  },

  unsubscribeFromActivity(channel) {
    if (channel) supabase.removeChannel(channel);
  },
};
