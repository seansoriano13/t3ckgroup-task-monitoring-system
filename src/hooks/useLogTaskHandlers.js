import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { taskService } from "../services/taskService";
import { getCurrentLocalTime } from "../utils/formatDate";

export function useLogTaskHandlers({ isOpen, onClose, user, categories, employees, availableHeads, roles }) {
  const queryClient = useQueryClient();
  const { isHr, isHead, isSuperAdmin } = roles;

  // ── Form status ────────────────────────────────────────────
  const [formData, setFormData] = useState({
    loggedById: user?.id || "",
    categoryId: "",
    projectTitle: "",
    taskDescription: "",
    startAt: getCurrentLocalTime(),
    endAt: "",
    priority: "LOW",
    paymentVoucher: "",
  });

  const [selectedHead, setSelectedHead] = useState("");
  const [hrDeptFilter, setHrDeptFilter] = useState("");
  const [hrSubDeptFilter, setHrSubDeptFilter] = useState("");
  const [committeeRole, setCommitteeRole] = useState("");
  const [othersRemarks, setOthersRemarks] = useState("");
  const [descriptionType, setDescriptionType] = useState("description");
  const [openPopover, setOpenPopover] = useState(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [createMore, setCreateMore] = useState(false);

  // ── Reset form when modal opens ───────────────────────────
  useEffect(() => {
    if (isOpen) {
      setFormData({
        loggedById: user?.id || "",
        categoryId: "",
        projectTitle: "",
        taskDescription: "",
        startAt: getCurrentLocalTime(),
        endAt: "",
        priority: "LOW",
        paymentVoucher: "",
      });
      setCommitteeRole("");
      setOthersRemarks("");
      setDescriptionType("description");
      setOpenPopover(null);
      setCategorySearch("");
      setSelectedHead("");
      setIsExpanded(false);
      setHrDeptFilter(isHr && !isSuperAdmin ? user.department || "ADMIN" : "");
      setHrSubDeptFilter(isHr && !isSuperAdmin ? user.sub_department || user.subDepartment || "HR" : "");
    }
  }, [isOpen, user, isHr, isSuperAdmin]);

  // ── Auto-select head when assignee changes ────────────────
  useEffect(() => {
    if (!formData.loggedById || !availableHeads.length) return;
    if (isHead && !isHr && !isSuperAdmin) {
       setSelectedHead(user.id);
       return;
    }

    const selectedEmployee = employees.find((e) => e.id === formData.loggedById);
    if (!selectedEmployee) return;

    const empSubDept = selectedEmployee.sub_department;
    const empDept = selectedEmployee.department;

    const directHeads = availableHeads.filter((h) => {
      if (empSubDept && h.sub_department && h.sub_department.toUpperCase() !== "ALL") {
        return h.sub_department.trim().toLowerCase() === empSubDept.trim().toLowerCase();
      }
      if (h.department?.toUpperCase() !== "SUPER ADMIN" && empDept) {
        return h.department?.trim().toLowerCase() === empDept?.trim().toLowerCase();
      }
      return false;
    });

    if (directHeads.length > 0) setSelectedHead(directHeads[0].id);
    else {
      const adminHeads = availableHeads.filter(
        (h) => h.is_super_admin || h.sub_department?.trim().toUpperCase() === "ALL" || h.department?.trim().toUpperCase() === "SUPER ADMIN"
      );
      if (adminHeads.length > 0) setSelectedHead(adminHeads[0].id);
      else setSelectedHead("");
    }
  }, [formData.loggedById, availableHeads, employees, isHead, isHr, isSuperAdmin, user.id]);

  const addTaskMutation = useMutation({
    mutationFn: taskService.createTask,
    onMutate: async (newTask) => {
      await queryClient.cancelQueries({ queryKey: ["dashboardTasks"] });
      const previousTasks = queryClient.getQueryData(["dashboardTasks"]);
      const optimisticTask = {
        id: `temp-${Date.now()}`,
        ...newTask,
        createdAt: new Date().toISOString(),
        status: "INCOMPLETE",
        loggedByName: user?.name,
        loggedById: user?.id,
      };
      queryClient.setQueryData(["dashboardTasks"], (old) =>
        old ? [optimisticTask, ...old] : [optimisticTask],
      );
      return { previousTasks };
    },
    onError: (error, _newTask, context) => {
      console.error("Failed to add task:", error);
      toast.error("Database error: Could not save task.");
      if (context?.previousTasks) {
        queryClient.setQueryData(["dashboardTasks"], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardTasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onSuccess: () => {
      toast.success("Task created successfully!");
      if (createMore) {
        setFormData((prev) => ({
          ...prev,
          categoryId: "",
          projectTitle: "",
          taskDescription: "",
          startAt: getCurrentLocalTime(),
          endAt: "",
          priority: "LOW",
          paymentVoucher: "",
        }));
        setCommitteeRole("");
        setOthersRemarks("");
        setDescriptionType("description");
        setOpenPopover(null);
        setCategorySearch("");
      } else {
        onClose();
      }
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTogglePopover = (name) => {
    setOpenPopover((prev) => {
      if (prev === name) return null;
      if (name === "category") setCategorySearch("");
      return name;
    });
  };

  const handleSubmit = (e, { isCommittee, isOthersGlobal }) => {
    e.preventDefault();

    if (!formData.categoryId) {
      toast.error("Please select a Category before logging your task.");
      return;
    }
    let mergedRemarks = "";
    if (isCommittee) {
      if (!committeeRole) {
        toast.error("Please select a specific Committee Role.");
        return;
      }
      mergedRemarks = `[COMMITTEE - ${committeeRole}]`;
      if (committeeRole === "OTHERS") {
        if (!othersRemarks.trim()) {
          toast.error("Please specify details for 'Others'.");
          return;
        }
        mergedRemarks += ` ${othersRemarks.trim()}`;
      }
    } else if (isOthersGlobal) {
      if (!othersRemarks.trim()) {
        toast.error("Please specify details for your 'Others' task.");
        return;
      }
      mergedRemarks = `[OTHERS] ${othersRemarks.trim()}`;
    }

    const payload = {
      ...formData,
      isAutoVerified: false,
      remarks: mergedRemarks,
      paymentVoucher: formData.paymentVoucher?.trim() || null,
      submittedById: user.id,
      submittedByName: user.name,
      reportedTo: selectedHead || null,
    };
    addTaskMutation.mutate(payload);
  };

  return {
    formData,
    setFormData,
    selectedHead,
    setSelectedHead,
    committeeRole,
    setCommitteeRole,
    othersRemarks,
    setOthersRemarks,
    descriptionType,
    setDescriptionType,
    openPopover,
    setOpenPopover,
    categorySearch,
    setCategorySearch,
    createMore,
    setCreateMore,
    handleChange,
    handleTogglePopover,
    handleSubmit,
    isSubmitting: addTaskMutation.isPending,
    hrDeptFilter,
    setHrDeptFilter,
    hrSubDeptFilter,
    setHrSubDeptFilter,
    isExpanded,
    setIsExpanded
  };
}
