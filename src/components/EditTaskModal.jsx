import { useState, useEffect } from "react";
import { X } from "lucide-react";

export default function EditTaskModal({ isOpen, onClose, onSubmit, task }) {
  const [formData, setFormData] = useState({
    categoryId: "",
    taskDescription: "",
    startAt: "",
    endAt: "",
    priority: "LOW",
  });

  // Only run this when the specific task ID changes, preventing the React double-render loop
  useEffect(() => {
    if (task?.id) {
      setFormData({
        categoryId: task.categoryId || "",
        taskDescription: task.taskDescription || "",
        startAt: task.startAt ? task.startAt.slice(0, 16) : "",
        endAt: task.endAt ? task.endAt.slice(0, 16) : "",
        priority: task.priority || "LOW",
      });
    }
  }, [task?.id]);

  const handleCloseAndReset = () => {
    onClose();
    setTimeout(() => {
      setFormData({
        categoryId: "",
        taskDescription: "",
        startAt: "",
        endAt: "",
        priority: "LOW",
      });
    }, 300);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit({ ...task, ...formData });
    handleCloseAndReset();
  };

  if (!isOpen || !task) return null;

  return (
    <>
      <div
        className="dropdown-backdrop transition-opacity duration-300"
        onClick={handleCloseAndReset}
      />
      <div className="fixed absolute-center w-full max-w-lg z-50 p-4">
        <div className="bg-gray-2 border border-gray-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          <div className="flex-between p-6 border-b border-gray-4 bg-gray-1">
            <h2 className="text-xl font-bold text-gray-12">Edit Task</h2>
            <button
              onClick={handleCloseAndReset}
              className="text-gray-9 hover:text-red-9 transition-colors flex-center h-8 w-8 rounded-full hover:bg-gray-3"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
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
                    Select Project...
                  </option>
                  <option value="IT-FE-01">IT-FE-01</option>
                  <option value="IT-BE-01">IT-BE-01</option>
                  <option value="HR-01">HR-01</option>
                </select>
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

            <div>
              <label className="block text-xs font-bold text-gray-10 uppercase tracking-wider mb-2">
                Task Description
              </label>
              <textarea
                name="taskDescription"
                value={formData.taskDescription}
                onChange={handleChange}
                className="w-full bg-gray-1 border border-gray-4 text-gray-12 rounded-lg p-4 outline-none focus:border-red-9 transition-all h-28 resize-none"
                required
              />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-4 mt-2">
              <button
                type="button"
                onClick={handleCloseAndReset}
                className="px-5 py-2.5 rounded-lg font-bold text-gray-11 hover:text-gray-12 hover:bg-gray-3 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg font-bold bg-primary text-gray-12 hover:bg-primary-hover shadow-lg shadow-red-a3 transition-all active:scale-95"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
