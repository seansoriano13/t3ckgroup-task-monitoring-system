import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeService } from "../../../services/employeeService";
import ProtectedRoute from "../../../components/ProtectedRoute.jsx";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import { storageService } from "../../../services/storageService";
import HRCategoriesConfig from "../../../components/HRCategoriesConfig.jsx";
import {
  Search,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  Loader2,
  XSquare,
  Building2,
  Briefcase,
  ChevronDown,
  Info,
} from "lucide-react";
import Dropdown from "../../../components/ui/Dropdown";
import PropertyPill from "../../../components/ui/PropertyPill";
import { FilterOptionList } from "../../../components/ui/FilterDropdown";
import { Dialog, DialogContent } from "../../../components/ui/dialog";
import { Users } from "lucide-react";

export default function EmployeeManagement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("employees");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [resolvedAvatars, setResolvedAvatars] = useState({});

  const HTTP_URL_RE = /^https?:\/\//i;

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["allEmployees"],
    queryFn: () => employeeService.getAllEmployees(),
  });

  const filteredEmployees = useMemo(() => {
    return employees.filter(
      (emp) =>
        emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [employees, searchTerm]);

  // Resolve avatars to signed URLs in batch
  useEffect(() => {
    if (employees.length === 0) return;

    const resolveAvatars = async () => {
      const supabasePaths = [];
      const newResolved = { ...resolvedAvatars };

      employees.forEach((emp) => {
        if (emp.avatarPath) {
          if (HTTP_URL_RE.test(emp.avatarPath)) {
            newResolved[emp.id] = emp.avatarPath;
          } else {
            supabasePaths.push(emp.avatarPath);
          }
        }
      });

      if (supabasePaths.length > 0) {
        try {
          const signedResults =
            await storageService.getSignedUrls(supabasePaths);
          signedResults.forEach((res) => {
            const emp = employees.find((e) => e.avatarPath === res.path);
            if (emp) {
              newResolved[emp.id] = res.signedUrl;
            }
          });
        } catch (error) {
          console.error("Failed to batch resolve avatars:", error);
        }
      }

      setResolvedAvatars(newResolved);
    };

    resolveAvatars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees]);

  const deleteMutation = useMutation({
    mutationFn: (id) => employeeService.deleteEmployee(id, user?.id || null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allEmployees"] });
      toast.success("Employee deleted successfully");
    },
    onError: (err) => toast.error("Failed to delete employee: " + err.message),
  });

  const handleDelete = (id) => {
    if (
      window.confirm(
        "Are you sure you want to delete this employee? This action cannot be undone.",
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingEmployee(null);
    setIsModalOpen(true);
  };

  return (
    <ProtectedRoute requireHr={true}>
      <div className="max-w-7xl mx-auto space-y-6 pb-10 px-2 sm:px-0">
        <div className="flex flex-col border-b border-border pb-6">
          <h1 className="text-4xl font-black text-foreground tracking-tight">
            HR Management
          </h1>
          <p className="text-muted-foreground mt-1.5 font-medium text-sm uppercase tracking-[0.15em]">
            Manage system access, roles, departments, and task categories.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-xl w-fit shadow-sm">
          <button
            onClick={() => setActiveTab("employees")}
            className={`px-4 py-2 rounded-lg font-black text-[11px] uppercase tracking-widest transition-all duration-200 ${
              activeTab === "employees"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Employees
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`px-4 py-2 rounded-lg font-black text-[11px] uppercase tracking-widest transition-all duration-200 ${
              activeTab === "categories"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Categories Config
          </button>
        </div>

        {activeTab === "employees" ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-card border border-border p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative z-20">
              <div className="relative flex-1 md:max-w-sm">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-muted/40 border border-border text-foreground rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all text-sm"
                />
              </div>
              <button
                onClick={handleAddNew}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-100"
              >
                <UserPlus size={16} /> Add Employee
              </button>
            </div>

            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Sub-Dept</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Role Flags</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="p-10 text-center text-muted-foreground font-bold"
                      >
                        <Loader2
                          size={24}
                          className="animate-spin mx-auto mb-2 text-indigo-500"
                        />
                        Loading employees...
                      </td>
                    </tr>
                  ) : filteredEmployees.length > 0 ? (
                    filteredEmployees.map((emp) => (
                      <tr
                        key={emp.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-4 text-sm font-bold text-foreground flex items-center gap-3">
                          <img
                            src={
                              resolvedAvatars[emp.id] || "/default-avatar.png"
                            }
                            alt={emp.name}
                            className="w-9 h-9 rounded-xl border border-border object-cover shadow-sm shrink-0"
                            onError={(e) => {
                              e.target.src = "/default-avatar.png";
                            }}
                          />
                          <div className="truncate">
                            <p className="font-black text-foreground">
                              {emp.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                              {emp.id?.slice(0, 8)}...
                            </p>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {emp.email}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {emp.department || "-"}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {emp.subDepartment || "-"}
                        </td>
                        <td className="p-4 text-sm text-foreground font-semibold">
                          {emp.role || "-"}
                        </td>
                        <td className="p-4 text-xs flex gap-1">
                          {emp.isSuperAdmin && (
                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-lg font-black text-[10px] flex items-center gap-1 uppercase tracking-wider">
                              <Shield size={11} /> Super Admin
                            </span>
                          )}
                          {emp.isHr && (
                            <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider">
                              HR
                            </span>
                          )}
                          {emp.isHead && (
                            <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider">
                              Head
                            </span>
                          )}
                          {!emp.isSuperAdmin && !emp.isHr && !emp.isHead && (
                            <span className="bg-muted text-muted-foreground border border-border px-2.5 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider">
                              Standard
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => handleEdit(emp)}
                            className="p-2 bg-muted hover:bg-muted/70 text-foreground rounded-xl transition-all inline-block hover:border-indigo-200 border border-transparent"
                            title="Edit Employee"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(emp.id)}
                            className="p-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-xl transition-all inline-block border border-transparent hover:border-destructive/20"
                            title="Delete Employee"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        className="p-10 text-center text-muted-foreground font-bold italic text-sm"
                      >
                        No employees found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <HRCategoriesConfig />
          </div>
        )}

        <EmployeeFormModal
          isOpen={isModalOpen}
          employee={editingEmployee}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    </ProtectedRoute>
  );
}

// SALES has its own flow and is not in the categories table,
// so we inject it manually as a hardcoded option.
const SALES_DEPT = "SALES";
const SALES_SUB_DEPTS = ["GOV", "NGO", "SALES"];

function EmployeeFormModal({ isOpen, employee, onClose }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isEditing = !!employee;

  const [formData, setFormData] = useState(() => {
    if (employee) {
      return {
        name: employee.name || "",
        email: employee.email || "",
        department: employee.department || "",
        subDepartment: employee.subDepartment || "",
        role: employee.role || "",
        isHead: employee.isHead || false,
        isHr: employee.isHr || false,
        isSuperAdmin: employee.isSuperAdmin || false,
      };
    }
    return {
      name: "",
      email: "",
      department: "",
      subDepartment: "",
      role: "",
      isHead: false,
      isHr: false,
      isSuperAdmin: false,
    };
  });

  const [isNewDept, setIsNewDept] = useState(false);
  const [isNewSubDept, setIsNewSubDept] = useState(false);

  const { data: rawCategories = [] } = useQuery({
    queryKey: ["allCategories"],
    queryFn: () => employeeService.getAllCategories(),
  });

  const { department } = formData;

  const uniqueDepts = useMemo(() => {
    const fromCategories = [
      ...new Set(rawCategories.map((c) => c.department).filter(Boolean)),
    ].sort();
    if (!fromCategories.includes(SALES_DEPT)) {
      fromCategories.push(SALES_DEPT);
    }
    return fromCategories;
  }, [rawCategories]);

  const uniqueSubDepts = useMemo(() => {
    if (!department) return [];
    let subDepts = [
      ...new Set(
        rawCategories
          .filter((c) => c.department === department)
          .map((c) => c.subDepartment)
          .filter(Boolean),
      ),
    ];
    if (department === SALES_DEPT) {
      SALES_SUB_DEPTS.forEach((s) => {
        if (!subDepts.includes(s)) subDepts.push(s);
      });
    }
    if (department === "OPERATIONS") {
      if (!subDepts.includes("MARKETING")) subDepts.push("MARKETING");
    }
    return subDepts.sort();
  }, [rawCategories, department]);

  const mutation = useMutation({
    mutationFn: (data) =>
      isEditing
        ? employeeService.updateEmployee(employee.id, data, user?.id || null)
        : employeeService.createEmployee({
            ...data,
            updatedBy: user?.id || null,
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allEmployees"] });
      toast.success(isEditing ? "Employee updated!" : "Employee added!");
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save employee.");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent
      showCloseButton={false}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-popover text-sm text-popover-foreground ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 p-0 gap-0 z-[70] shadow-[0_10px_40px_-10px_rgba(79,70,229,0.15)] flex flex-col transition-all duration-300 w-[680px] sm:max-w-none max-w-[95vw] rounded-2xl max-h-[90vh] overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-border shrink-0 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-foreground flex items-center gap-2">
            {isEditing ? (
              <Edit size={20} className="text-indigo-500" />
            ) : (
              <UserPlus size={20} className="text-indigo-500" />
            )}
            {isEditing ? "Edit Employee" : "Add Employee"}
          </h2>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
            {isEditing
              ? `Employee ID: ${employee.id?.slice(0, 8)}...`
              : "Define system access & roles"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground"
        >
          <XSquare size={20} />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        <form id="employee-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div className="group">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block ml-1">
                Full Name
              </label>
              <div className="relative">
                <input
                  required
                  type="text"
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all text-foreground font-medium"
                />
              </div>
            </div>

            <div className="group">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block ml-1">
                Google Auth Email
              </label>
              <div className="relative">
                <input
                  required
                  type="email"
                  placeholder="e.g. john@t3ckgroup.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all text-foreground font-medium"
                />
              </div>
            </div>

            <div className="group">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block ml-1">
                Job Role / Title
              </label>
              <div className="relative">
                <Briefcase
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  placeholder="e.g. MARKETING ASSISTANT"
                  className="w-full bg-muted/40 border border-border rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all text-foreground font-medium"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 py-4 border-t border-b border-border/50">
            {/* Department Selection */}
            <Dropdown
              popoverClassName="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-xl shadow-2xl z-[100] w-[240px] popover-enter"
              trigger={({ isOpen }) => (
                <PropertyPill
                  isActive={!!formData.department || isOpen}
                  icon={Building2}
                >
                  <span>{formData.department || "Set Department"}</span>
                  <ChevronDown
                    size={12}
                    className={`ml-1 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </PropertyPill>
              )}
            >
              {({ close }) => (
                <div className="p-1">
                  <div className="px-3 py-2 border-b border-border mb-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Select Department
                    </p>
                  </div>
                  <FilterOptionList
                    options={uniqueDepts.map((d) => ({ label: d, value: d }))}
                    value={formData.department}
                    onChange={(val) => {
                      setFormData({
                        ...formData,
                        department: val,
                        subDepartment: "",
                      });
                      setIsNewDept(false);
                    }}
                    close={close}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewDept(true);
                      setFormData({
                        ...formData,
                        department: "",
                        subDepartment: "",
                      });
                      close();
                    }}
                    className="w-full text-left px-3 py-2 rounded-md text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 transition-colors uppercase tracking-wider"
                  >
                    + Add New Department
                  </button>
                </div>
              )}
            </Dropdown>

            {/* Sub-Department Selection */}
            <Dropdown
              disabled={!formData.department}
              popoverClassName="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-xl shadow-2xl z-[100] w-[240px] popover-enter"
              trigger={({ isOpen, disabled }) => (
                <PropertyPill
                  isActive={(!!formData.subDepartment || isOpen) && !disabled}
                  disabled={disabled}
                  icon={Building2}
                >
                  <span>{formData.subDepartment || "Set Sub-Dept"}</span>
                  {!disabled && (
                    <ChevronDown
                      size={12}
                      className={`ml-1 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  )}
                </PropertyPill>
              )}
            >
              {({ close }) => (
                <div className="p-1">
                  <div className="px-3 py-2 border-b border-border mb-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Select Sub-Dept
                    </p>
                  </div>
                  <FilterOptionList
                    options={[
                      { label: "None", value: "" },
                      ...uniqueSubDepts.map((s) => ({ label: s, value: s })),
                    ]}
                    value={formData.subDepartment}
                    onChange={(val) => {
                      setFormData({ ...formData, subDepartment: val });
                      setIsNewSubDept(false);
                    }}
                    close={close}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewSubDept(true);
                      setFormData({ ...formData, subDepartment: "" });
                      close();
                    }}
                    className="w-full text-left px-3 py-2 rounded-md text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 transition-colors uppercase tracking-wider"
                  >
                    + Add New Sub-Dept
                  </button>
                </div>
              )}
            </Dropdown>
          </div>

          {/* Managed Mode Inputs (Fallback) */}
          {(isNewDept || isNewSubDept) && (
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-3 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-1">
                <Info size={14} className="text-indigo-600" />
                <p className="text-[11px] font-black text-indigo-900 uppercase tracking-widest">
                  Manual Entry Mode
                </p>
              </div>
              {isNewDept && (
                <div>
                  <label className="text-[9px] font-bold text-indigo-900/60 uppercase tracking-wider mb-1 block">
                    New Department
                  </label>
                  <input
                    required
                    type="text"
                    autoFocus
                    placeholder="e.g. LOGISTICS"
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        department: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500 transition-all font-bold"
                  />
                </div>
              )}
              {isNewSubDept && (
                <div>
                  <label className="text-[9px] font-bold text-indigo-900/60 uppercase tracking-wider mb-1 block">
                    New Sub-Department
                  </label>
                  <input
                    required
                    type="text"
                    autoFocus
                    placeholder="e.g. WAREHOUSE"
                    value={formData.subDepartment}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        subDepartment: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500 transition-all font-bold"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsNewDept(false);
                  setIsNewSubDept(false);
                  setFormData({
                    ...formData,
                    department: "",
                    subDepartment: "",
                  });
                }}
                className="text-[10px] font-bold text-indigo-600 hover:underline"
              >
                Cancel manual entry
              </button>
            </div>
          )}

          <div className="space-y-2 pt-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 block ml-1">
              System Access Rights
            </label>
            <div className="grid grid-cols-1 gap-2">
              <label className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/30 cursor-pointer transition-colors group">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${formData.isHead ? "bg-amber-100 text-amber-600" : "bg-muted text-slate-400 group-hover:bg-amber-50"}`}
                  >
                    <Shield size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      Department Head
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      Grant approval rights for this dept
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isHead}
                  onChange={(e) =>
                    setFormData({ ...formData, isHead: e.target.checked })
                  }
                  className="rounded-full text-indigo-600 focus:ring-transparent h-5 w-5 bg-card border-border border-2"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/30 cursor-pointer transition-colors group">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${formData.isHr ? "bg-blue-100 text-blue-600" : "bg-muted text-slate-400 group-hover:bg-blue-50"}`}
                  >
                    <Users size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      HR Admin
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      Access to employee & category management
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isHr}
                  onChange={(e) =>
                    setFormData({ ...formData, isHr: e.target.checked })
                  }
                  className="rounded-full text-indigo-600 focus:ring-transparent h-5 w-5 bg-card border-border border-2"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/30 cursor-pointer transition-colors group">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${formData.isSuperAdmin ? "bg-indigo-100 text-indigo-600" : "bg-muted text-slate-400 group-hover:bg-indigo-50"}`}
                  >
                    <Shield size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      Super Admin
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      Full global system control
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isSuperAdmin}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      isSuperAdmin: e.target.checked,
                    })
                  }
                  className="rounded-full text-indigo-600 focus:ring-transparent h-5 w-5 bg-card border-border border-2"
                />
              </label>
            </div>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-end gap-3 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-3.5 bg-muted hover:bg-muted/70 text-foreground font-black rounded-2xl transition-all text-[11px] uppercase tracking-widest active:scale-95"
        >
          Cancel
        </button>
        <button
          type="submit"
          form="employee-form"
          disabled={mutation.isPending}
          className="px-10 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-200 disabled:opacity-50 text-[11px] uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2"
        >
          {mutation.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : null}
          {mutation.isPending ? "Saving..." : "Save Employee"}
        </button>
      </div>
    </DialogContent>
    </Dialog>
  );
}
