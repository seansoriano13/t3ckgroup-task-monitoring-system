import { supabase } from '../lib/supabase';

export const notificationService = {
  /**
   * Fetch notifications mapped out for a specific user ID
   * Includes sender name details
   */
  async getMyNotifications(userId) {
    if (!userId) return [];
    
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        sender:employees!notifications_sender_id_fkey(name, department)
      `)
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(50); // cap to 50 for performance

    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Listen to real-time notification events
   */
  subscribeToNotifications(userId, onNotification) {
    if (!userId) return null;
    return supabase
      .channel(`public:notifications:recipient_id=eq.${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
        (payload) => {
          onNotification(payload.new);
        }
      )
      .subscribe();
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single();
      
    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Mark all unread notifications for a specific user as read
   */
  async markAllAsRead(userId) {
    if (!userId) return;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);
      
    if (error) throw new Error(error.message);
  },

  /**
   * Internal mechanism to safely fire and forget a notification
   */
  async createNotification({ recipient_id, sender_id = null, type, title, message, reference_id = null }) {
     try {
       // Fire & Forget so it doesn't block primary mutation flows
       await supabase.from('notifications').insert({
          recipient_id,
          sender_id,
          type,
          title,
          message,
          reference_id
       });
     } catch (err) {
       console.error("Failed to silently dispatch notification:", err);
     }
  },

  /**
   * Broadcast a notification to entire functional roles (e.g. ['HR', 'SUPER_ADMIN'])
   */
  async broadcastToRole(rolesArray, { sender_id = null, type, title, message, reference_id = null, excludeSuperAdmin = false }) {
     try {
       const { data: emps } = await supabase.from('employees').select('id, department, is_super_admin, is_hr');
       if (!emps) return;

       const inserts = [];
       emps.forEach(emp => {
          let shouldInclude = false;
          if (rolesArray.includes('SUPER_ADMIN') && emp.is_super_admin) shouldInclude = true;
          if (rolesArray.includes('HR') && emp.is_hr) shouldInclude = true;

          // Optionally exclude Super Admins (e.g. for HR-only signals they don't need)
          if (excludeSuperAdmin && emp.is_super_admin) shouldInclude = false;

          if (shouldInclude) {
             inserts.push({
                recipient_id: emp.id,
                sender_id,
                type,
                title,
                message,
                reference_id
             });
          }
       });

       if (inserts.length > 0) {
          await supabase.from('notifications').insert(inserts);
       }
     } catch (err) {
       console.error("Failed to execute broadcast notification:", err);
     }
  },

  /**
   * Target a specific Department Head dynamically based on a department string
   */
  async notifyHeadByDepartment(subDeptString, { sender_id = null, type, title, message, reference_id = null }) {
     if (!subDeptString) return;
     try {
       const { data: heads } = await supabase
         .from('employees')
         .select('id')
         .ilike('sub_department', `%${subDeptString}%`)
         .eq('is_head', true);

       if (!heads || heads.length === 0) return;

       const inserts = heads.map(h => ({
          recipient_id: h.id,
          sender_id,
          type,
          title,
          message,
          reference_id
       }));

       await supabase.from('notifications').insert(inserts);
     } catch (err) {
       console.error("Failed to notify department head:", err);
     }
  }
};
