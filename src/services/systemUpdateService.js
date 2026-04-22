import { supabase } from "../lib/supabase";

const DEFAULT_EXPIRY_HOURS = 24;

function getDefaultExpiryIso() {
  const expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000);
  return expiresAt.toISOString();
}

function getNowIso() {
  return new Date().toISOString();
}

export const systemUpdateService = {
  /**
   * Deactivate updates that have already expired.
   */
  async deactivateExpiredUpdates() {
    const nowIso = getNowIso();
    const { error } = await supabase
      .from("system_updates")
      .update({ is_active: false })
      .eq("is_active", true)
      .lte("expires_at", nowIso);

    if (error) {
      console.error("Error deactivating expired updates:", error);
      throw error;
    }
    return true;
  },

  /**
   * Fetch the latest active non-expired update for banner display.
   */
  async getLatestActiveUpdate() {
    await this.deactivateExpiredUpdates();
    const nowIso = getNowIso();
    const { data, error } = await supabase
      .from("system_updates")
      .select("*, author:employees(name)")
      .eq("is_active", true)
      .gt("expires_at", nowIso)
      .limit(1)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching latest active system update:", error);
      throw error;
    }
    return data?.[0] || null;
  },

  /**
   * Fetch paginated updates for management panel.
   */
  async getUpdatesPage({ page = 1, pageSize = 10, filter = "all" } = {}) {
    await this.deactivateExpiredUpdates();
    const nowIso = getNowIso();
    const safePage = Math.max(1, Number(page) || 1);
    const safePageSize = Math.min(50, Math.max(5, Number(pageSize) || 10));
    const from = (safePage - 1) * safePageSize;
    const to = from + safePageSize - 1;

    let query = supabase
      .from("system_updates")
      .select("*, author:employees(name)", { count: "exact" });

    if (filter === "active") {
      query = query.eq("is_active", true).gt("expires_at", nowIso);
    } else if (filter === "expired") {
      query = query.or(`is_active.eq.false,expires_at.lte.${nowIso}`);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching paginated system updates:", error);
      throw error;
    }

    const totalCount = count || 0;
    return {
      items: data || [],
      totalCount,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.max(1, Math.ceil(totalCount / safePageSize)),
    };
  },

  /**
   * Create a new system update
   * @param {Object} updateData - { content, type, user_id, expires_at }
   */
  async createUpdate(updateData) {
    const { data, error } = await supabase
      .from("system_updates")
      .insert([
        {
          content: updateData.content,
          type: updateData.type || "feature",
          created_by: updateData.user_id,
          is_active: true,
          expires_at: updateData.expires_at || getDefaultExpiryIso(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating system update:", error);
      throw error;
    }
    return data;
  },

  /**
   * Toggle the active status of an update
   * @param {string} updateId
   * @param {boolean} isActive
   */
  async toggleUpdateStatus(updateId, isActive) {
    const updateData = { is_active: isActive };
    if (isActive) {
      updateData.expires_at = getDefaultExpiryIso();
    }

    const { data, error } = await supabase
      .from("system_updates")
      .update(updateData)
      .eq("id", updateId)
      .select()
      .single();

    if (error) {
      console.error("Error toggling update status:", error);
      throw error;
    }
    return data;
  },

  /**
   * Edit an existing update
   * @param {string} updateId
   * @param {Object} updateData - { content, type }
   */
  async editUpdate(updateId, updateData) {
    const { data, error } = await supabase
      .from("system_updates")
      .update({
        content: updateData.content,
        type: updateData.type
      })
      .eq("id", updateId)
      .select()
      .single();

    if (error) {
      console.error("Error editing system update:", error);
      throw error;
    }
    return data;
  },

  /**
   * Delete an update
   * @param {string} updateId
   */
  async deleteUpdate(updateId) {
    const { error } = await supabase
      .from("system_updates")
      .delete()
      .eq("id", updateId);

    if (error) {
      console.error("Error deleting update:", error);
      throw error;
    }
    return true;
  },
};
