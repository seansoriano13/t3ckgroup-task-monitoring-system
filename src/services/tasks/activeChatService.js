import { supabase } from "../../lib/supabase";

export const activeChatService = {
  /**
   * Fetch all active chats where the user is involved.
   * Leverages the `get_user_active_chats` RPC for robust calculation.
   */
  async getActiveChats(userId, limit = 30) {
    if (!userId) return [];

    const { data, error } = await supabase.rpc("get_user_active_chats", {
      p_user_id: userId,
      p_limit: limit,
    });

    if (error) throw new Error(error.message);

    return data || [];
  },

  /**
   * Mark a chat thread as read for the current user
   */
  async markAsRead(userId, entityType, entityId) {
    if (!userId || !entityType || !entityId) return;

    // Upsert the read receipt. Convert entityId to string to match the DB schema (TEXT)
    // Add 1000ms strictly to overwrite any clock-skew and ensure it lands after created_at
    const { error } = await supabase
      .from("chat_read_receipts")
      .upsert(
        {
          user_id: userId,
          entity_type: entityType,
          entity_id: String(entityId),
          last_read_at: new Date(Date.now() + 1000).toISOString(),
        },
        { onConflict: "user_id,entity_type,entity_id" } // Upsert condition
      );

    if (error) {
       console.error("Failed to mark chat as read:", error);
    }
  },

  /**
   * Bulk archive chats
   */
  async archiveChats(userId, chats) {
    if (!userId || !chats || chats.length === 0) return;
    
    const payload = chats.map(c => ({
      user_id: userId,
      entity_type: c.entityType || c.entity_type,
      entity_id: String(c.entityId || c.entity_id),
      archived_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from("chat_user_archives")
      .upsert(payload, { onConflict: "user_id,entity_type,entity_id" });

    if (error) throw new Error(error.message);
  },

  /**
   * Bulk unarchive chats
   */
  async unarchiveChats(userId, chats) {
    if (!userId || !chats || chats.length === 0) return;
    
    const promises = chats.map(c => 
      supabase.from("chat_user_archives")
        .delete()
        .eq("user_id", userId)
        .eq("entity_type", c.entityType || c.entity_type)
        .eq("entity_id", String(c.entityId || c.entity_id))
    );
    
    const results = await Promise.all(promises);
    for (const res of results) {
      if (res.error) throw new Error(res.error.message);
    }
  }
};
