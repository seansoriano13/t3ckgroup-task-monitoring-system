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
  XSquare,
  Building2,
  Briefcase,
  ChevronDown,
  Info,
} from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import { ListCheck } from "lucide-react";
import Dropdown from "../../../components/ui/Dropdown";
import {
  FilterTrigger,
  FilterOptionList,
} from "../../../components/ui/FilterDropdown";
import { Dialog, DialogContent } from "../../../components/ui/dialog";
import { Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import PageHeader from "../../../components/ui/PageHeader";
import PageContainer from "../../../components/ui/PageContainer";
import TabGroup from "../../../components/ui/TabGroup";
import HighlightText from "../../../components/HighlightText";
import Avatar from "@/components/Avatar";
import { useEmployeeAvatarMap } from "../../../hooks/useEmployeeAvatarMap";
import PrimaryButton from "@/components/PrimaryButton";
import { Button } from "@/components/ui/button";
import HRFormModal from "../../../components/hr/HRFormModal";
import EmployeeForm from "../../../components/hr/EmployeeForm";

export default function EmployeeManagement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("employees");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const avatarMap = useEmployeeAvatarMap();
  const resolvedAvatars = useMemo(
    () => Object.fromEntries(avatarMap),
    [avatarMap],
  );

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
      <PageContainer className="pt-4">
        <PageHeader
          title="HR Management"
          description="Manage system access, roles, departments, and task categories."
        />

        {/* Tabs */}
        <TabGroup
          variant="pill"
          tabs={[
            { value: "employees", label: "Employees" },
            { value: "categories", label: "Categories Config" },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
          size="md"
        />

        {activeTab === "employees" ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-card border border-border p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative z-20">
              <div className="relative flex-1 md:max-w-sm">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-muted/40 border border-border text-foreground rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-mauve-8 focus:ring-2 focus:ring-mauve-4 transition-all text-sm"
                />
              </div>
              <Button
                className={"h-9 px-6 rounded-xl shadow-lg shadow-primary/20"}
                onClick={handleAddNew}
              >
                <UserPlus size={16} />
                <p>Add Employee</p>
              </Button>
            </div>

            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em]">
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
                        <Spinner size="md" />
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
                          <Avatar
                            src={resolvedAvatars[emp.id]}
                            name={emp.name}
                            size="md"
                            className="w-9 h-9"
                          />
                          <div className="truncate">
                            <p className="font-black text-foreground">
                              <HighlightText
                                text={emp.name}
                                search={searchTerm}
                              />
                            </p>

                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                              {emp.id?.slice(0, 8)}...
                            </p>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          <HighlightText text={emp.email} search={searchTerm} />
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
                            <span className="bg-violet-2 text-violet-11 border border-mauve-5 px-2.5 py-1 rounded-lg font-black text-[10px] flex items-center gap-1 uppercase tracking-wider">
                              <Shield size={11} /> Super Admin
                            </span>
                          )}
                          {emp.isHr && (
                            <span className="bg-blue-2 text-blue-11 border border-blue-6 px-2.5 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider">
                              HR
                            </span>
                          )}
                          {emp.isHead && (
                            <span className="bg-amber-2 text-amber-11 border border-amber-6 px-2.5 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider">
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
                            className="p-2 bg-muted hover:bg-muted/70 text-foreground rounded-xl transition-all inline-block hover:border-mauve-5 border border-transparent"
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
      </PageContainer>
    </ProtectedRoute>
  );
}

function EmployeeFormModal({ isOpen, employee, onClose }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isEditing = !!employee;

  const { data: rawCategories = [] } = useQuery({
    queryKey: ["allCategories"],
    queryFn: () => employeeService.getAllCategories(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["allEmployees"],
    queryFn: () => employeeService.getAllEmployees(),
  });

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

  return (
    <HRFormModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Employee" : "Add Employee"}
      subtitle={
        isEditing
          ? `Employee ID: ${employee.id?.slice(0, 8)}...`
          : "Define system access & roles"
      }
      icon={isEditing ? Edit : UserPlus}
      formId="employee-form"
      isPending={mutation.isPending}
      submitLabel={isEditing ? "Update Employee" : "Add Employee"}
    >
      <EmployeeForm
        initialData={employee}
        onSubmit={(data) => mutation.mutate(data)}
        rawCategories={rawCategories}
        rawEmployees={employees}
      />
    </HRFormModal>
  );
}
