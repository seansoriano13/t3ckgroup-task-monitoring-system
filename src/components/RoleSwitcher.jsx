import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { employeeService } from "../services/employeeService";
import { FlaskConical, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const TEST_EMAIL = "arkadatax03@gmail.com";

const ROLE_PRESETS = [
  {
    label: "Employee",
    desc: "Regular staff (ADMIN/ADMIN)",
    color: "bg-gray-500",
    dbValues: {
      department: "ADMIN", sub_department: "ADMIN",
      is_head: false, is_hr: false, is_super_admin: false,
    },
  },
  {
    label: "Software Engineer",
    desc: "IT department (OPERATIONS/IT)",
    color: "bg-indigo-500",
    dbValues: {
      department: "OPERATIONS", sub_department: "IT",
      is_head: false, is_hr: false, is_super_admin: false,
    },
  },
  {
    label: "Sales Rep",
    desc: "Sales department (SALES/GOV)",
    color: "bg-blue-500",
    dbValues: {
      department: "SALES", sub_department: "GOV",
      is_head: false, is_hr: false, is_super_admin: false,
    },
  },
  {
    label: "Dept Head",
    desc: "Sub-dept head (OPS/PURCHASING)",
    color: "bg-amber-500",
    dbValues: {
      department: "OPERATIONS", sub_department: "PURCHASING",
      is_head: true, is_hr: false, is_super_admin: false,
    },
  },
  {
    label: "Ops Manager",
    desc: "Dept-wide head (OPS/NULL)",
    color: "bg-orange-500",
    dbValues: {
      department: "OPERATIONS", sub_department: null,
      is_head: true, is_hr: false, is_super_admin: false,
    },
  },
  {
    label: "IT Head",
    desc: "IT sub-dept head (OPS/IT)",
    color: "bg-teal-500",
    dbValues: {
      department: "OPERATIONS", sub_department: "IT",
      is_head: true, is_hr: false, is_super_admin: false,
    },
  },
  {
    label: "Sales Manager (GOV)",
    desc: "Sales sub-dept head (SALES/GOV)",
    color: "bg-cyan-600",
    dbValues: {
      department: "SALES", sub_department: "GOV",
      is_head: true, is_hr: false, is_super_admin: false,
    },
  },
  {
    label: "Sales VP",
    desc: "Global Sales Head (SALES/NULL)",
    color: "bg-blue-600",
    dbValues: {
      department: "SALES", sub_department: null,
      is_head: true, is_hr: false, is_super_admin: false,
    },
  },
  {
    label: "HR Admin",
    desc: "HR + Head (Jen's view)",
    color: "bg-green-500",
    dbValues: {
      department: "ADMIN", sub_department: "ADMIN",
      is_head: true, is_hr: true, is_super_admin: false,
    },
  },
  {
    label: "Super Admin",
    desc: "Full system oversight",
    color: "bg-purple-500",
    dbValues: {
      department: "SUPER ADMIN", sub_department: null,
      is_head: true, is_hr: true, is_super_admin: true,
    },
  },
];

export default function RoleSwitcher() {
  const { user, handleLogin, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Only render for the test account
  if (!user || user.email !== TEST_EMAIL) return null;

  const activePreset = ROLE_PRESETS.find(
    (p) =>
      p.dbValues.is_head === (user.isHead || user.is_head || false) &&
      p.dbValues.is_hr === (user.isHr || user.is_hr || false) &&
      p.dbValues.is_super_admin === (user.isSuperAdmin || user.is_super_admin || false) &&
      p.dbValues.department === user.department
  );

  const handleSwitch = async (preset) => {
    setSwitching(true);
    try {
      // 1. Write directly to DB
      const { error } = await supabase
        .from("employees")
        .update(preset.dbValues)
        .eq("email", TEST_EMAIL);

      if (error) throw error;

      // 2. Re-fetch the employee from DB to get the fresh row
      const freshEmployee = await employeeService.getEmployeeByEmail(TEST_EMAIL);
      if (!freshEmployee) throw new Error("Could not re-fetch employee");

      // 3. Update localStorage session with fresh data
      const sessionUser = { ...freshEmployee, picture: user.picture };
      localStorage.setItem("t3ck_session", JSON.stringify(sessionUser));

      toast.success(`Switched to: ${preset.label}`, { icon: "🔬" });

      // 4. Hard reload to reset all queries and context
      setTimeout(() => window.location.reload(), 200);
    } catch (err) {
      console.error("Role switch failed:", err);
      toast.error("Failed to switch role: " + err.message);
      setSwitching(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-50 z-[9999]">
      {/* Expanded Panel */}
      {isOpen && (
        <div className="mb-2 bg-gray-1 border border-gray-4 rounded-xl shadow-2xl p-4 w-72 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black text-gray-12 uppercase tracking-wider flex items-center gap-1.5">
              <FlaskConical size={14} className="text-purple-400" />
              Role Switcher
            </h3>
            <span className="text-[9px] text-gray-8 font-mono">DB-LEVEL</span>
          </div>

          <div className="space-y-1.5">
            {ROLE_PRESETS.map((preset) => {
              const isActive = activePreset?.label === preset.label;
              return (
                <button
                  key={preset.label}
                  onClick={() => handleSwitch(preset)}
                  disabled={switching || isActive}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center gap-3 disabled:opacity-60 ${
                    isActive
                      ? "bg-purple-500/20 border border-purple-500/40 shadow-sm"
                      : "hover:bg-gray-3 border border-transparent"
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${preset.color} shrink-0 ${isActive ? "shadow-[0_0_8px_rgba(168,85,247,0.6)]" : ""}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${isActive ? "text-purple-400" : "text-gray-12"}`}>
                      {preset.label}
                    </p>
                    <p className="text-[10px] text-gray-9">{preset.desc}</p>
                  </div>
                  {isActive && <span className="text-[9px] text-purple-400 font-bold">ACTIVE</span>}
                </button>
              );
            })}
          </div>

          {switching && (
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-9 font-bold">
              <Loader2 size={14} className="animate-spin" /> Updating DB...
            </div>
          )}
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg transition-all active:scale-95 ${
          activePreset
            ? "bg-purple-600 hover:bg-purple-700 text-white"
            : "bg-gray-2 border border-gray-4 hover:border-gray-6 text-gray-12"
        }`}
      >
        <FlaskConical size={16} className={activePreset ? "text-white" : "text-purple-400"} />
        <span className="text-xs font-bold">
          {activePreset ? `Testing: ${activePreset.label}` : "Test Mode"}
        </span>
        {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
    </div>
  );
}
