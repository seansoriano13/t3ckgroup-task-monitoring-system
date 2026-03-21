import { useState, useMemo } from "react";
import {
  Download,
  Search,
  CheckSquare,
  XSquare,
  UserPlus,
  Loader2,
} from "lucide-react";
import ProtectedRoute from "../../components/ProtectedRoute.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskService } from "../../services/taskService";
import { employeeService } from "../../services/employeeService";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

export default function HrMasterLogPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  // FETCH REAL DATA
  const { data: rawTasks = [], isLoading } = useQuery({
    queryKey: ["allTasks", "masterLog"],
    queryFn: () => taskService.getAllTasks(),
    enabled: !!user?.id,
  });

  // QUICK FILTER
  const filteredTasks = useMemo(() => {
    return rawTasks
      .filter(
        (task) =>
          (task.loggedByName?.toLowerCase() || "").includes(
            searchTerm.toLowerCase(),
          ) ||
          (task.categoryId?.toLowerCase() || "").includes(
            searchTerm.toLowerCase(),
          ),
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Newest first
  }, [rawTasks, searchTerm]);

  // THE CSV EXPORT ENGINE
  const handleExportCSV = () => {
    if (filteredTasks.length === 0) {
      toast.error("No data to export!");
      return;
    }

    const headers = [
      "Date Logged",
      "Employee Name",
      "Department",
      "Sub-Department",
      "Task Code",
      "Description",
      "Priority",
      "Manager Status",
      "Final Grade",
      "HR Verified",
    ];

    const csvContent = [
      headers.join(","), // Header row
      ...filteredTasks.map((t) => {
        // Sanitize fields containing commas or quotes for CSV safety
        const escapeCSV = (str) => `"${String(str || "").replace(/"/g, '""')}"`;

        return [
          new Date(t.createdAt).toLocaleDateString(),
          escapeCSV(t.loggedByName),
          escapeCSV(t.creator?.department || ""),
          escapeCSV(t.creator?.sub_department || ""),
          escapeCSV(t.categoryId),
          escapeCSV(t.taskDescription),
          escapeCSV(t.priority),
          escapeCSV(t.status),
          t.grade || "N/A",
          t.hrVerified ? "Yes" : "No",
        ].join(",");
      }),
    ].join("\n");

    // Trigger Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `HR_Master_Log_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV Exported Successfully!");
  };

  // VERIFY MUTATION (Optional fallback if they don't want to use the inbox)
  const verifyMutation = useMutation({
    mutationFn: (id) =>
      taskService.updateTask(id, {
        hrVerified: true,
        hrVerifiedAt: new Date().toISOString(),
        editedBy: user.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allTasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] });
      toast.success("Task forcefully verified.");
    },
  });

  return (
    <ProtectedRoute requireHr={true}>
      <div className="max-w-7xl mx-auto space-y-6 pb-10">
        {/* HEADER & TOP LEVEL STATS */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-4 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-12">HR Master Log</h1>
            <p className="text-gray-9 mt-1">
              Review, verify, and export company-wide timesheets.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setIsRegistering(true)}
              className="flex items-center gap-2 bg-gray-1 hover:bg-gray-3 border border-gray-4 text-gray-12 px-4 py-2 rounded-lg font-bold transition-colors"
            >
              <UserPlus size={18} className="" /> Allowlist Employee
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white shadow-lg shadow-red-a3 px-4 py-2 rounded-lg font-bold transition-colors active:scale-95"
            >
              <Download size={18} /> Export to Sheets
            </button>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="bg-gray-2 border border-gray-4 p-4 rounded-xl flex gap-4 shadow-sm">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-8"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by Employee Name or Project Code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-1 border border-gray-4 text-gray-12 rounded-lg pl-10 pr-4 py-2 outline-none focus:border-red-9 transition-colors placeholder:text-gray-7"
            />
          </div>
        </div>

        {/* THE HIGH-DENSITY DATA TABLE */}
        <div className="bg-gray-2 border border-gray-4 rounded-xl shadow-lg overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-1 border-b border-gray-4 text-xs font-bold text-gray-9 uppercase tracking-wider">
                <th className="p-4">Date</th>
                <th className="p-4">Employee</th>
                <th className="p-4">Code</th>
                <th className="p-4 w-1/3">Description</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Grade</th>
                <th className="p-4 text-right">Verification</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-4">
              {isLoading ? (
                <tr>
                  <td
                    colSpan="7"
                    className="p-10 text-center text-gray-9 font-bold"
                  >
                    <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                    Syncing Master Log...
                  </td>
                </tr>
              ) : filteredTasks.length > 0 ? (
                filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="hover:bg-gray-3/30 transition-colors"
                  >
                    <td className="p-4 text-sm text-gray-10">
                      {new Date(task.createdAt || "").toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm font-bold text-gray-12">
                      {task.loggedByName}
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-bold text-gray-11 bg-gray-3 px-2 py-1 rounded border border-gray-4">
                        {task.categoryId}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-11 truncate max-w-xs">
                      {task.taskDescription}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="p-4 text-sm font-bold text-gray-12 text-center">
                      {task.grade > 0 ? task.grade : "-"}
                    </td>
                    <td className="p-4 text-right">
                      {task.hrVerified ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-500 uppercase tracking-wider bg-green-900/10 px-3 py-1.5 rounded-full border border-green-900/20">
                          <CheckSquare size={14} /> Verified
                        </span>
                      ) : task.status === "COMPLETE" ? (
                        <button
                          onClick={() => verifyMutation.mutate(task.id)}
                          className="text-xs font-bold text-primary hover:text-white bg-primary/10 hover:bg-primary px-3 py-1.5 rounded-full border border-primary/20 transition-colors"
                        >
                          Force Verify
                        </button>
                      ) : (
                        <span className="text-xs text-gray-8 italic">
                          Awaiting Manager
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    className="p-8 text-center text-gray-9 font-bold"
                  >
                    No records match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* INLINE REGISTRATION MODAL (Simple) */}
        {isRegistering && (
          <RegisterEmployeeModal onClose={() => setIsRegistering(false)} />
        )}
      </div>
    </ProtectedRoute>
  );
}

// Quick Inline Component for the form
function RegisterEmployeeModal({ onClose }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    subDepartment: "",
    role: "EMPLOYEE",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: rawCategories = [] } = useQuery({
    queryKey: ["allCategories"],
    queryFn: () => employeeService.getAllCategories(),
  });

  // Extract unique Departments
  const uniqueDepts = useMemo(() => {
    return [
      ...new Set(rawCategories.map((c) => c.department).filter(Boolean)),
    ].sort();
  }, [rawCategories]);

  // Extract unique Sub-Departments based on the selected Department
  const uniqueSubDepts = useMemo(() => {
    if (!formData.department) return [];
    const filteredCats = rawCategories.filter(
      (c) => c.department === formData.department,
    );
    return [
      ...new Set(filteredCats.map((c) => c.subDepartment).filter(Boolean)),
    ].sort();
  }, [rawCategories, formData.department]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await employeeService.createEmployee({
        ...formData,
        isHead: formData.role === "HEAD",
        isHr: formData.role === "HR",
      });
      toast.success("Employee allowlisted successfully!");
      onClose();
    } catch (error) {
      toast.error(error.message || "Failed to add employee.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-1 border border-gray-4 rounded-xl w-full max-w-md shadow-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-12 flex items-center gap-2">
            <UserPlus size={20} /> Allowlist Employee
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
              placeholder="employee@company.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-9 uppercase">
                Department
              </label>
              {/* Replace input with this select */}
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
              {/* Replace input with this select */}
              <select
                required
                value={formData.subDepartment}
                onChange={(e) =>
                  setFormData({ ...formData, subDepartment: e.target.value })
                }
                disabled={!formData.department}
                className="w-full bg-gray-2 border border-gray-4 rounded-lg p-2.5 mt-1 text-sm outline-none focus:border-primary text-gray-12 disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>
          <div>
            <label className="text-xs font-bold text-gray-9 uppercase">
              System Role
            </label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              className="w-full bg-gray-2 border border-gray-4 rounded-lg p-2.5 mt-1 text-sm outline-none focus:border-primary text-gray-12"
            >
              <option value="EMPLOYEE">Standard Employee</option>
              <option value="HEAD">Department Head</option>
              <option value="HR">HR Administrator</option>
            </select>
          </div>
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-3 hover:bg-gray-4 text-gray-12 font-bold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-green-600 hover:bg-green-800 text-white font-bold rounded-lg transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Add to Allowlist"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
