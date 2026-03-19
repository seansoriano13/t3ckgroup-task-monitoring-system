import { useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskService } from "../../services/taskService.js";
import ProtectedRoute from "../../components/ProtectedRoute.jsx";
import { CheckCircle2, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { formatDate } from "../../utils/formatDate.js";
import toast from "react-hot-toast";

export default function ApprovalsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isHr = user?.is_hr === true || user?.isHr === true;
  const isHead = user?.is_head === true || user?.isHead === true;
  const userSubDept = user?.sub_department || user?.subDepartment;

  // 1. Fetch all tasks
  const { data: rawTasks = [], isLoading } = useQuery({
    queryKey: ["dashboardTasks", user?.id, "all"],
    queryFn: () => taskService.getAllTasks(),
    enabled: !!user?.id,
  });

  // 2. THE FORKED QUEUE LOGIC
  const pendingTasks = useMemo(() => {
    return rawTasks
      .filter((t) => {
        const isNotMe = t.loggedById !== user?.id; // Don't approve your own tasks

        if (isHr) {
          // 🔥 HR QUEUE: Needs to be COMPLETE, but NOT YET VERIFIED
          const isComplete = t.status === "COMPLETE";
          const isNotVerified = !t.hrVerified;
          return isNotMe && isComplete && isNotVerified;
        } else if (isHead) {
          // 🔥 HEAD QUEUE: Needs to be INCOMPLETE, and in their Sub-Department
          const taskSubDept =
            t.sub_department ||
            t.subDepartment ||
            t.creator?.sub_department ||
            t.employees?.sub_department ||
            "";

          const isMyDept = taskSubDept === userSubDept;
          const isIncomplete = t.status === "INCOMPLETE";
          return isNotMe && isMyDept && isIncomplete;
        }

        return false;
      })
      .sort((a, b) => {
        if (a.priority === "HIGH" && b.priority !== "HIGH") return -1;
        if (b.priority === "HIGH" && a.priority !== "HIGH") return 1;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
  }, [rawTasks, user?.id, userSubDept, isHr, isHead]);

  // 3. The Approval/Verification Mutation
  const editTaskMutation = useMutation({
    mutationFn: (updatedData) =>
      taskService.updateTask(updatedData.id, updatedData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] });
      toast.success(
        isHr ? "Task verified by HR." : "Task evaluated successfully.",
      );
    },
  });

  if (isLoading)
    return (
      <div className="py-20 text-center text-gray-9 font-bold">
        Loading Queue...
      </div>
    );

  return (
    <ProtectedRoute requireHead={true}>
      <div className="max-w-5xl mx-auto space-y-6 pb-10">
        {/* HEADER */}
        <div className="flex justify-between items-end border-b border-gray-4 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-12">
              {isHr ? "HR Verification Queue" : "Manager Action Queue"}
            </h1>
            <p className="text-gray-9 mt-1">
              {isHr
                ? "Audit and verify graded tasks."
                : "Review and grade pending tasks from your team."}
            </p>
          </div>
          <div className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-lg flex items-center gap-2">
            <Clock size={16} className="text-primary" />
            <span className="text-primary font-bold">
              {pendingTasks.length} Pending
            </span>
          </div>
        </div>

        {/* THE QUEUE */}
        {pendingTasks.length > 0 ? (
          <div className="flex flex-col gap-4">
            {pendingTasks.map((task) => (
              <ApprovalRow
                key={task.id}
                task={task}
                isHr={isHr} // 👈 Pass role to the row so UI changes
                onProcess={(payload) => editTaskMutation.mutateAsync(payload)}
                isSubmitting={editTaskMutation.isPending}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-2 border border-gray-4 border-dashed rounded-xl shadow-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-900/20 text-green-500 mb-4">
              <CheckCircle2 size={32} />
            </div>
            <p className="text-gray-12 font-bold text-xl">Inbox Zero!</p>
            <p className="text-gray-9 mt-2">
              There are no pending tasks waiting for your review.
            </p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

// --- RAPID APPROVAL COMPONENT ---
function ApprovalRow({ task, isHr, onProcess, isSubmitting }) {
  const [expanded, setExpanded] = useState(false);
  const [grade, setGrade] = useState(null);
  const [remarks, setRemarks] = useState("");

  const handleHeadApprove = () => {
    onProcess({
      id: task.id,
      status: "COMPLETE",
      grade: grade,
      remarks: remarks,
      endAt: new Date().toISOString(),
    });
  };

  const handleHeadReject = () => {
    onProcess({
      id: task.id,
      status: "REJECTED",
      grade: 0,
      remarks: remarks,
    });
  };

  const handleHrVerify = () => {
    onProcess({
      id: task.id,
      hrVerified: true,
      hrVerifiedAt: new Date().toISOString(),
    });
  };

  return (
    <div
      className={`bg-gray-1 border transition-all rounded-xl shadow-sm ${expanded ? "border-primary shadow-lg" : "border-gray-4 hover:border-gray-6"}`}
    >
      {/* COMPACT ROW */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4 flex-1">
          <div className="w-10 h-10 rounded-full bg-gray-3 flex items-center justify-center font-bold text-gray-12 shrink-0 border border-gray-4">
            {task.loggedByName
              ? task.loggedByName.charAt(0).toUpperCase()
              : "?"}
          </div>
          <div>
            <h3 className="font-bold text-gray-12 text-sm">
              {task.loggedByName}
            </h3>
            <p className="text-[10px] text-gray-9 font-bold uppercase tracking-widest">
              {task.categoryId}
            </p>
          </div>
          <div className="hidden md:block ml-4 pl-4 border-l border-gray-4">
            <p className="text-sm font-semibold text-gray-11 line-clamp-1 max-w-md">
              {task.taskDescription}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-gray-9">
            {formatDate(task.createdAt)}
          </span>
          {task.priority === "HIGH" && (
            <span className="px-2 py-1 rounded bg-red-a3 text-red-11 text-[10px] font-black uppercase tracking-widest border border-red-a5">
              High Priority
            </span>
          )}
          <button className="text-gray-8 hover:text-gray-12 transition-colors p-1">
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {/* EXPANDED ACTION AREA */}
      {expanded && (
        <div className="p-4 border-t border-gray-4 bg-gray-2/50 rounded-b-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Col: Full Description */}
            <div>
              <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider mb-2 block">
                Task Description
              </label>
              <div className="bg-gray-1 p-4 rounded-lg border border-gray-4 text-sm text-gray-12 whitespace-pre-wrap leading-relaxed shadow-inner">
                {task.taskDescription}
              </div>
            </div>

            {/* Right Col: Dynamic UI based on Role */}
            <div className="space-y-4">
              {isHr ? (
                /* --- HR UI: See the grade, verify the task --- */
                <>
                  <div className="flex gap-4">
                    <div className="flex-1 bg-gray-1 border border-gray-4 p-4 rounded-xl">
                      <p className="text-[10px] font-bold text-gray-9 uppercase tracking-wider mb-1">
                        Final Grade
                      </p>
                      <p className="text-lg font-black text-primary">
                        {task.grade} / 5
                      </p>
                    </div>
                  </div>
                  {task.remarks && (
                    <div className="bg-gray-1 border border-gray-4 p-4 rounded-xl">
                      <p className="text-[10px] font-bold text-gray-9 uppercase tracking-wider mb-1">
                        Manager Remarks
                      </p>
                      <p className="text-sm text-gray-12">{task.remarks}</p>
                    </div>
                  )}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleHrVerify}
                      disabled={isSubmitting}
                      className="px-6 py-2.5 rounded-lg font-bold text-sm bg-blue-600 text-white shadow-lg shadow-blue-900/20 hover:bg-blue-500 transition-colors active:scale-95 disabled:opacity-50 w-full md:w-auto"
                    >
                      Sign & Verify Task
                    </button>
                  </div>
                </>
              ) : (
                /* --- HEAD UI: Assign Grade & Remarks --- */
                <>
                  <div>
                    <label className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2 block">
                      Assign Grade (1-5)
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          onClick={() => setGrade(num)}
                          className={`flex-1 py-2 rounded font-bold transition-all border ${
                            grade === num
                              ? "bg-primary text-gray-12 border-primary shadow-md shadow-red-a3 scale-[1.05]"
                              : "bg-gray-2 text-gray-10 border-gray-4 hover:border-gray-6 hover:bg-gray-3"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider mb-1 block">
                      Remarks{" "}
                      <span className="text-gray-7 normal-case font-normal">
                        (Required for Rejection)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Add context to your evaluation..."
                      className="w-full bg-gray-1 border border-gray-4 text-gray-12 rounded-lg px-3 py-2 outline-none focus:border-red-9 transition-colors text-sm"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={handleHeadReject}
                      disabled={!remarks || isSubmitting}
                      className="px-4 py-2 rounded-lg font-bold text-sm bg-gray-3 border border-gray-4 text-gray-11 hover:text-red-11 hover:border-red-a5 transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={handleHeadApprove}
                      disabled={grade === null || isSubmitting}
                      className="px-6 py-2 rounded-lg font-bold text-sm bg-primary text-gray-12 shadow-lg shadow-red-a3 hover:bg-primary-hover transition-colors active:scale-95 disabled:opacity-50"
                    >
                      Approve Task
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
