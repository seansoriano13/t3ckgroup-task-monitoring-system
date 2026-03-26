import { Mail, Building2, Briefcase, Hash, ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";

export default function ProfilePage() {
  const { user } = useAuth();

  const { data: stats, isLoading: isStatsLoading } = useQuery({
     queryKey: ['profileStats', user?.id],
     queryFn: async () => {
         if (user?.isSuperAdmin) return null;
         
         if (user?.isHr || user?.is_hr) {
             const { count: pendingVerifications } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('hrVerified', false).eq('status', 'COMPLETE');
             const { count: totalVerified } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('hrVerified', true);
             return { primary: pendingVerifications || 0, primaryLabel: "Pending HR Verifications", secondary: totalVerified || 0, secondaryLabel: "Total Verified" };
         } else if (user?.isHead || user?.is_head) {
             const { count: pendingApprovals } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('department', user.department).neq('status', 'COMPLETE').neq('status', 'NOT APPROVED');
             const { count: totalApproved } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('department', user.department).in('status', ['COMPLETE', 'NOT APPROVED']);
             return { primary: pendingApprovals || 0, primaryLabel: "Awaiting Your Approval", secondary: totalApproved || 0, secondaryLabel: "Your Evaluated Tasks" };
         } else {
             const { count: totalLogged } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('loggedById', user.id);
             const { count: totalDone } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('loggedById', user.id).eq('status', 'COMPLETE');
             return { primary: totalLogged || 0, primaryLabel: "Total Tasks Logged", secondary: totalDone || 0, secondaryLabel: "Activities Completed" };
         }
     },
     enabled: !!user?.id
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-gray-12">My Profile</h1>
        <p className="text-gray-9 mt-1">
          Manage your employee information and access levels.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: The ID Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-2 border border-gray-4 rounded-2xl p-6 flex flex-col gap-3 items-center text-center shadow-lg">
            <div className="relative">
              <img
                src={user?.picture || "/default-avatar.png"}
                alt="Profile"
                className="w-24 h-24 rounded-full border-4 border-gray-3 shadow-md mb-4"
                referrerPolicy="no-referrer"
              />
              {/* Role Badges floating on the avatar */}
              {(user?.isHead || user?.isHr) && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {user?.isHead && (
                    <span className="bg-amber-900/40 text-amber-400 border border-amber-700/50 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                      Head
                    </span>
                  )}
                  {user?.isHr && (
                    <span className="bg-purple-900/40 text-purple-400 border border-purple-700/50 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                      HR
                    </span>
                  )}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-12">
                {user?.name || "Employee Name"}
              </h2>
              <p className="text-gray-9 text-sm mt-1 flex items-center gap-2 justify-center">
                <Mail size={14} /> {user?.email || "email@t3ckgroup.com"}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Details & Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Department Info */}
          <div className="bg-gray-2 border border-gray-4 rounded-2xl p-6 shadow-lg">
            <h3 className="text-sm font-bold text-gray-10 uppercase tracking-wider mb-4 border-b border-gray-3 pb-2">
              Organizational Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex gap-4 items-start">
                <div className="p-3 bg-gray-3 rounded-xl text-primary">
                  <Building2 size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-8 uppercase tracking-wider">
                    Department
                  </p>
                  <p className="text-gray-12 font-bold mt-0.5">
                    {user?.department || "Unassigned"}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="p-3 bg-gray-3 rounded-xl text-primary">
                  <Briefcase size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-8 uppercase tracking-wider">
                    Sub-Department
                  </p>
                  <p className="text-gray-12 font-bold mt-0.5">
                    {user?.subDepartment || "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start sm:col-span-2 border-t border-gray-3 pt-4 mt-2">
                <div className="p-3 bg-gray-3 rounded-xl text-primary">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-8 uppercase tracking-wider">
                    System ID
                  </p>
                  <p className="text-gray-10 font-mono text-xs mt-1">
                    {user?.id || "UUID_PENDING"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Live Dynamic Stats */}
          {!user?.isSuperAdmin && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-2 border border-gray-4 rounded-2xl p-5 shadow-lg flex items-center gap-4">
                <div className="p-3 bg-gray-3 rounded-full text-gray-9">
                  <Hash size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-12">
                     {isStatsLoading ? <Loader2 size={16} className="animate-spin mt-1 mb-2" /> : stats?.primary}
                  </p>
                  <p className="text-xs font-bold text-gray-8 uppercase tracking-wider">
                    {stats?.primaryLabel || 'Metrics'}
                  </p>
                </div>
              </div>
              <div className="bg-gray-2 border border-gray-4 rounded-2xl p-5 shadow-lg flex items-center gap-4">
                <div className="p-3 bg-green-900/20 rounded-full text-green-500">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">
                     {isStatsLoading ? <Loader2 size={16} className="animate-spin mt-1 mb-2" /> : stats?.secondary}
                  </p>
                  <p className="text-xs font-bold text-gray-8 uppercase tracking-wider">
                    {stats?.secondaryLabel || 'Completed'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
