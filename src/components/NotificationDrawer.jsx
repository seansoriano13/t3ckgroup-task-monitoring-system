import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import { Bell, X, CheckCheck, ShieldAlert, CheckCircle2, Clock, XCircle, FileText, Briefcase, TrendingUp, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router';
import { supabase } from '../lib/supabase';

export default function NotificationDrawer({ isOpen, onClose }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('ALL');

  const { data: notifications = [], isLoading } = useQuery({
     queryKey: ['notifications', user?.id],
     queryFn: () => notificationService.getMyNotifications(user?.id),
     enabled: !!user?.id && isOpen, // Only fetch eagerly if open
  });

  // Real-time subscription hook when Drawer is mounted/User is active
  useEffect(() => {
     if (!user?.id) return;
     const subscription = notificationService.subscribeToNotifications(user.id, (newNotif) => {
        // Optimistically update the cache when a new notification drops in
        queryClient.setQueryData(['notifications', user.id], (old = []) => [newNotif, ...old]);
     });
     return () => {
        if (subscription) {
            supabase.removeChannel(subscription);
        }
     };
  }, [user?.id, queryClient]);

  const markReadMutation = useMutation({
     mutationFn: (id) => notificationService.markAsRead(id),
     onSuccess: (data, variables) => {
        queryClient.setQueryData(['notifications', user?.id], (old = []) => 
           old.map(n => n.id === variables ? { ...n, is_read: true } : n)
        );
     }
  });

  const markAllReadMutation = useMutation({
     mutationFn: () => notificationService.markAllAsRead(user?.id),
     onSuccess: () => {
        queryClient.setQueryData(['notifications', user?.id], (old = []) => 
           old.map(n => ({ ...n, is_read: true }))
        );
     }
  });

  const getIconForType = (type) => {
     switch (type) {
        case 'TASK_GRADED': return <CheckCircle2 size={18} className="text-green-500" />;
        case 'TASK_REJECTED': return <XCircle size={18} className="text-red-500" />;
        case 'TASK_VERIFIED': return <ShieldAlert size={18} className="text-blue-500" />;
        case 'TASK_COMPLETED': return <Trophy size={18} className="text-emerald-500" />;
        case 'NEW_TASK_SUBMITTED': return <Clock size={18} className="text-amber-500" />;
        case 'TASK_APPROVED_BY_HEAD': return <CheckCircle2 size={18} className="text-amber-600" />;
        case 'REVENUE_LOCKED': return <ShieldAlert size={18} className="text-green-500" />;
        case 'REVENUE_EDIT_REQUESTED': return <Clock size={18} className="text-orange-500" />;
        case 'REVENUE_EDIT_RESULT': return <TrendingUp size={18} className="text-primary" />;
        case 'SALES_PLAN_SUBMITTED': return <Briefcase size={18} className="text-purple-500" />;
        case 'SALES_DAY_CONQUERED': return <CheckCheck size={18} className="text-green-500" />;
        case 'SALES_WEEK_CONQUERED': return <Trophy size={18} className="text-yellow-500" />;
        case 'UNPLANNED_ACTIVITY': return <FileText size={18} className="text-blue-500" />;
        default: return <Bell size={18} className="text-gray-9" />;
     }
  };

  const filteredNotifs = useMemo(() => {
     if (activeTab === 'ALL') return notifications;
     if (activeTab === 'TASKS') return notifications.filter(n => n.type.includes('TASK'));
     if (activeTab === 'SALES') return notifications.filter(n => n.type.includes('SALES') || n.type.includes('REVENUE') || n.type.includes('ACTIVITY'));
     if (activeTab === 'UNREAD') return notifications.filter(n => !n.is_read);
     return notifications;
  }, [notifications, activeTab]);

  const handleNotificationClick = (notif) => {
     if (!notif.is_read) {
        markReadMutation.mutate(notif.id);
     }

     if (!notif.reference_id) return; // No deep link

      // Deep Routing Logic
      if (notif.type.includes('TASK')) {
         // Route to Approvals or Tasks depending on role
         if ((user?.isHead || user?.isHr) && !user?.isSuperAdmin) {
            navigate('/approvals', { state: { openTaskId: notif.reference_id } });
         } else if (user?.isSuperAdmin) {
            navigate('/tasks', { state: { openTaskId: notif.reference_id } });
         } else {
            navigate('/', { state: { openTaskId: notif.reference_id } });
         }
     } else if (notif.type === 'UNPLANNED_ACTIVITY' || notif.type === 'SALES_DAY_CONQUERED' || notif.type === 'SALES_PLAN_SUBMITTED') {
        const fallbackDate = notif.created_at ? notif.created_at.split('T')[0] : null;
        navigate('/sales/records', { 
           state: { 
              openEventId: notif.reference_id, 
              fallbackEmpId: notif.sender_id, 
              fallbackDate: fallbackDate,
              eventType: notif.type
           } 
        });
     } else if (notif.type.includes('REVENUE')) {
        navigate('/sales/records', { state: { openRevenueId: notif.reference_id } });
     } else if (notif.type === 'SALES_EXPENSE_PENDING') {
        // Admins/Heads: route them to the approval queue and highlight the item
        if (user?.isSuperAdmin) {
           navigate('/super-admin', { state: { highlightExpenseId: notif.reference_id } });
        } else {
           navigate('/approvals', { state: { highlightExpenseId: notif.reference_id } });
        }
     } else if (notif.type === 'SALES_EXPENSE_PROCESSED') {
        // Sales rep: go to their daily execution for that day
        const dateStr = notif.created_at ? notif.created_at.split('T')[0] : null;
        navigate('/sales/daily', { state: { highlightActivityId: notif.reference_id, date: dateStr } });
     }
     
     onClose(); // collapse drawer
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
           className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99]" 
           onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-[400px] max-w-full bg-gray-1 border-l border-gray-4 shadow-2xl z-[9999] transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
         
         <div className="p-6 border-b border-gray-4 flex justify-between items-start bg-gray-2/50 shrink-0">
            <div>
               <h2 className="text-xl font-black text-gray-12 flex items-center gap-2">
                  <Bell className="text-primary"/> Notifications
               </h2>
               <p className="text-xs text-gray-9 mt-1 font-bold">Your Universal Action Hub</p>
            </div>
            <div className="flex items-center gap-3">
               <button 
                  onClick={() => markAllReadMutation.mutate()} 
                  className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-red-9 transition-colors bg-primary/10 px-2 py-1 rounded"
               >
                 Mark All Read
               </button>
               <button onClick={onClose} className="p-1.5 text-gray-9 hover:bg-gray-4 rounded-full transition-colors">
                  <X size={20}/>
               </button>
            </div>
         </div>

         {/* Tabs */}
         <div className="flex px-6 pt-4 gap-2 border-b border-gray-4 shrink-0 overflow-x-auto custom-scrollbar pb-2">
             {['ALL', 'UNREAD', 'TASKS', 'SALES'].map(tab => {
               const isSalesStaff = user?.department?.toLowerCase().includes("sales") || user?.subDepartment?.toLowerCase().includes("sales");
               const isManagement = user?.isHr || user?.isSuperAdmin;
               if (tab === 'SALES' && !isSalesStaff && !isManagement) return null;
               if (tab === 'TASKS' && isSalesStaff && !isManagement) return null;

               return (
               <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-lg transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-gray-12 text-gray-1 shadow' : 'text-gray-9 hover:bg-gray-3 hover:text-gray-12'}`}
               >
                  {tab}
               </button>
               );
            })}
         </div>

         {/* Feed */}
         <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            {isLoading ? (
               <div className="p-10 text-center text-gray-8 italic text-sm font-bold animate-pulse">Syncing timeline...</div>
            ) : filteredNotifs.length === 0 ? (
               <div className="p-10 text-center flex flex-col items-center">
                  <Bell size={32} className="text-gray-5 mb-3" />
                  <p className="text-gray-9 font-bold">You're all caught up!</p>
                  <p className="text-gray-8 text-xs mt-1">No alerts for this filter.</p>
               </div>
            ) : (
               filteredNotifs.map(notif => (
                  <div 
                     key={notif.id} 
                     onClick={() => handleNotificationClick(notif)}
                     className={`p-4 rounded-xl border transition-all cursor-pointer hover:border-gray-6 
                        ${notif.type === 'TASK_ASSIGNED' && !notif.is_read ? 'bg-purple-500/5 border-purple-500/30' : ''}
                        ${notif.is_read ? 'bg-gray-2/50 border-gray-3 opacity-75' : 'bg-gray-1 border-gray-5 shadow-md'}`}
                  >
                     <div className="flex gap-3 items-start">
                        <div className={`p-2 rounded-full shrink-0 ${notif.is_read ? 'bg-gray-3' : 'bg-blue-500/10'}`}>
                           {getIconForType(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-start mb-1 gap-2">
                              <h4 className={`text-sm font-black truncate ${notif.is_read ? 'text-gray-11' : 'text-gray-12'}`}>{notif.title}</h4>
                              <span className="text-[10px] font-bold text-gray-8 uppercase tracking-widest shrink-0">
                                 {new Date(notif.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                           </div>
                           <p className="text-xs text-gray-10 leading-relaxed font-medium line-clamp-3">{notif.message}</p>
                           
                           {notif.sender && (
                              <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-gray-8 flex items-center gap-1.5 border-t border-gray-4 pt-2">
                                 Action by: <span className="text-gray-11">{notif.sender.name}</span>
                              </p>
                           )}
                        </div>
                        {!notif.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                     </div>
                  </div>
               ))
            )}
         </div>

      </div>
    </>
  );
}
