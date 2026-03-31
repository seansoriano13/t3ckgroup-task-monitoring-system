import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTaskTopology } from "../hooks/useTaskTopology";
import TaskHeader from "./TaskHeader";
import ManagementSection from "./ManagementSection";
import StandardDetailsSection from "./StandardDetailsSection";
import ManagerEvaluation from "./ManagerEvaluation";
import { formatDate } from "../utils/formatDate";
import { PencilLine } from "lucide-react";
import TaskFooter from "./TaskFooter";

export default function TaskDetails({
  isOpen,
  onClose,
  task,
  onUpdateTask,
  onDeleteTask,
}) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [approvalGrade, setApprovalGrade] = useState(null);
  const [approvalRemarks, setApprovalRemarks] = useState("");

  const [formData, setFormData] = useState({
    department: "",
    subDepartment: "",
    loggedById: "",
    categoryId: "",
    priority: "LOW",
    status: "INCOMPLETE",
    startAt: "",
    endAt: "",
    taskDescription: "",
    grade: 0,
    remarks: "",
  });

  // 🔥 THE FIX: Pre-hydrate the form data immediately when the modal opens
  useEffect(() => {
    if (isOpen && task) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setApprovalGrade(null);
      setApprovalRemarks("");

      // Grab department from the joined task data (works for Employees too!)
      const taskDept =
        task.creator?.department ||
        task.employees?.department ||
        task.department ||
        "";
      const taskSubDept =
        task.creator?.sub_department ||
        task.employees?.sub_department ||
        task.sub_department ||
        "";

      setFormData({
        department: taskDept || user?.department || "",
        subDepartment:
          taskSubDept || user?.sub_department || user?.subDepartment || "",
        loggedById: task.loggedById || "",
        categoryId: task.categoryId || "",
        priority: task.priority || "LOW",
        status: task.status || "INCOMPLETE",
        startAt: task.startAt ? task.startAt.slice(0, 16) : "",
        endAt: task.endAt ? task.endAt.slice(0, 16) : "",
        taskDescription: task.taskDescription || "",
        grade: task.grade || 0,
        remarks: task.remarks || "",
      });
    }
  }, [isOpen, task, user]);

  // Role Checks
  const isHr = user?.is_hr === true || user?.isHr === true;
  const isHead = user?.is_head === true || user?.isHead === true;
  const isManagement = isHr || isHead;
  const isStrictlyHead = isHead && !isHr;

  // Custom Data Hook
  const topologyData = useTaskTopology(
    isOpen,
    formData,
    task?.categoryId,
    isEditing,
  );

  // Reset states when closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setIsEditing(false);
        setIsSubmitting(false);
      }, 300);
    }
  }, [isOpen]);

  if (!task) return null;

  // Permissions & Handlers
  const isOwner = user?.id === task.loggedById;
  // Employees can only edit their own tasks when INCOMPLETE or Head-rejected (NOT APPROVED + grade=0).
  // HR-rejected tasks (NOT APPROVED + grade>0) must NOT be editable by the employee.
  const isHrRejected =
    task.status === "NOT APPROVED" && (task.grade ?? 0) > 0;
  const canEdit =
    isHr ||
    isHead ||
    (isOwner && task.status !== "COMPLETE" && !isHrRejected);

  // 🔥 THE FIX: Since useEffect handles the data now, this just toggles the UI
  const handleToggleEdit = () => {
    setIsEditing(true);
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleDeptChange = (e) =>
    setFormData({
      ...formData,
      department: e.target.value,
      subDepartment: "",
      loggedById: "",
      categoryId: "",
    });
  const handleSubDeptChange = (e) =>
    setFormData({
      ...formData,
      subDepartment: e.target.value,
      loggedById: "",
      categoryId: "",
    });
  const handleAssigneeChange = (e) =>
    setFormData({ ...formData, loggedById: e.target.value, categoryId: "" });

  const executeUpdate = async (payload) => {
    setIsSubmitting(true);
    try {
      await onUpdateTask(payload);
      onClose();
    } catch {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = () => {
    // eslint-disable-next-line no-unused-vars
    const { department, subDepartment, ...dbPayload } = formData;
    dbPayload.grade = dbPayload.grade ? Number(dbPayload.grade) : 0;

    if (
      dbPayload.status === "INCOMPLETE" ||
      dbPayload.status === "NOT APPROVED"
    ) {
      dbPayload.hrVerified = false;
    }

    executeUpdate({ id: task.id, ...dbPayload, editedBy: user.id });
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this task? It will be removed from the active queues.",
    );
    if (confirmed) {
      setIsSubmitting(true);
      try {
        await onDeleteTask({ id: task.id, userId: user.id });
        onClose();
      } catch {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <>
      <div
        className={`dropdown-backdrop transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-[600px] bg-gray-2 border-l border-gray-4 shadow-2xl z-[9999] transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <TaskHeader
          isEditing={isEditing}
          isHrVerified={task.hrVerified}
          onClose={onClose}
        />

        <div className="p-6 flex-1 overflow-y-auto space-y-6 custom-scrollbar bg-gray-2">
          <div className="space-y-4">
            <ManagementSection
              isEditing={isEditing}
              isHr={isHr}
              isHead={isHead}
              task={task}
              formData={formData} // 👈 This now holds the correct department immediately
              taskLoggedByName={task.loggedByName}
              topologyData={topologyData}
              handlers={{
                handleDeptChange,
                handleSubDeptChange,
                handleAssigneeChange,
              }}
            />
            <StandardDetailsSection
              isEditing={isEditing}
              isManagement={isManagement}
              formData={formData}
              handleChange={handleChange}
              topologyData={topologyData}
              task={task}
            />

            <div className="flex flex-col gap-1.5 pt-2">
              <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider pl-1">
                Description
              </label>
              {isEditing ? (
                <textarea
                  name="taskDescription"
                  value={formData.taskDescription}
                  onChange={handleChange}
                  required
                  className="w-full bg-gray-1 border border-gray-4 text-gray-12 rounded-lg p-4 outline-none focus:border-red-9 transition-colors h-24 resize-none text-sm"
                />
              ) : (
                <div className="bg-gray-1 p-5 rounded-xl border border-transparent text-gray-12 leading-relaxed text-sm whitespace-pre-wrap">
                  {task.taskDescription}
                </div>
              )}
            </div>

            <ManagerEvaluation
              isEditing={isEditing}
              isStrictlyHead={isStrictlyHead}
              isHr={isHr}
              formData={formData}
              handleChange={handleChange}
              task={task}
              approvalGrade={approvalGrade}
              setApprovalGrade={setApprovalGrade}
              approvalRemarks={approvalRemarks}
              setApprovalRemarks={setApprovalRemarks}
            />

            {!isEditing && task.editedById && (
              <div className="pt-4 border-t border-gray-4 flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-gray-8">
                <p className="flex items-center gap-1.5">
                  <PencilLine size={12} /> Last Modified By{" "}
                  <span className="text-gray-10">{task.editedByName}</span>
                </p>
                <p>{formatDate(task.editedAt)}</p>
              </div>
            )}
          </div>
        </div>

        <TaskFooter
          actions={{
            onCancel: () => setIsEditing(false),
            onClose,
            onSave: handleSaveEdit,
            onToggleEdit: handleToggleEdit,
            onDelete: handleDelete,

            onHeadReject: () =>
              executeUpdate({
                id: task.id,
                status: "NOT APPROVED", // Global text update applied!
                endAt: new Date().toISOString(),
                grade: 0, // 👈 Fix: Rejection grade contaminates analytics
                remarks: approvalRemarks,
                evaluatedBy: user.id, // 🔥 Accountability Hook
                editedBy: user.id, // (Optional: you can keep this if you still want the generic audit trail to fire too)
                hrVerified: false,
                hrRemarks: "",
              }),

            onMarkComplete: () =>
              executeUpdate({
                id: task.id,
                status: "COMPLETE",
                endAt: new Date().toISOString(),
                grade: approvalGrade,
                remarks: approvalRemarks,
                evaluatedBy: user.id, // 🔥 Accountability Hook
                editedBy: user.id,
                hrVerified: false,
                hrRemarks: "",
              }),

            onUndoVerify: () =>
              executeUpdate({
                id: task.id,
                status: "COMPLETE",
                hrVerified: false,
                hrRemarks: "",
                editedBy: user.id,
              }),

            onHrVerify: () => {
              if (task.status !== "COMPLETE") {
                alert(
                  "Exploit Prevention: Only COMPLETE tasks can be verified.",
                );
                return;
              }
              executeUpdate({
                id: task.id,
                status: "COMPLETE",
                hrVerified: true,
                hrVerifiedAt: new Date().toISOString(),
                editedBy: user.id,
              });
            },
          }}
          permissions={{ canEdit, isStrictlyHead, isHr, isManagement, isOwner }}
          state={{
            isEditing,
            isSubmitting,
            task,
            formIsValid:
              !isSubmitting &&
              !topologyData.isLoadingTop &&
              !(isManagement && !formData.loggedById) &&
              formData.categoryId,
            canApprove: approvalGrade !== null,
            approvalRemarks: approvalRemarks,
          }}
        />
      </div>
    </>
  );
}
