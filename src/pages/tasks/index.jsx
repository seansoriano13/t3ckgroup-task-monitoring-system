import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { MOCK_TASKS } from "../../data/tasks.js";
import TaskDetails from "../../components/TaskDetails.jsx";
import EditTaskModal from "../../components/EditTaskModal";
import TaskCard from "../../components/TaskCard.jsx";

export default function TasksPage() {
  // 1. Data State
  const [tasks, setTasks] = useState(MOCK_TASKS);

  // 2. Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  // 3. UI State (Pop-ups)
  const [viewTask, setViewTask] = useState(null);
  const [editTask, setEditTask] = useState(null);

  // --- THE FILTER ENGINE ---
  const filteredTasks = tasks.filter((task) => {
    // Check Search
    const matchesSearch =
      task.taskDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.categoryId.toLowerCase().includes(searchTerm.toLowerCase());
    // Check Status
    const matchesStatus =
      statusFilter === "ALL" || task.status === statusFilter;
    // Check Priority
    const matchesPriority =
      priorityFilter === "ALL" || task.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-gray-12">Task Directory</h1>
        <p className="text-gray-9 mt-1">Manage and filter your logged hours.</p>
      </div>

      {/* FILTER CONTROL BAR */}
      <div className="bg-gray-2 border border-gray-4 p-4 rounded-xl flex flex-col md:flex-row gap-4 shadow-sm">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-8"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by description or project code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-1 border border-gray-4 text-gray-12 rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-red-9 transition-colors placeholder:text-gray-7"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex gap-4">
          <div className="relative">
            <Filter
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-8"
              size={16}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-gray-1 border border-gray-4 text-gray-12 rounded-lg pl-9 pr-8 py-2.5 outline-none focus:border-red-9 transition-colors cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETE">Complete</option>
              <option value="INCOMPLETE">Incomplete</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="appearance-none bg-gray-1 border border-gray-4 text-gray-12 rounded-lg px-4 py-2.5 outline-none focus:border-red-9 transition-colors cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>
        </div>
      </div>

      {/* THE GRID */}
      {filteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onView={() => setViewTask(task)}
              onEdit={() => setEditTask(task)} // 👈 Hooks up the ghost pencil!
            />
          ))}
        </div>
      ) : (
        /* EMPTY STATE */
        <div className="text-center py-20 bg-gray-2 border border-gray-4 border-dashed rounded-xl">
          <p className="text-gray-10 font-bold text-lg">No tasks found.</p>
          <p className="text-gray-8 text-sm mt-1">
            Try adjusting your filters or search term.
          </p>
        </div>
      )}

      {/* THE POP-UPS */}
      <TaskDetails
        isOpen={!!viewTask}
        onClose={() => setViewTask(null)}
        task={viewTask}
      />

      <EditTaskModal
        isOpen={!!editTask}
        onClose={() => setEditTask(null)}
        task={editTask}
        onSubmit={(updatedTask) => {
          console.log("Mock Saving Edited Task:", updatedTask);
          // When hooked to Supabase, this is where your TanStack mutation goes!
          setEditTask(null);
        }}
      />
    </div>
  );
}
