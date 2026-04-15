import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2, Loader2, XSquare, ChevronDown } from "lucide-react";
import { employeeService } from "../services/employeeService";
import { useAuth } from "../context/AuthContext";

export default function HRCategoriesConfig() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [isExpanded, setIsExpanded] = useState(false);

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
    <div className="bg-gray-2 border border-gray-4 rounded-2xl shadow-lg overflow-hidden">
      <div
        onClick={() => setIsExpanded((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsExpanded((v) => !v);
          }
        }}
        className="w-full p-5 border-b border-gray-3 bg-gray-1 flex items-center justify-between gap-4 text-left cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <ChevronDown
            size={18}
            className={`transition-transform ${isExpanded ? "rotate-180" : "rotate-0"}`}
          />
          <h2 className="text-sm font-bold text-gray-10 uppercase tracking-wider">
           Categories Config
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-9 bg-gray-3 border border-gray-4 px-2 py-1 rounded-lg">
            {categories.length} categories
          </span>

          {isExpanded && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openAdd();
              }}
              className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-bold transition-colors active:scale-95"
            >
              <Plus size={18} /> Add Category
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-5">
          {isLoading ? (
            <div className="py-10 flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin" size={26} />
              <p className="text-gray-9 font-bold">Loading categories...</p>
            </div>
          ) : isError ? (
            <div className="py-8 text-center bg-red-a2 border border-red-a5 rounded-xl">
              <p className="text-red-11 font-bold">Failed to load categories.</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="py-8 text-center text-gray-9">
              No categories found. Add the first one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-1 border-b border-gray-4 text-xs font-bold text-gray-9 uppercase tracking-wider">
                    <th className="p-4">Category ID</th>
                    <th className="p-4 w-1/3">Description</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Sub-Department</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-4">
                  {categories.map((cat) => (
                    <tr
                      key={cat.id}
                      className="hover:bg-gray-3/30 transition-colors"
                    >
                      <td className="p-4">
                        <span className="text-xs font-bold text-gray-12 bg-gray-3 px-2 py-1 rounded border border-gray-4">
                          {cat.categoryId}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-11 truncate max-w-xs">
                        {cat.description}
                      </td>
                      <td className="p-4 text-sm text-gray-11">
                        {cat.department || "-"}
                      </td>
                      <td className="p-4 text-sm text-gray-11">
                        {cat.subDepartment || "-"}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => openEdit(cat)}
                          className="p-2 bg-gray-3 hover:bg-gray-4 text-gray-12 rounded-lg transition-colors inline-block"
                          title="Edit Category"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => {
                            const ok = window.confirm(
                              `Delete category "${cat.categoryId}"?`,
                            );
                            if (ok) deleteMutation.mutate(cat);
                          }}
                          className="p-2 bg-red-900/20 hover:bg-red-900/40 text-red-500 rounded-lg transition-colors inline-block"
                          title="Delete Category"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.currentTarget === e.target) setIsModalOpen(false);
          }}
        >
          <div className="bg-gray-1 border border-gray-4 rounded-xl w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-12 flex items-center gap-2">
                {editingId ? "Edit Category" : "Add Category"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-8 hover:text-gray-12"
              >
                <XSquare size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-9 uppercase">
                  Category ID
                </label>
                <input
                  required
                  type="text"
                  value={formData.categoryId}
                  disabled={!!editingId}
                  onChange={(e) =>
                    setFormData({ ...formData, categoryId: e.target.value })
                  }
                  className="w-full bg-gray-2 border border-gray-4 rounded-lg p-2.5 mt-1 text-sm outline-none focus:border-primary text-gray-12 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-9 uppercase">
                  Description
                </label>
                <input
                  required
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full bg-gray-2 border border-gray-4 rounded-lg p-2.5 mt-1 text-sm outline-none focus:border-primary text-gray-12"
                />
              </div>

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
                      const nextDept = e.target.value;
                      setFormData((p) => ({
                        ...p,
                        department: nextDept,
                        subDepartment: "",
                      }));
                      setIsNewSubDept(false);
                    }}
                    className="w-full bg-gray-2 border border-gray-4 rounded-lg p-2.5 mt-1 text-sm outline-none focus:border-primary text-gray-12"
                  >
                    <option value="" disabled className="text-gray-8">
                      Select Department...
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
                    Sub-Department
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
                    required
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
                    required
                    value={formData.subDepartment}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, subDepartment: e.target.value }))
                    }
                    disabled={!formData.department}
                    className="w-full bg-gray-2 border border-gray-4 rounded-lg p-2.5 mt-1 text-sm outline-none focus:border-primary text-gray-12 disabled:opacity-50"
                  >
                    <option value="" disabled className="text-gray-8">
                      {formData.department
                        ? "Select Sub-Department..."
                        : "Select Department First"}
                    </option>
                    {uniqueSubDepts.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="pt-4 flex gap-3 border-t border-gray-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-3 hover:bg-gray-4 text-gray-12 font-bold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={upsertMutation.isPending}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg transition-colors shadow-lg shadow-red-a3 disabled:opacity-50"
                >
                  {upsertMutation.isPending ? "Saving..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

