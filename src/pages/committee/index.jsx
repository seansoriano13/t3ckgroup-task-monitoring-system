import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { committeeTaskService } from "../../services/committeeTaskService";
import PageHeader from "../../components/ui/PageHeader";
import PageContainer from "../../components/ui/PageContainer";
import { employeeService } from "../../services/employeeService";
import toast from "react-hot-toast";
import { Users, Plus, Search } from "lucide-react";

import CommitteeTaskCard from "./components/CommitteeTaskCard";
import CreateCommitteeTaskModal from "./components/CreateCommitteeTaskModal";
import CommitteeTaskDetailModal from "./components/CommitteeTaskDetailModal";
import RateEmployeesModal from "./components/RateEmployeesModal";

export default function CommitteeTasksPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isSuperAdmin =
    user?.is_super_admin === true || user?.isSuperAdmin === true;
  const isHead = user?.is_head === true || user?.isHead === true;
  const isHr = user?.is_hr === true || user?.isHr === true;
  const canManage = isHead || isSuperAdmin;

  // --- Data Fetching ---
  const { data: committeeTasks = [], isLoading } = useQuery({
    queryKey: ["committeeTasks", user?.id],
    queryFn: () =>
      committeeTaskService.getCommitteeTasks(user?.id, isHead, isSuperAdmin),
    enabled: !!user?.id,
  });

  const [employees, setEmployees] = useState([]);
  useEffect(() => {
    if (canManage) {
      employeeService.getAllEmployees().then(setEmployees);
    }
  }, [canManage]);

  // --- UI State ---
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("ALL"); // ALL, ACTIVE, COMPLETED

  const [selectedTask, setSelectedTask] = useState(null);
  const [isRateOpen, setIsRateOpen] = useState(false);

  // --- Filtering ---
  const filteredTasks = committeeTasks.filter((t) => {
    if (activeTab === "ACTIVE" && t.status !== "ACTIVE") return false;
    if (activeTab === "COMPLETED" && t.status === "ACTIVE") return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        t.creator?.name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // --- Mutations ---

  const markDoneMutation = useMutation({
    mutationFn: (memberId) =>
      committeeTaskService.updateMemberStatus(memberId, "DONE", user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["committeeTasks"] });
      toast.success("Task marked as done!");
      // If the selected task was auto-completed, let's close or refresh it
      setSelectedTask(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const revertDoneMutation = useMutation({
    mutationFn: (memberId) =>
      committeeTaskService.updateMemberStatus(memberId, "PENDING", user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["committeeTasks"] });
      toast.success("Task reverted to pending.");
    },
    onError: (err) => toast.error(err.message),
  });

  const rateMutation = useMutation({
    mutationFn: (ratings) =>
      committeeTaskService.rateMembers(selectedTask.id, ratings, user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["committeeTasks"] });
      toast.success("Ratings submitted and task completed!");
      setIsRateOpen(false);
      setSelectedTask(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => committeeTaskService.cancelCommitteeTask(id, user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["committeeTasks"] });
      toast.success("Committee Task deleted.");
      setSelectedTask(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const addMemberMutation = useMutation({
    mutationFn: (payload) =>
      committeeTaskService.addMemberToTask(selectedTask.id, payload, user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["committeeTasks"] });
      toast.success("Member added successfully!");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ memberId, payload }) =>
      committeeTaskService.updateMemberAssignment(
        memberId,
        selectedTask.id,
        payload,
        user.id,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["committeeTasks"] });
      toast.success("Member task updated!");
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId) =>
      committeeTaskService.removeMemberFromTask(
        memberId,
        selectedTask.id,
        user.id,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["committeeTasks"] });
      toast.success("Member removed from task.");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMemberTaskDescMutation = useMutation({
    mutationFn: ({ memberId, description }) =>
      committeeTaskService.updateMemberTaskDescription(
        memberId,
        description,
        selectedTask?.id,
        user?.id,
      ),
    onSuccess: (_, variables) => {
      setSelectedTask((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          members: prev.members.map((m) =>
            m.id === variables.memberId
              ? { ...m, task_description: variables.description }
              : m,
          ),
        };
      });
      queryClient.invalidateQueries({ queryKey: ["committeeTasks"] });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, remarks }) =>
      committeeTaskService.verifyCommitteeTask(id, user.id, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["committeeTasks"] });
      toast.success("Committee Task verified!");
      setSelectedTask(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, remarks }) =>
      committeeTaskService.rejectCommitteeTask(id, user.id, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["committeeTasks"] });
      toast.success("Committee Task rejected and sent back.");
      setSelectedTask(null);
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-muted-foreground h-[60vh]">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="font-bold animate-pulse tracking-wider uppercase text-sm">
          Loading Committees...
        </p>
      </div>
    );
  }

  return (
    <PageContainer maxWidth="7xl" className="pt-4">
      <PageHeader
        title="Committee Tasks"
        description={
          canManage
            ? "Create and manage group committee assignments."
            : "View your committee assignments and update progress."
        }
      />

      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-3 rounded-2xl border border-border">
        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search tasks or creators..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-muted/50 border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        {/* Tabs */}
        <div className="flex bg-muted p-1 rounded-xl w-full sm:w-auto overflow-x-auto shrink-0">
          {["ALL", "ACTIVE", "COMPLETED"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === tab
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* GRID */}
      {filteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTasks.map((task) => (
            <CommitteeTaskCard
              key={task.id}
              task={task}
              currentUserId={user?.id}
              isSuperAdmin={isSuperAdmin}
              onView={() => setSelectedTask(task)}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center bg-card border border-border border-dashed rounded-2xl">
          <Users size={32} className="mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-bold text-foreground">
            No Committee Tasks Found
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {searchTerm
              ? "Try adjusting your search criteria."
              : "There are no active committee tasks at the moment."}
          </p>
        </div>
      )}

      {/* MODALS */}

      <CommitteeTaskDetailModal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        currentUserId={user?.id}
        isSuperAdmin={isSuperAdmin}
        isHr={isHr}
        employees={employees}
        onMarkDone={(memberId) => markDoneMutation.mutate(memberId)}
        onRevertDone={(memberId) => revertDoneMutation.mutate(memberId)}
        onOpenRateModal={() => setIsRateOpen(true)}
        onDelete={() => deleteMutation.mutate(selectedTask.id)}
        onAddMember={(payload) => addMemberMutation.mutateAsync(payload)}
        onUpdateMember={(memberId, payload) =>
          updateMemberMutation.mutateAsync({ memberId, payload })
        }
        onRemoveMember={(memberId) =>
          removeMemberMutation.mutateAsync(memberId)
        }
        onInlineCheck={(memberId, description) =>
          updateMemberTaskDescMutation.mutate({ memberId, description })
        }
        onVerify={() =>
          verifyMutation.mutate({ id: selectedTask.id, remarks: "" })
        }
        onReject={(remarks) =>
          rejectMutation.mutate({ id: selectedTask.id, remarks })
        }
        isMarkingDone={markDoneMutation.isPending}
        isReverting={revertDoneMutation.isPending}
        isDeleting={deleteMutation.isPending}
        isAddingMember={addMemberMutation.isPending}
        isUpdatingMember={updateMemberMutation.isPending}
        isRemovingMember={removeMemberMutation.isPending}
        isVerifying={verifyMutation.isPending}
        isRejecting={rejectMutation.isPending}
      />

      {selectedTask && canManage && (
        <RateEmployeesModal
          isOpen={isRateOpen}
          onClose={() => setIsRateOpen(false)}
          task={selectedTask}
          onSubmit={(ratings) => rateMutation.mutateAsync(ratings)}
          isSubmitting={rateMutation.isPending}
        />
      )}
    </PageContainer>
  );
}
