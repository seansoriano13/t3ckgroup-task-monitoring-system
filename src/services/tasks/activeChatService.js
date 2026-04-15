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
    const { error } = await supabase
      .from("chat_read_receipts")
      .upsert(
        {
          user_id: userId,
          entity_type: entityType,
          entity_id: String(entityId),
          last_read_at: new Date().toISOString(),
        },
        { onConflict: "user_id,entity_type,entity_id" } // Upsert condition
      );

    if (error) {
       console.error("Failed to mark chat as read:", error);
    }
  },
};
