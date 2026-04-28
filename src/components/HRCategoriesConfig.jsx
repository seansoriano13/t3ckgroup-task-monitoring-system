import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2, XSquare, Building2, Info, ChevronDown } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import { employeeService } from "../services/employeeService";
import { useAuth } from "../context/AuthContext";
import { confirmDeleteToast } from "./ui/CustomToast";
import { Dialog, DialogContent } from "./ui/dialog";
import Dropdown from "./ui/Dropdown";
import PropertyPill from "./ui/PropertyPill";
import { FilterOptionList } from "./ui/FilterDropdown";

export default function HRCategoriesConfig() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const {
    data: categories = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["allCategories"],
    queryFn: () => employeeService.getAllCategories(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["allEmployees"],
    queryFn: () => employeeService.getAllEmployees(),
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewDept, setIsNewDept] = useState(false);
  const [isNewSubDept, setIsNewSubDept] = useState(false);

  const emptyForm = useMemo(
    () => ({
      categoryId: "",
      description: "",
      department: "",
      subDepartment: "",
    }),
    [],
  );

  const [formData, setFormData] = useState(emptyForm);

  const uniqueDepts = useMemo(() => {
    return [
      ...new Set(
        employees
          .map((e) => e.department)
          .filter((d) => typeof d === "string" && d.trim()),
      ),
    ].sort();
  }, [employees]);

  const uniqueSubDepts = useMemo(() => {
    const dept = formData.department;
    if (!dept) return [];

    const fromEmployees = employees
      .filter((e) => e.department === dept)
      .map((e) => e.subDepartment)
      .filter((s) => typeof s === "string" && s.trim());

    const fromCategories = categories
      .filter((c) => c.department === dept)
      .map((c) => c.subDepartment)
      .filter((s) => typeof s === "string" && s.trim());

    return [...new Set([...fromEmployees, ...fromCategories])].sort();
  }, [employees, categories, formData.department]);

  const openAdd = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setIsNewDept(false);
    setIsNewSubDept(false);
    setIsModalOpen(true);
  };

  const openEdit = (cat) => {
    setEditingId(cat.id);
    setFormData({
      categoryId: cat.categoryId || "",
      description: cat.description || "",
      department: cat.department || "",
      subDepartment: cat.subDepartment || "",
    });
    setIsNewDept(false);
    setIsNewSubDept(false);
    setIsModalOpen(true);
  };

  const upsertMutation = useMutation({
    mutationFn: async ({ mode, id, data }) => {
      const actorId = user?.id || null;
      if (mode === "edit") return employeeService.updateCategory(id, data, actorId);
      return employeeService.createCategory({ ...data, updatedBy: actorId });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["allCategories"] });
      toast.success(
        variables.mode === "edit" ? "Category updated!" : "Category added!",
      );
      setIsModalOpen(false);
    },
    onError: (err) => {
      toast.error(err?.message || "Failed to save category.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (cat) => {
      const inUse = await employeeService.isCategoryInUse(cat.categoryId);
      if (inUse) {
        throw new Error(
          "This category is already used by existing tasks. Delete is blocked to prevent breaking task mappings.",
        );
      }

      return employeeService.deleteCategory(cat.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allCategories"] });
      toast.success("Category deleted.");
    },
    onError: (err) => toast.error(err?.message || "Failed to delete category."),
  });

  const filteredCategories = useMemo(() => {
    return categories.filter(
      (cat) =>
        cat.categoryId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.subDepartment.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [categories, searchTerm]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.categoryId.trim()) return toast.error("Category ID is required.");
    if (!formData.description.trim())
      return toast.error("Description is required.");
    if (!formData.department.trim()) return toast.error("Department is required.");
    if (!formData.subDepartment.trim())
      return toast.error("Sub-Department is required.");

    const mode = editingId ? "edit" : "add";
    upsertMutation.mutate({
      mode,
      id: editingId,
      data: {
        categoryId: formData.categoryId.trim(),
        description: formData.description.trim(),
        department: formData.department.trim(),
        subDepartment: formData.subDepartment.trim(),
      },
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-mauve-2 border border-mauve-4 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative z-20">
        <div className="relative flex-1 md:max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-mauve-8"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-mauve-1 border border-mauve-4 text-foreground rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-mauve-6 transition-colors text-sm"
          />
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground px-4 py-2.5 rounded-lg font-bold transition-colors text-sm shadow-sm active:scale-95"
        >
          <Plus size={18} /> Add Category
        </button>
      </div>

      <div className="bg-mauve-2 border border-mauve-4 rounded-xl shadow-lg overflow-x-auto">
        {isLoading ? (
          <div className="py-10 flex flex-col items-center justify-center gap-3">
            <Spinner size="md" />
            <p className="text-muted-foreground font-bold">Loading categories...</p>
          </div>
        ) : isError ? (
          <div className="p-8 text-center bg-red-a2 border-b border-red-a5">
            <p className="text-red-11 font-bold">Failed to load categories.</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground font-bold">
            No categories found. Add the first one.
          </div>
        ) : (
          <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-mauve-1 border-b border-mauve-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="p-4">Category ID</th>
                    <th className="p-4 w-1/3">Description</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Sub-Department</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-4">
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map((cat) => (
                      <tr
                        key={cat.id}
                        className="hover:bg-mauve-3/30 transition-colors"
                      >
                      <td className="p-4">
                        <span className="text-xs font-bold text-foreground bg-mauve-3 px-2 py-1 rounded border border-mauve-4">
                          {cat.categoryId}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-mauve-11 truncate max-w-xs">
                        {cat.description}
                      </td>
                      <td className="p-4 text-sm text-mauve-11">
                        {cat.department || "-"}
                      </td>
                      <td className="p-4 text-sm text-mauve-11">
                        {cat.subDepartment || "-"}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => openEdit(cat)}
                          className="p-2 bg-mauve-3 hover:bg-mauve-4 text-foreground rounded-lg transition-colors inline-block"
                          title="Edit Category"
                        >
                          <Edit size={16} />
                        </button>
                         <button
                          onClick={() => {
                            confirmDeleteToast(
                              `Delete Category?`,
                              `"${cat.categoryId}" will be permanently removed. This cannot be undone.`,
                              () => deleteMutation.mutate(cat)
                            );
                          }}
                          className="p-2 bg-red-900/20 hover:bg-red-900/40 text-destructive rounded-lg transition-colors inline-block"
                          title="Delete Category"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      className="p-8 text-center text-muted-foreground font-bold"
                    >
                      No categories found matching your search.
                    </td>
                  </tr>
                )}
                </tbody>
              </table>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && setIsModalOpen(false)}>
        <DialogContent
          showCloseButton={false}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-popover text-sm text-popover-foreground ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 p-0 gap-0 z-[70] shadow-[0_10px_40px_-10px_rgba(79,70,229,0.15)] flex flex-col transition-all duration-300 w-[680px] sm:max-w-none max-w-[95vw] rounded-2xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border shrink-0 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                {editingId ? (
                  <Edit size={20} className="text-violet-9" />
                ) : (
                  <Plus size={20} className="text-violet-9" />
                )}
                {editingId ? "Edit Category" : "Add Category"}
              </h2>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
                {editingId
                  ? `Category ID: ${formData.categoryId}`
                  : "Define task categories"}
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground"
            >
              <XSquare size={20} />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-4">
                <div className="group">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block ml-1">
                    Category ID
                  </label>
                  <div className="relative">
                    <input
                      required
                      type="text"
                      value={formData.categoryId}
                      disabled={!!editingId}
                      onChange={(e) =>
                        setFormData({ ...formData, categoryId: e.target.value })
                      }
                      className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-mauve-8 focus:ring-4 focus:ring-mauve-8/10 transition-all text-foreground font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block ml-1">
                    Description
                  </label>
                  <div className="relative">
                    <input
                      required
                      type="text"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-mauve-8 focus:ring-4 focus:ring-mauve-8/10 transition-all text-foreground font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 py-4 border-t border-b border-border/50">
                {/* Department Selection */}
                <Dropdown
                  usePortal={true}
                  placement="top-start"
                  popoverClassName="bg-card border border-border rounded-xl shadow-2xl z-[100] w-[240px] popover-enter"
                  trigger={({ isOpen }) => (
                    <PropertyPill
                      isActive={!!formData.department || isOpen}
                      icon={Building2}
                    >
                      <span>{formData.department || "Set Department"}</span>
                      <ChevronDown
                        size={12}
                        className={`ml-1 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </PropertyPill>
                  )}
                >
                  {({ close }) => (
                    <div className="p-1">
                      <div className="px-3 py-2 border-b border-border mb-1">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
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
                        className="w-full text-left px-3 py-2 rounded-md text-[11px] font-bold text-violet-10 hover:bg-violet-2 transition-colors uppercase tracking-wider"
                      >
                        + Add New Department
                      </button>
                    </div>
                  )}
                </Dropdown>

                {/* Sub-Department Selection */}
                <Dropdown
                  disabled={!formData.department}
                  usePortal={true}
                  placement="top-start"
                  popoverClassName="bg-card border border-border rounded-xl shadow-2xl z-[100] w-[240px] popover-enter"
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
                          className={`ml-1 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      )}
                    </PropertyPill>
                  )}
                >
                  {({ close }) => (
                    <div className="p-1">
                      <div className="px-3 py-2 border-b border-border mb-1">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
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
                        className="w-full text-left px-3 py-2 rounded-md text-[11px] font-bold text-violet-10 hover:bg-violet-2 transition-colors uppercase tracking-wider"
                      >
                        + Add New Sub-Dept
                      </button>
                    </div>
                  )}
                </Dropdown>
              </div>

              {/* Managed Mode Inputs (Fallback) */}
              {(isNewDept || isNewSubDept) && (
                <div className="bg-violet-2/50 border border-mauve-3 rounded-2xl p-4 space-y-3 animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Info size={14} className="text-violet-10" />
                    <p className="text-[11px] font-black text-foreground uppercase tracking-widest">
                      Manual Entry Mode
                    </p>
                  </div>
                  {isNewDept && (
                    <div>
                      <label className="text-[9px] font-bold text-foreground/60 uppercase tracking-wider mb-1 block">
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
                        className="w-full bg-card border border-mauve-5 rounded-xl px-3 py-2 text-xs outline-none focus:border-mauve-8 transition-all font-bold"
                      />
                    </div>
                  )}
                  {isNewSubDept && (
                    <div>
                      <label className="text-[9px] font-bold text-foreground/60 uppercase tracking-wider mb-1 block">
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
                        className="w-full bg-card border border-mauve-5 rounded-xl px-3 py-2 text-xs outline-none focus:border-mauve-8 transition-all font-bold"
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
                    className="text-[10px] font-bold text-violet-10 hover:underline"
                  >
                    Cancel manual entry
                  </button>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-border mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={upsertMutation.isPending}
                  className="px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest bg-primary hover:bg-primary-hover text-primary-foreground shadow-lg shadow-primary/15 transition-all active:scale-95 disabled:opacity-50"
                >
                  {upsertMutation.isPending ? "Saving..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

