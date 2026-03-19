import { Mail, Building2, Briefcase, Hash } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { ShieldCheck } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();

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
          <div className="bg-gray-2 border border-gray-4 rounded-2xl p-6 flex flex-col items-center text-center shadow-lg">
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

            <h2 className="text-xl font-bold text-gray-12">
              {user?.name || "Employee Name"}
            </h2>
            <p className="text-gray-9 text-sm mt-1 flex items-center gap-2 justify-center">
              <Mail size={14} /> {user?.email || "email@t3ckgroup.com"}
            </p>
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

          {/* Quick Stats (Mocked for visual weight) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-2 border border-gray-4 rounded-2xl p-5 shadow-lg flex items-center gap-4">
              <div className="p-3 bg-gray-3 rounded-full text-gray-9">
                <Hash size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-12">42</p>
                <p className="text-xs font-bold text-gray-8 uppercase tracking-wider">
                  Total Tasks Logged
                </p>
              </div>
            </div>
            <div className="bg-gray-2 border border-gray-4 rounded-2xl p-5 shadow-lg flex items-center gap-4">
              <div className="p-3 bg-green-900/20 rounded-full text-green-500">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">38</p>
                <p className="text-xs font-bold text-gray-8 uppercase tracking-wider">
                  HR Verified Tasks
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
