import { useState } from "react";
import { X } from "lucide-react";
import { useEffect } from "react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Users } from "lucide-react";

const getCurrentLocalTime = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
};

export default function AddTaskModal({ isOpen, onClose, onSubmit }) {
  const { user } = useAuth(); // 👈 Pull in the logged-in user

  // Database States
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    loggedById: user?.id || "", // Defaults to the person logged in
    categoryId: "",
    taskDescription: "",
    startAt: getCurrentLocalTime(),
    endAt: "",
    priority: "LOW",
  });

  // Fetch Data when modal opens
  // Fetch Data when modal opens
  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchDropdownData = async () => {
      setIsLoadingData(true);

      try {
        // 1. Fetch Categories
        const { data: catData, error: catError } = await supabase
          .from("categories")
          .select("category_id, description, sub_department")
          .order("category_id");

        if (catError) console.error("Category Fetch Error:", catError);
        else if (catData) setCategories(catData);

        // --- THE BULLETPROOF ROLE CHECK ---
        // Safely check for either snake_case (DB) or camelCase (Frontend mapped)
        const isHr = user.is_hr === true || user.isHr === true;
        const isHead = user.is_head === true || user.isHead === true;
        const userSubDept = user.sub_department || user.subDepartment;

        console.log("Current User Role Check:", { isHr, isHead, userSubDept });

        // 2. Fetch Employees Based on Role
        let empQuery = supabase
          .from("employees")
          .select("id, name, sub_department");

        if (!isHr && isHead) {
          // HEAD: Only fetch employees in their exact sub-department
          // Fallback to a blank string if userSubDept is undefined so Supabase doesn't crash
          empQuery = empQuery.eq("sub_department", userSubDept || "");
        } else if (!isHr && !isHead) {
          // STANDARD EMPLOYEE: Only fetch themselves
          empQuery = empQuery.eq("id", user.id);
        }
        // If HR, we don't add any filters so they get everyone!

        // Execute the query
        const { data: empData, error: empError } = await empQuery.order("name");

        if (empError) console.error("Employee Fetch Error:", empError);
        else if (empData) {
          console.log("Employees Fetched:", empData);
          setEmployees(empData);
        }

        // Reset form data for fresh open
        setFormData({
          loggedById: user.id,
          categoryId: "",
          taskDescription: "",
          startAt: getCurrentLocalTime(),
          endAt: "",
          priority: "LOW",
        });
      } catch (err) {
        console.error("Unexpected error fetching dropdowns:", err);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchDropdownData();
  }, [isOpen, user]);

  // Handle Input Changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const newData = { ...prev, [name]: value };

      // 🔥 THE MAGIC TRICK: If the manager changes the Assignee,
      // instantly wipe the category so they don't accidentally submit
      // an IT category for a Purchasing employee!
      if (name === "loggedById") {
        newData.categoryId = "";
      }
      return newData;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit(formData);
  };

  if (!isOpen) return null;

  // --- DYNAMIC FILTERING LOGIC ---
  // Find the sub-department of whoever is currently selected in the Assignee dropdown
  const selectedEmployee =
    employees.find((emp) => emp.id === formData.loggedById) || user;

  // Filter the categories so we only show ones matching that specific sub-department
  const filteredCategories = categories.filter(
    (cat) => cat.sub_department === selectedEmployee?.sub_department,
  );

  return (
    <>
      <div
        className="dropdown-backdrop flex-center transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="fixed absolute-center w-full max-w-lg z-50 p-4">
        <div className="bg-gray-2 border border-gray-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex-between p-6 border-b border-gray-3 bg-gray-1">
            <h2 className="text-xl font-bold text-gray-12">Log New Task</h2>
            <button
              onClick={onClose}
              className="text-gray-9 hover:text-red-9 transition-colors flex-center h-8 w-8 rounded-full hover:bg-gray-3"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* CONDITIONAL ASSIGNEE DROPDOWN (Only visible if HR or HEAD) */}
            {(user?.is_hr || user?.isHr || user?.is_head || user?.isHead) && (
              <div className="bg-gray-1 border border-primary/30 p-4 rounded-xl shadow-inner">
                <label className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-2">
                  <Users size={14} /> Assign Task To
                </label>
                <select
                  name="loggedById"
                  value={formData.loggedById}
                  onChange={handleChange}
                  className="w-full bg-gray-2 border border-gray-4 text-gray-12 rounded-lg p-2.5 outline-none focus:border-red-9 transition-all appearance-none font-semibold"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.id === user.id ? "Myself" : emp.name} (
                      {emp.sub_department})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Category & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-10 uppercase tracking-wider mb-2">
                  Category
                </label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  className="w-full bg-gray-1 border border-gray-4 text-gray-12 rounded-lg p-3 outline-none focus:border-red-9 transition-all appearance-none"
                  required
                >
                  <option value="" disabled className="text-gray-8">
                    {isLoadingData ? "Loading..." : `Select Category...`}
                  </option>

                  {/* Map the dynamically filtered categories */}
                  {filteredCategories.map((cat) => (
                    <option key={cat.category_id} value={cat.category_id}>
                      {cat.category_id} - {cat.description}
                    </option>
                  ))}
                </select>
                {/* Helpful subtext if the array is empty */}
                {filteredCategories.length === 0 && !isLoadingData && (
                  <p className="text-[10px] text-red-500 mt-1 font-bold">
                    No categories found for this department.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-10 uppercase tracking-wider mb-2">
                  Priority
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full bg-gray-1 border border-gray-4 text-gray-12 rounded-lg p-3 outline-none focus:border-red-9 transition-all appearance-none"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH" className="text-red-9 font-bold">
                    High
                  </option>
                </select>
              </div>
            </div>

            {/* Time Tracking Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-10 uppercase tracking-wider mb-2">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  name="startAt"
                  value={formData.startAt}
                  onChange={handleChange}
                  className="w-full bg-gray-1 border border-gray-4 text-gray-12 rounded-lg p-3 outline-none focus:border-red-9 transition-all [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-10 uppercase tracking-wider mb-2">
                  End Time
                </label>
                <input
                  type="datetime-local"
                  name="endAt"
                  value={formData.endAt}
                  onChange={handleChange}
                  className="w-full bg-gray-1 border border-gray-4 text-gray-12 rounded-lg p-3 outline-none focus:border-red-9 transition-all [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-gray-10 uppercase tracking-wider mb-2">
                Task Description
              </label>
              <textarea
                name="taskDescription"
                value={formData.taskDescription}
                onChange={handleChange}
                placeholder="Detail your completed work here..."
                className="w-full bg-gray-1 border border-gray-4 text-gray-12 rounded-lg p-4 outline-none focus:border-red-9 transition-all h-28 resize-none placeholder:text-gray-7"
                required
              />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-3 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg font-bold text-gray-11 hover:text-gray-12 hover:bg-gray-3 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg font-bold bg-primary text-gray-12 hover:bg-primary-hover shadow-lg shadow-red-a3 transition-all active:scale-95 disabled:opacity-50"
                disabled={isLoadingData}
              >
                Submit Task
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
