import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { committeeTaskService } from "../../services/committeeTaskService";
import PageHeader from "../../components/ui/PageHeader";
import PageContainer from "../../components/ui/PageContainer";
import { employeeService } from "../../services/employeeService";
import toast from "react-hot-toast";
import { Users, Plus, Search } from "lucide-react";
import TabGroup from "../../components/ui/TabGroup";
import Spinner from "@/components/ui/Spinner";

import CommitteeTaskCard from "./components/CommitteeTaskCard";
import CreateCommitteeTaskModal from "./components/CreateCommitteeTaskModal";
import CommitteeTaskDetailModal from "./components/CommitteeTaskDetailModal";
import RateEmployeesModal from "./components/RateEmployeesModal";
import CommitteeTaskFilters from "../../components/CommitteeTaskFilters";
import { useCommitteeTaskFilters } from "../../hooks/useCommitteeTaskFilters";
import { useMemo } from "react";

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
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, ACTIVE, COMPLETED
  const [creatorFilter, setCreatorFilter] = useState("ALL");
  const [dueDate, setDueDate] = useState(null);

  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const selectedTask = useMemo(() => {
    return committeeTasks.find((t) => t.id === selectedTaskId) || null;
  }, [committeeTasks, selectedTaskId]);

  const [isRateOpen, setIsRateOpen] = useState(false);

  // --- Filtering ---
  const { filteredTasks, uniqueCreators } = useCommitteeTaskFilters(
    committeeTasks,
    {
      searchTerm,
      statusFilter,
      creatorFilter,
      dueDate,
    },
  );

  // --- Mutations ---

  const markDoneMutation = useMutation({
    mutationFn: (memberId) =>
      committeeTaskService.updateMemberStatus(memberId, "DONE", user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["committeeTasks"] });
      toast.success("Task marked as done!");
      // If the selected task was auto-completed, let's close or refresh it
      setSelectedTaskId(null);
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
      setSelectedTaskId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => committeeTaskService.cancelCommitteeTask(id, user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["committeeTasks"] });
      toast.success("Group Task deleted.");
      setSelectedTaskId(null);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["committeeTasks"] });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, remarks }) =>
      committeeTaskService.verifyCommitteeTask(id, user.id, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["committeeTasks"] });
      toast.success("Group Task verified!");
      setSelectedTaskId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, remarks }) =>
      committeeTaskService.rejectCommitteeTask(id, user.id, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["committeeTasks"] });
      toast.success("Group Task rejected and sent back.");
      setSelectedTaskId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-muted-foreground h-[60vh]">
        <Spinner size="md" />
        <p className="font-bold animate-pulse tracking-wider uppercase text-sm">
          Loading Group Tasks...
        </p>
      </div>
    );
  }

  return (
    <PageContainer maxWidth="7xl" className="pt-4">
      <PageHeader
        title="Group Tasks"
        description={
          canManage
            ? "Create and manage group task assignments."
            : "View your group task assignments and update progress."
        }
      />

      {/* TOOLBAR */}
      <div className="mb-6">
        <CommitteeTaskFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          creatorFilter={creatorFilter}
          setCreatorFilter={setCreatorFilter}
          dueDate={dueDate}
          setDueDate={setDueDate}
          uniqueCreators={uniqueCreators}
        />
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
              onView={() => setSelectedTaskId(task.id)}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center bg-card border border-border border-dashed rounded-2xl">
          <Users size={32} className="mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-bold text-foreground">
            No Group Tasks Found
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {searchTerm
              ? "Try adjusting your search criteria."
              : "There are no active group tasks at the moment."}
          </p>
        </div>
      )}

      {/* MODALS */}

      <CommitteeTaskDetailModal
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        task={selectedTask}
        currentUserId={user?.id}
        isSuperAdmin={isSuperAdmin}
        isHr={isHr}
        employees={employees}
        onMarkDone={(memberId) => markDoneMutation.mutate(memberId)}
        onRevertDone={(memberId) => revertDoneMutation.mutate(memberId)}
        onOpenRateModal={() => setIsRateOpen(true)}
        onDelete={() => deleteMutation.mutate(selectedTaskId)}
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
          verifyMutation.mutate({ id: selectedTaskId, remarks: "" })
        }
        onReject={(remarks) =>
          rejectMutation.mutate({ id: selectedTaskId, remarks })
        }
        isMarkingDone={markDoneMutation.isPending}
        isReverting={revertDoneMutation.isPending}
        isDeleting={deleteMutation.isPending}
        isAddingMember={addMemberMutation.isPending}
        isUpdatingMember={updateMemberMutation.isPending}
        isRemovingMember={removeMemberMutation.isPending}
        isVerifying={verifyMutation.isPending}
        isRejecting={rejectMutation.isPending}
        searchTerm={searchTerm}
      />


      {selectedTaskId && canManage && (
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
