import { Bell, Moon, MonitorSmartphone, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function SettingsPage() {
  const { logout } = useAuth();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-gray-12">Settings</h1>
        <p className="text-gray-9 mt-1">Configure your portal experience.</p>
      </div>

      <div className="space-y-6">
        {/* PREFERENCES SECTION */}
        <div className="bg-gray-2 border border-gray-4 rounded-2xl shadow-lg overflow-hidden">
          <div className="p-5 border-b border-gray-3 bg-gray-1">
            <h2 className="text-sm font-bold text-gray-10 uppercase tracking-wider">
              App Preferences
            </h2>
          </div>

          <div className="divide-y divide-gray-3">
            {/* Mock Toggle 1 */}
            <div className="p-5 flex items-center justify-between hover:bg-gray-1/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="text-gray-9">
                  <Moon size={20} />
                </div>
                <div>
                  <p className="font-bold text-gray-12">Dark Mode</p>
                  <p className="text-sm text-gray-9">
                    Tactical Gray theme is locked by default.
                  </p>
                </div>
              </div>
              {/* Fake Toggle Switch - Forced On */}
              <div className="w-11 h-6 bg-primary rounded-full relative opacity-50 cursor-not-allowed">
                <div className="absolute right-1 top-1 bg-white w-4 h-4 rounded-full"></div>
              </div>
            </div>

            {/* Mock Toggle 2 */}
            <div className="p-5 flex items-center justify-between hover:bg-gray-1/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="text-gray-9">
                  <Bell size={20} />
                </div>
                <div>
                  <p className="font-bold text-gray-12">Email Notifications</p>
                  <p className="text-sm text-gray-9">
                    Get alerted when a manager reviews your task.
                  </p>
                </div>
              </div>
              {/* Fake Toggle Switch - Off */}
              <div className="w-11 h-6 bg-gray-4 rounded-full relative cursor-pointer">
                <div className="absolute left-1 top-1 bg-gray-8 w-4 h-4 rounded-full transition-all"></div>
              </div>
            </div>
          </div>
        </div>

        {/* DANGER ZONE SECTION */}
        <div className="bg-gray-2 border border-red-900/30 rounded-2xl shadow-lg overflow-hidden">
          <div className="p-5 border-b border-gray-3 bg-gray-1 flex items-center gap-2">
            <h2 className="text-sm font-bold text-red-500 uppercase tracking-wider">
              Account Actions
            </h2>
          </div>

          <div className="p-6">
            <p className="text-sm text-gray-10 mb-4">
              Logging out will clear your current session. You will need to
              re-authenticate with your T3CKGROUP Google account to access the
              portal again.
            </p>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold bg-gray-3 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-gray-4 hover:border-red-500"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
