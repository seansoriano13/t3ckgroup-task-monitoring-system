import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeService } from "../../../services/employeeService";
import { useAuth } from "../../../context/AuthContext";
import ProtectedRoute from "../../../components/ProtectedRoute.jsx";
import toast from "react-hot-toast";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

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

  const deleteMutation = useMutation({
    mutationFn: (id) => employeeService.deleteEmployee(id),
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
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-4 pb-4">
          <div>
            <h1 className="text-3xl font-black text-gray-12">
              Employee Management
            </h1>
            <p className="text-gray-9 mt-1 font-medium">
              Manage system access, roles, and departments.
            </p>
          </div>
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-bold transition-colors"
          >
            <UserPlus size={18} /> Add Employee
          </button>
        </div>

        <div className="bg-gray-2 border border-gray-4 p-4 rounded-xl flex gap-4 shadow-sm relative z-20">
          <div className="relative flex-1">
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
                    <td className="p-4 text-sm font-bold text-gray-12">
                      {emp.name}
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

function EmployeeFormModal({ employee, onClose }) {
  const queryClient = useQueryClient();
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

  const { data: rawCategories = [] } = useQuery({
    queryKey: ["allCategories"],
    queryFn: () => employeeService.getAllCategories(),
  });

  // SALES has its own flow and is not in the categories table,
  // so we inject it manually as a hardcoded option.
  const SALES_DEPT = "SALES";
  const SALES_SUB_DEPTS = ["GOV", "MARKETING", "NGO", "SALES"];

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
    if (!formData.department) return [];
    // SALES sub-depts are hardcoded since they don't exist in categories
    if (formData.department === SALES_DEPT) return SALES_SUB_DEPTS;
    return [
      ...new Set(
        rawCategories
          .filter((c) => c.department === formData.department)
          .map((c) => c.subDepartment)
          .filter(Boolean),
      ),
    ].sort();
  }, [rawCategories, formData.department]);

  const mutation = useMutation({
    mutationFn: (data) =>
      isEditing
        ? employeeService.updateEmployee(employee.id, data)
        : employeeService.createEmployee(data),
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
              <label className="text-xs font-bold text-gray-9 uppercase">
                Department
              </label>
              <select
                required
                value={formData.department}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    department: e.target.value,
                    subDepartment: "",
                  })
                }
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
            </div>
            <div>
              <label className="text-xs font-bold text-gray-9 uppercase">
                Sub-Dept
              </label>
              <select
                required
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
                {uniqueSubDepts.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
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
              101
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
