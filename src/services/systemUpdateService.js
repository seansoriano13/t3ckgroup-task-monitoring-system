import { supabase } from "../lib/supabase";

export const systemUpdateService = {
  /**
   * Fetch all active system updates
   */
  async getActiveUpdates() {
    const { data, error } = await supabase
      .from("system_updates")
      .select("*, author:employees(name)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching system updates:", error);
      throw error;
    }
    return data || [];
  },

  /**
   * Fetch all updates (for management panel)
   */
  async getAllUpdates() {
    const { data, error } = await supabase
      .from("system_updates")
      .select("*, author:employees(name)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching all system updates:", error);
      throw error;
    }
    return data || [];
  },

  /**
   * Create a new system update
   * @param {Object} updateData - { content, type, user_id }
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
    const { data, error } = await supabase
      .from("system_updates")
      .update({ is_active: isActive })
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
