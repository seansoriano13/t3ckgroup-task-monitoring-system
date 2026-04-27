import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { employeeService } from "../services/employeeService";
import { FlaskConical, ChevronUp, ChevronDown } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import toast from "react-hot-toast";
import Select from "react-select";
import { defaultSelectStyles } from "../styles/selectStyles";

const TEST_EMAIL = "arkadatax03@gmail.com";

// Custom sleek toggle switch
const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
      checked ? "bg-mauve-12" : "bg-mauve-4"
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-card shadow ring-0 transition duration-200 ease-in-out ${
        checked ? "translate-x-4" : "translate-x-0"
      }`}
    />
  </button>
);

export default function RoleSwitcher() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [deptSubDeptPairs, setDeptSubDeptPairs] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form state
  const [formState, setFormState] = useState({
    department: "OPERATIONS",
    sub_department: "ALL",
    is_head: false,
    is_hr: false,
    is_super_admin: false,
  });

  useEffect(() => {
    setIsMounted(true);
    fetchDeptData();
  }, []);

  const fetchDeptData = async () => {
    try {
      // Fetch from BOTH categories and employees to capture all dept/sub_dept combos
      const [catResult, empResult] = await Promise.all([
        supabase
          .from("categories")
          .select("department, sub_department")
          .order("department"),
        supabase
          .from("employees")
          .select("department, sub_department")
          .neq("is_deleted", true)
          .order("department"),
      ]);

      const catData = catResult.data || [];
      const empData = empResult.data || [];

      // Merge and deduplicate
      const seen = new Set();
      const merged = [];
      [...catData, ...empData].forEach((row) => {
        const dept = row.department?.trim();
        const subDept = row.sub_department?.trim();
        if (!dept) return;
        const key = `${dept}::${subDept || ""}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push({ department: dept, sub_department: subDept || null });
        }
      });

      setDeptSubDeptPairs(merged);
    } catch (err) {
      console.error("Failed to fetch dept data for RoleSwitcher:", err);
    } finally {
      setLoadingData(false);
    }
  };

  // Sync form state when opened or user object changes
  useEffect(() => {
    if (isOpen && user) {
      setFormState({
        department: user.department || "OPERATIONS",
        sub_department: user.sub_department || "ALL",
        is_head: Boolean(user.is_head || user.isHead),
        is_hr: Boolean(user.is_hr || user.isHr),
        is_super_admin: Boolean(user.is_super_admin || user.isSuperAdmin),
      });
    }
  }, [isOpen, user]);

  if (!user || user.email !== TEST_EMAIL) return null;

  // ── Derived Options ────────────────────────────────────────
  const uniqueDepts = [
    ...new Set(
      deptSubDeptPairs
        .map((c) => c.department)
        .filter(Boolean)
        .filter((d) => d !== "ALL"),
    ),
  ].sort();
  const deptOptions = uniqueDepts.map((d) => ({ value: d, label: d }));

  const filteredSubDepts = [
    ...new Set(
      deptSubDeptPairs
        .filter((c) => c.department === formState.department)
        .map((c) => c.sub_department)
        .filter(Boolean)
        .filter((s) => s !== "ALL"),
    ),
  ].sort();

  const subDeptOptions = [
    { value: "ALL", label: "NULL / Dept-Wide" },
    ...filteredSubDepts.map((s) => ({ value: s, label: s })),
  ];

  const handleApply = async (configOverride) => {
    const config = configOverride || formState;
    setSwitching(true);
    try {
      const dbValues = {
        department: config.department,
        sub_department:
          config.sub_department === "ALL" ? null : config.sub_department,
        is_head: config.is_head,
        is_hr: config.is_hr,
        is_super_admin: config.is_super_admin,
      };

      const { error } = await supabase
        .from("employees")
        .update(dbValues)
        .eq("email", TEST_EMAIL);

      if (error) throw error;

      await employeeService.getEmployeeByEmail(TEST_EMAIL);
      toast.success("Simulation applied", {
        style: { background: "#111827", color: "#fff", fontSize: "13px" },
      });
      setTimeout(() => window.location.reload(), 300);
    } catch (err) {
      console.error("Role switch failed:", err);
      toast.error("Failed to apply configuration");
      setSwitching(false);
    }
  };

  const handleReset = () => {
    const adminConfig = {
      department: "SUPER ADMIN",
      sub_department: "ALL",
      is_head: true,
      is_hr: true,
      is_super_admin: true,
    };
    setFormState(adminConfig);
    handleApply(adminConfig);
  };

  const currentStatusText = () => {
    if (user.isSuperAdmin || user.is_super_admin) return "Testing: Super Admin";
    const d =
      user.department === "OPERATIONS" ? "OPS" : user.department || "N/A";
    const s = user.sub_department || "ALL";
    const h = user.isHead || user.is_head ? " (Head)" : "";
    return `Simulating: ${d} / ${s}${h}`;
  };

  return (
    <div className="fixed bottom-6 left-6 md:left-6 z-[99999]">
      {isOpen && (
        <div className="mb-4 bg-card border border-mauve-4 rounded-xl shadow-2xl w-80 animate-in fade-in slide-in-from-bottom-3 duration-300 overflow-visible">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-card border-b border-mauve-3 rounded-t-xl">
            <div className="flex items-center gap-2">
              <FlaskConical size={14} className="text-foreground" />
              <h3 className="text-[11px] font-bold text-foreground uppercase tracking-widest">
                Role Simulator
              </h3>
            </div>
            <button
              onClick={handleReset}
              className="text-[10px] text-muted-foreground hover:text-foreground font-bold transition-colors uppercase border border-mauve-4 px-2 py-1 rounded-md hover:border-mauve-12"
            >
              Reset
            </button>
          </div>

          <div className="p-5 space-y-6">
            {/* Field Sets */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest pl-1">
                  Department
                </label>
                <div className="relative">
                  <Select
                    instanceId="role-switcher-dept"
                    options={deptOptions}
                    value={
                      deptOptions.find(
                        (o) => o.value === formState.department,
                      ) || deptOptions[0]
                    }
                    onChange={(opt) => {
                      setFormState({
                        ...formState,
                        department: opt.value,
                        sub_department: "ALL",
                      });
                    }}
                    styles={defaultSelectStyles}
                    isSearchable={false}
                    menuPlacement="auto"
                    isLoading={loadingData}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest pl-1">
                  Sub-Department
                </label>
                <div className="relative">
                  <Select
                    instanceId="role-switcher-subdept"
                    options={subDeptOptions}
                    value={
                      subDeptOptions.find(
                        (o) => o.value === (formState.sub_department || "ALL"),
                      ) || subDeptOptions[0]
                    }
                    onChange={(opt) =>
                      setFormState({ ...formState, sub_department: opt.value })
                    }
                    styles={defaultSelectStyles}
                    isSearchable={true}
                    menuPlacement="auto"
                    placeholder="Select Sub-Dept"
                    isLoading={loadingData}
                  />
                </div>
              </div>
            </div>

            <div className="h-px bg-mauve-2" />

            {/* Toggles */}
            <div className="space-y-4">
              {[
                {
                  id: "is_head",
                  label: "is_head",
                  desc: "Grants approval authority",
                },
                {
                  id: "is_hr",
                  label: "is_hr",
                  desc: "Access to HR management tools",
                },
                {
                  id: "is_super_admin",
                  label: "is_super_admin",
                  desc: "Full root-level system access",
                },
              ].map((flag) => (
                <div
                  key={`toggle-${flag.id}`}
                  className="flex items-center justify-between group px-1"
                >
                  <div>
                    <p className="text-[13px] text-foreground font-bold leading-tight group-hover:text-black">
                      {flag.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                      {flag.desc}
                    </p>
                  </div>
                  <Toggle
                    checked={formState[flag.id]}
                    onChange={(v) =>
                      setFormState({ ...formState, [flag.id]: v })
                    }
                  />
                </div>
              ))}
            </div>

            {/* Action */}
            <button
              onClick={() => handleApply()}
              disabled={switching}
              className="w-full h-11 bg-[#111827] flex items-center justify-center gap-2 hover:bg-mauve-12 text-primary-foreground text-[13px] font-bold rounded-lg transition-all shadow-lg active:scale-[0.97] disabled:opacity-50"
            >
              {switching ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <FlaskConical size={16} />
                  <span>Update Configuration</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        className="flex items-center gap-3 px-6 py-3.5 rounded-full shadow-2xl transition-all active:scale-95 bg-[#111827] hover:bg-mauve-12 text-primary-foreground border border-white/5 group"
      >
        <div
          className={`p-1.5 rounded-md bg-card/10 group-hover:bg-card/20 transition-colors`}
        >
          <FlaskConical size={16} className="text-primary-foreground" />
        </div>
        <span className="text-[13px] font-bold tracking-wide uppercase hidden md:block">
          {currentStatusText()}
        </span>
        <div
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        >
          <ChevronUp size={14} className="opacity-40" />
        </div>
      </button>
    </div>
  );
}
