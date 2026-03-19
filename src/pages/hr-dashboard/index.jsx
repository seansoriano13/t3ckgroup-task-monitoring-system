import { useState } from "react";
import { Download, Search, CheckSquare, XSquare } from "lucide-react";
import { MOCK_TASKS } from "../../data/tasks.js";
import ProtectedRoute from "../../components/ProtectedRoute.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";

export default function HrDashboardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tasks, setTasks] = useState(MOCK_TASKS);

  // Quick filter for the search bar
  const filteredTasks = tasks.filter(
    (task) =>
      task.loggedByName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.categoryId.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleVerify = (id) => {
    // In production, this fires a TanStack mutation to set hr_verified = true
    console.log("HR Verified task:", id);
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, hrVerified: true } : t)),
    );
  };

  return (
    <ProtectedRoute requireHr={true}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER & TOP LEVEL STATS */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-4 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-12">HR Master Log</h1>
            <p className="text-gray-9 mt-1">
              Review, verify, and export company-wide timesheets.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="bg-gray-2 border border-gray-4 px-4 py-2 rounded-lg text-center">
              <p className="text-xs font-bold text-gray-9 uppercase">
                Pending Verification
              </p>
              <p className="text-lg font-bold text-primary">
                {
                  tasks.filter((t) => t.status === "COMPLETE" && !t.hrVerified)
                    .length
                }
              </p>
            </div>
            <button className="flex-center gap-2 bg-gray-3 hover:bg-gray-4 border border-gray-4 text-gray-12 px-4 py-2 rounded-lg font-bold transition-colors">
              <Download size={18} /> Export CSV
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
                <th className="p-4">Manager Status</th>
                <th className="p-4">Grade</th>
                <th className="p-4 text-right">Payroll Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-4">
              {filteredTasks.length > 0 ? (
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
                    <td className="p-4 text-right flex justify-end gap-2">
                      {/* Only show HR actions if the manager has approved it and it hasn't been verified yet */}
                      {task.status === "COMPLETE" && !task.hrVerified ? (
                        <>
                          <button
                            onClick={() => handleVerify(task.id)}
                            className="p-1.5 bg-green-900/20 text-green-500 rounded hover:bg-green-900/40 transition-colors"
                            title="Verify for Payroll"
                          >
                            <CheckSquare size={18} />
                          </button>
                          <button
                            className="p-1.5 bg-red-900/20 text-red-500 rounded hover:bg-red-900/40 transition-colors"
                            title="Reject/Flag"
                          >
                            <XSquare size={18} />
                          </button>
                        </>
                      ) : task.hrVerified ? (
                        <span className="text-xs font-bold text-green-500 uppercase tracking-wider flex items-center gap-1">
                          <CheckSquare size={14} /> Verified
                        </span>
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
      </div>
    </ProtectedRoute>
  );
}
