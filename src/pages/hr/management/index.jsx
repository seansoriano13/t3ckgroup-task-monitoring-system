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
} from "lucide-react";

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
          const signedResults = await storageService.getSignedUrls(supabasePaths);
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
        <div className="flex flex-col border-b border-gray-4 pb-4">
          <h1 className="text-3xl font-black text-gray-12">
            HR Management
          </h1>
          <p className="text-gray-9 mt-1 font-medium">
            Manage system access, roles, departments, and task categories.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-gray-2 border border-gray-4 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("employees")}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200 ${
              activeTab === "employees"
                ? "bg-gray-12 text-gray-1 shadow-md"
                : "text-gray-9 hover:text-gray-12 hover:bg-gray-3"
            }`}
          >
            Employees
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200 ${
              activeTab === "categories"
                ? "bg-gray-12 text-gray-1 shadow-md"
                : "text-gray-9 hover:text-gray-12 hover:bg-gray-3"
            }`}
          >
            Categories Config
          </button>
        </div>

        {activeTab === "employees" ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-gray-2 border border-gray-4 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative z-20">
              <div className="relative flex-1 md:max-w-sm">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-8"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-1 border border-gray-4 text-gray-12 rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-gray-6 transition-colors text-sm"
                />
              </div>
              <button
                onClick={handleAddNew}
                className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-lg font-bold transition-colors text-sm"
              >
                <UserPlus size={18} /> Add Employee
              </button>
            </div>

        <div className="bg-gray-2 border border-gray-4 rounded-xl shadow-lg overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-1 border-b border-gray-4 text-xs font-bold text-gray-9 uppercase tracking-wider">
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Department</th>
                <th className="p-4">Sub-Dept</th>
                <th className="p-4">Role</th>
                <th className="p-4">Role Flags</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-4">
              {isLoading ? (
                <tr>
                  <td
                    colSpan="6"
                    className="p-10 text-center text-gray-9 font-bold"
                  >
                    <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                    Loading employees...
                  </td>
                </tr>
              ) : filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-gray-3/30 transition-colors"
                  >
                    <td className="p-4 text-sm font-bold text-gray-12 flex items-center gap-3">
                      <img
                        src={resolvedAvatars[emp.id] || "/default-avatar.png"}
                        alt={emp.name}
                        className="w-10 h-10 rounded-full border border-gray-4 object-cover shadow-sm shrink-0"
                        onError={(e) => {
                          e.target.src = "/default-avatar.png";
                        }}
                      />
                      <div className="truncate">
                        <p>{emp.name}</p>
                        <p className="text-[10px] text-gray-9 font-medium uppercase tracking-tighter">
                          ID: {emp.id?.slice(0, 8)}...
                        </p>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-10">{emp.email}</td>
                    <td className="p-4 text-sm text-gray-11">
                      {emp.department || "-"}
                    </td>
                    <td className="p-4 text-sm text-gray-11">
                      {emp.subDepartment || "-"}
                    </td>
                    <td className="p-4 text-sm text-gray-11 font-medium">
                      {emp.role || "-"}
                    </td>
                    <td className="p-4 text-xs flex gap-1 items-center">
                      {emp.isSuperAdmin && (
                        <span className="bg-purple-100 text-purple-400 border border-purple-300 px-2 py-1 rounded font-bold flex items-center gap-1">
                          <Shield size={12} /> Super Admin
                        </span>
                      )}
                      {emp.isHr && (
                        <span className="bg-blue-100 text-blue-400 border border-blue-300 px-2 py-1 rounded font-bold">
                          HR
                        </span>
                      )}
                      {emp.isHead && (
                        <span className="bg-amber-100 text-amber-500 border border-amber-300 px-2 py-1 rounded font-bold">
                          Head
                        </span>
                      )}
                      {!emp.isSuperAdmin && !emp.isHr && !emp.isHead && (
                        <span className="bg-gray-3 text-gray-11 border border-gray-4 px-2 py-1 rounded font-bold">
                          Standard
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleEdit(emp)}
                        className="p-2 bg-gray-3 hover:bg-gray-4 text-gray-12 rounded-lg transition-colors inline-block"
                        title="Edit Employee"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(emp.id)}
                        className="p-2 bg-red-100 hover:bg-red-200 text-red-500 rounded-lg transition-colors inline-block"
                        title="Delete Employee"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="p-8 text-center text-gray-9 font-bold"
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

        {isModalOpen && (
          <EmployeeFormModal
            employee={editingEmployee}
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

// SALES has its own flow and is not in the categories table,
// so we inject it manually as a hardcoded option.
const SALES_DEPT = "SALES";
const SALES_SUB_DEPTS = ["GOV", "NGO", "SALES"];

function EmployeeFormModal({ employee, onClose }) {
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
    // Append SALES if not already present
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

    // Inject Hardcoded options
    if (department === SALES_DEPT) {
      // Add hardcoded SALES sub-depts if they aren't in categories
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
        : employeeService.createEmployee({ ...data, updatedBy: user?.id || null }),
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-1 border border-gray-4 rounded-xl w-full max-w-md shadow-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-12 flex items-center gap-2">
            {isEditing ? <Edit size={20} /> : <UserPlus size={20} />}
            {isEditing ? "Edit Employee" : "Add Employee"}
          </h2>
          <button onClick={onClose} className="text-gray-8 hover:text-gray-12">
            <XSquare size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-9 uppercase">
              Full Name
            </label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full bg-gray-2 border border-gray-4 rounded-lg p-2.5 mt-1 text-sm outline-none focus:border-primary text-gray-12"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-9 uppercase">
              Google Auth Email
            </label>
            <input
              required
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full bg-gray-2 border border-gray-4 rounded-lg p-2.5 mt-1 text-sm outline-none focus:border-primary text-gray-12"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-9 uppercase">
                  Department
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewDept((v) => !v);
                    setFormData((p) => ({ ...p, department: "", subDepartment: "" }));
                    setIsNewSubDept(false);
                  }}
                  className="text-[11px] font-bold text-primary hover:text-primary-hover transition-colors"
                >
                  {isNewDept ? "← Select Existing" : "+ Add New"}
                </button>
              </div>
              {isNewDept ? (
                <input
                  required
                  type="text"
                  placeholder="e.g. LOGISTICS"
                  value={formData.department}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setFormData((p) => ({ ...p, department: val, subDepartment: "" }));
                  }}
                  className="w-full bg-gray-2 border border-primary/40 rounded-lg p-2.5 mt-1 text-sm outline-none focus:border-primary text-gray-12 ring-1 ring-primary/20"
                />
              ) : (
                <select
                  required
                  value={formData.department}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      department: e.target.value,
                      subDepartment: "",
                    });
                    setIsNewSubDept(false);
                  }}
                  className="w-full bg-gray-2 border border-gray-4 rounded-lg p-2.5 mt-1 text-sm outline-none focus:border-primary text-gray-12"
                >
                  <option value="" disabled>
                    Select Dept
                  </option>
                  {uniqueDepts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-9 uppercase">
                  Sub-Dept
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewSubDept((v) => !v);
                    setFormData((p) => ({ ...p, subDepartment: "" }));
                  }}
                  disabled={!formData.department}
                  className="text-[11px] font-bold text-primary hover:text-primary-hover transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  {isNewSubDept ? "← Select Existing" : "+ Add New"}
                </button>
              </div>
              {isNewSubDept ? (
                <input
                  type="text"
                  placeholder="e.g. WAREHOUSE"
                  value={formData.subDepartment}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, subDepartment: e.target.value.toUpperCase() }))
                  }
                  disabled={!formData.department}
                  className="w-full bg-gray-2 border border-primary/40 rounded-lg p-2.5 mt-1 text-sm outline-none focus:border-primary text-gray-12 ring-1 ring-primary/20 disabled:opacity-50"
                />
              ) : (
                <select
                  value={formData.subDepartment}
                  onChange={(e) =>
                    setFormData({ ...formData, subDepartment: e.target.value })
                  }
                  disabled={!formData.department}
                  className="w-full bg-gray-2 border border-gray-4 rounded-lg p-2.5 mt-1 text-sm outline-none focus:border-primary text-gray-12 disabled:opacity-50"
                >
                  <option value="" disabled>
                    Select Sub-Dept
                  </option>
                  <option value="">None</option>
                  {uniqueSubDepts.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="col-span-2">
              <label className="text-xs font-bold text-gray-9 uppercase">
                Job Role / Title
              </label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                placeholder="e.g. MARKETING ASSISTANT"
                className="w-full bg-gray-2 border border-gray-4 rounded-lg p-2.5 mt-1 text-sm outline-none focus:border-primary text-gray-12"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-gray-4 space-y-2">
            <label className="text-xs font-bold text-gray-9 uppercase block mb-2">
              Role Assignments
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-12 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isHead}
                onChange={(e) =>
                  setFormData({ ...formData, isHead: e.target.checked })
                }
                className="rounded text-primary focus:ring-primary h-4 w-4 bg-gray-2 border-gray-4"
              />
              Department Head
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-12 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isHr}
                onChange={(e) =>
                  setFormData({ ...formData, isHr: e.target.checked })
                }
                className="rounded text-primary focus:ring-primary h-4 w-4 bg-gray-2 border-gray-4"
              />
              HR Administrator
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-12 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isSuperAdmin}
                onChange={(e) =>
                  setFormData({ ...formData, isSuperAdmin: e.target.checked })
                }
                className="rounded text-primary focus:ring-primary h-4 w-4 bg-gray-2 border-gray-4"
              />
              Super Admin
            </label>
          </div>

          <div className="pt-4 flex gap-3 border-t border-gray-4 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-3 hover:bg-gray-4 text-gray-12 font-bold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg transition-colors shadow-lg shadow-red-a3 disabled:opacity-50"
            >
              {mutation.isPending ? "Saving..." : "Save Details"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
