import { useState, useEffect, useRef } from "react";
import {
  X,
  Maximize2,
  Tag,
  Clock,
  ChevronDown,
  Users,
  Receipt,
  ClipboardList,
  Check,
  Search,
} from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { useAuth } from "../../context/AuthContext.jsx";
import toast from "react-hot-toast";
import ChecklistTaskInput from "../../components/ChecklistTaskInput.jsx";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { taskService } from "../../services/taskService";
import { useNavigate } from "react-router";
import Select from "react-select";

// ─── Helpers ────────────────────────────────────────────────
const getCurrentLocalTime = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
};

const formatDateTime = (val) => {
  if (!val) return null;
  try {
    const d = new Date(val);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return val;
  }
};

// ─── React-Select theme ─────────────────────────────────────
const selectClassNames = {
  control: (state) =>
    `min-h-[38px] w-full bg-gray-1 border ${state.isFocused ? "border-gray-6 ring-1 ring-gray-6" : "border-gray-4"} hover:border-gray-5 rounded-lg px-2 shadow-sm transition-all cursor-pointer`,
  menu: () =>
    `mt-1 bg-gray-1 border border-gray-4 rounded-lg shadow-xl overflow-hidden z-[9999]`,
  menuList: () => `p-1`,
  option: (state) =>
    `px-3 py-2 cursor-pointer transition-colors rounded-md ${state.isFocused ? "bg-gray-3 text-gray-12" : state.isSelected ? "bg-gray-4 text-gray-12 font-bold" : "text-gray-11 bg-transparent"}`,
  singleValue: () => `text-gray-12 font-semibold text-[13px]`,
  placeholder: () => `text-gray-7 text-[13px]`,
  input: () => `text-gray-12 text-[13px]`,
  indicatorSeparator: () => `hidden`,
  dropdownIndicator: () => `text-gray-8 hover:text-gray-10 p-1`,
  valueContainer: () => `gap-1`,
};

// ─── Priority palette ───────────────────────────────────────
const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low", dot: "bg-emerald-400" },
  { value: "MEDIUM", label: "Medium", dot: "bg-amber-400" },
  { value: "HIGH", label: "High", dot: "bg-red-400" },
];

// ═════════════════════════════════════════════════════════════
//  MODAL COMPONENT
// ═════════════════════════════════════════════════════════════
export function LogTaskModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const titleRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const categoryRef = useRef(null);
  const priorityRef = useRef(null);
  const endTimeRef = useRef(null);
  const assignmentRef = useRef(null);

  // ── Auto-scroll Helper ────────────────────────────────────
  const scrollToElement = (ref, isSelect = false) => {
    if (ref.current) {
      setTimeout(() => {
        // For pills, we want to see the popover which opens ABOVE (bottom-full)
        // For Select, we want to see the menu which opens BELOW
        const el = ref.current;
        const popover = el.querySelector(".popover-enter");
        
        if (popover) {
          popover.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "nearest",
          });
        } else {
          el.scrollIntoView({
            behavior: "smooth",
            block: isSelect ? "center" : "nearest", // Center select to show more context
          });
        }
      }, 150);
    }
  };

  // ── Role checks ───────────────────────────────────────────
  const isHr = user?.is_hr === true || user?.isHr === true;
  const isHead = user?.is_head === true || user?.isHead === true;
  const isSuperAdmin =
    user?.is_super_admin === true || user?.isSuperAdmin === true;

  // ── Database state ────────────────────────────────────────
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // ── Head selection ────────────────────────────────────────
  const [availableHeads, setAvailableHeads] = useState([]);
  const [selectedHead, setSelectedHead] = useState("");

  // ── HR filter state ───────────────────────────────────────
  const [hrDeptFilter, setHrDeptFilter] = useState("");
  const [hrSubDeptFilter, setHrSubDeptFilter] = useState("");

  // ── Form state ────────────────────────────────────────────
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

  // ── Dynamic committee / others ────────────────────────────
  const [committeeRole, setCommitteeRole] = useState("");
  const [othersRemarks, setOthersRemarks] = useState("");
  const [descriptionType, setDescriptionType] = useState("description");

  // ── Popover state ─────────────────────────────────────────
  const [openPopover, setOpenPopover] = useState(null);
  const [categorySearch, setCategorySearch] = useState("");
  // ── Expanded state ────────────────────────────────────────
  const [isExpanded, setIsExpanded] = useState(false);
  const [createMore, setCreateMore] = useState(false);

  const togglePopover = (name) => {
    setOpenPopover((prev) => {
      if (prev === name) return null;
      if (name === "category") setCategorySearch("");
      return name;
    });

    // Auto-scroll logic for pills
    if (name === "category") scrollToElement(categoryRef);
    if (name === "priority") scrollToElement(priorityRef);
    if (name === "endTime") scrollToElement(endTimeRef);
  };

  // ── Derived flags ─────────────────────────────────────────
  const canAssignOthers = isHr || isHead;
  const isAssigningSelf = formData.loggedById === user?.id;
  const showHeadDropdown = !isHead || isHr || isSuperAdmin;

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
      setIsExpanded(false);
      // Auto-focus title
      setTimeout(() => titleRef.current?.focus(), 150);
    }
  }, [isOpen, user?.id]);

  // ── Keyboard shortcuts ────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        document.getElementById("log-task-form")?.requestSubmit();
      }
      if (e.key === "Escape") {
        if (openPopover) setOpenPopover(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, openPopover, onClose]);

  // ── Fetch dropdown data ───────────────────────────────────
  useEffect(() => {
    if (!user || !isOpen) return;

    const fetchDropdownData = async () => {
      setIsLoadingData(true);
      try {
        const { data: catData, error: catError } = await supabase
          .from("categories")
          .select("category_id, description, department, sub_department")
          .order("category_id");
        if (catError) console.error("Category Fetch Error:", catError);
        else if (catData) setCategories(catData);

        const userSubDept = user.sub_department || user.subDepartment;
        let empQuery = supabase
          .from("employees")
          .select("id, name, department, sub_department, is_super_admin")
          .neq("is_deleted", true);

        if (isSuperAdmin) {
          empQuery = empQuery.or(
            `is_super_admin.eq.false,is_super_admin.is.null,id.eq.${user.id}`
          );
        } else if (!isHr && isHead) {
          if (userSubDept) empQuery = empQuery.eq("sub_department", userSubDept);
          else empQuery = empQuery.eq("department", user.department);
        } else if (!isHr && !isHead) {
          empQuery = empQuery.eq("id", user.id);
        }

        const { data: empData, error: empError } = await empQuery.order("name");
        if (empError) console.error("Employee Fetch Error:", empError);
        else if (empData) setEmployees(empData);

        const { data: headsData } = await supabase
          .from("employees")
          .select("id, name, department, sub_department, is_head, is_super_admin")
          .or("is_head.eq.true,is_super_admin.eq.true")
          .neq("is_deleted", true)
          .order("name");

        if (headsData) {
          setAvailableHeads(headsData);
          if (!isHead && !isHr && !isSuperAdmin) {
            const directHeads = headsData.filter((h) => {
              if (userSubDept && h.sub_department && h.sub_department.toUpperCase() !== "ALL") {
                return h.sub_department.trim().toLowerCase() === userSubDept.trim().toLowerCase();
              }
              if (h.department?.toUpperCase() !== "SUPER ADMIN" && user.department) {
                return h.department?.trim().toLowerCase() === user.department?.trim().toLowerCase();
              }
              return false;
            });
            if (directHeads.length > 0) setSelectedHead(directHeads[0].id);
            else {
              const adminHeads = headsData.filter(
                (h) => h.is_super_admin || h.sub_department?.trim().toUpperCase() === "ALL" || h.department?.trim().toUpperCase() === "SUPER ADMIN"
              );
              if (adminHeads.length > 0) setSelectedHead(adminHeads[0].id);
            }
          } else if (isHead && !isHr && !isSuperAdmin) {
            setSelectedHead(user.id);
          }
        }

        setHrDeptFilter(isHr && !isSuperAdmin ? user.department || "ADMIN" : "");
        setHrSubDeptFilter(isHr && !isSuperAdmin ? user.sub_department || user.subDepartment || "HR" : "");
      } catch (err) {
        console.error("Unexpected error fetching dropdowns:", err);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchDropdownData();
  }, [user, isHr, isHead, isSuperAdmin, isOpen]);

  // ── Update head when assignee changes ─────────────────────
  useEffect(() => {
    if (!formData.loggedById || !availableHeads.length) return;
    if (isHead && !isHr && !isSuperAdmin) return;

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
  }, [formData.loggedById, availableHeads, employees, isHead, isHr, isSuperAdmin]);

  // ── Mutation ──────────────────────────────────────────────
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
        old ? [optimisticTask, ...old] : [optimisticTask]
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
        // Reset form but don't close
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
        setTimeout(() => titleRef.current?.focus(), 150);
      } else {
        onClose();
      }
    },
  });

  // ── Handlers ──────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const selectedCategoryObj = categories.find((c) => c.category_id === formData.categoryId);
  const isCommittee = selectedCategoryObj?.description?.toUpperCase().includes("COMMITTEE");
  const isOthersGlobal =
    selectedCategoryObj?.category_id?.toUpperCase().includes("OTHERS") ||
    selectedCategoryObj?.description?.toUpperCase().includes("OTHERS");

  const handleSubmit = (e) => {
    e.preventDefault();
    let mergedRemarks = "";
    if (isCommittee) {
      if (!committeeRole) { toast?.error("Please select a specific Committee Role."); return; }
      mergedRemarks = `[COMMITTEE - ${committeeRole}]`;
      if (committeeRole === "OTHERS") {
        if (!othersRemarks.trim()) { toast?.error("Please specify details for 'Others'."); return; }
        mergedRemarks += ` ${othersRemarks.trim()}`;
      }
    } else if (isOthersGlobal) {
      if (!othersRemarks.trim()) { toast?.error("Please specify details for your 'Others' task."); return; }
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

  // ── Filters / computed ────────────────────────────────────
  const uniqueDepts = [...new Set(categories.map((c) => c.department).filter(Boolean))].sort();
  const uniqueSubDepts = [...new Set(
    categories.filter((c) => !hrDeptFilter || c.department === hrDeptFilter).map((c) => c.sub_department).filter(Boolean)
  )].sort();

  const filteredEmployees = employees
    .filter((emp) => {
      if (!isHr) return true;
      if (hrDeptFilter && emp.department !== hrDeptFilter) return false;
      if (hrSubDeptFilter && emp.sub_department !== hrSubDeptFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.id === user.id) return -1;
      if (b.id === user.id) return 1;
      return a.name.localeCompare(b.name);
    });

  const selectedEmployeeInfo = employees.find((emp) => emp.id === formData.loggedById) || {
    department: user?.department || "N/A",
    sub_department: user?.sub_department || user?.subDepartment || "N/A",
  };

  const filteredCategories = categories.filter((cat) => {
    const catId = cat.category_id?.toUpperCase() || "";
    const desc = cat.description?.toUpperCase() || "";
    if (catId.includes("COMMITTEE") || catId.includes("OTHERS") || catId.includes("CHECKLIST") || desc.includes("COMMITTEE") || desc.includes("OTHERS") || desc.includes("CHECKLIST") || cat.sub_department === "ALL") return true;
    if (isHr && hrSubDeptFilter) return cat.sub_department === hrSubDeptFilter;
    if (isHr && hrDeptFilter) return cat.department === hrDeptFilter;
    return cat.sub_department === selectedEmployeeInfo.sub_department;
  });

  const searchedCategories = filteredCategories.filter((cat) => {
    if (!categorySearch) return true;
    const q = categorySearch.toLowerCase();
    return cat.category_id.toLowerCase().includes(q) || cat.description.toLowerCase().includes(q);
  });

  const filteredHeads = (() => {
    if (isHead && !isHr && !isSuperAdmin) return [];
    return availableHeads;
  })();

  const currentPriority = PRIORITY_OPTIONS.find((p) => p.value === formData.priority) || PRIORITY_OPTIONS[0];

  // ── Don't render if closed ────────────────────────────────
  if (!isOpen) return null;

  // ═══════════════════════════════════════════════════════════
  //  NOTE: This component is imported as a named export by SideNav.
  //  The default export below handles the /log-task route fallback.
  //  RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* ── Modal ─────────────────────────────────────────── */}
      <div
        className={`fixed z-[70] bg-gray-1 border border-gray-4 shadow-2xl flex flex-col transition-all duration-200 left-1/2 -translate-x-1/2 w-[680px] max-w-[95vw] rounded-2xl ${
          isExpanded
            ? "top-4 bottom-4 max-h-none"
            : "top-1/2 -translate-y-1/2 max-h-[90vh]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Popover backdrop (inside modal) */}
        {openPopover && (
          <div
            className="fixed inset-0 z-[71]"
            onClick={() => setOpenPopover(null)}
          />
        )}

        {/* ── Modal Header ────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-gray-3/40 shrink-0">
          <div className="flex items-center gap-2 text-xs text-gray-8">
            <div className="w-[18px] h-[18px] rounded flex items-center justify-center bg-primary text-white font-bold text-[9px] shrink-0">
              {user?.department?.charAt(0)?.toUpperCase() || "T"}
            </div>
            <ChevronDown size={11} className="text-gray-6 rotate-[-90deg]" />
            <span className="font-medium text-gray-10">New Task</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsExpanded((p) => !p)}
              className="p-1.5 rounded-md text-gray-8 hover:text-gray-12 hover:bg-gray-3 transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              <Maximize2 size={14} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-8 hover:text-gray-12 hover:bg-gray-3 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Modal Body (scrollable) ─────────────────────── */}
        <form
          id="log-task-form"
          ref={scrollContainerRef}
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 py-3 flex flex-col min-h-0"
        >
          {/* 1. PROJECT / CAMPAIGN TITLE */}
          <input
            ref={titleRef}
            type="text"
            name="projectTitle"
            value={formData.projectTitle}
            onChange={handleChange}
            placeholder="Project / Campaign Title"
            className="w-full text-lg font-semibold text-gray-12 bg-transparent outline-none placeholder:text-gray-6 border-none pb-1 mb-1"
            autoComplete="off"
          />

          {/* Payment Voucher (ADMIN dept) */}
          {selectedEmployeeInfo.department?.toUpperCase() === "ADMIN" && (
            <div className="flex items-center gap-2.5 mb-3 px-3 py-2 bg-gray-2 border border-gray-3 rounded-lg animate-slide-down">
              <Receipt size={14} className="text-gray-7 shrink-0" />
              <input
                type="text"
                name="paymentVoucher"
                value={formData.paymentVoucher}
                onChange={handleChange}
                placeholder="Payment Voucher (e.g. PV001-2024)"
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-12 placeholder:text-gray-7"
                autoComplete="off"
              />
            </div>
          )}

          {/* 2. DESCRIPTION / CHECKLIST */}
          <div className="mb-4 flex-1 min-h-0">
            {/* Toggle tabs */}
            <div className="flex gap-0.5 mb-2 bg-gray-2 rounded-lg border border-gray-3 p-0.5 w-fit">
              <button
                type="button"
                onClick={() => setDescriptionType("description")}
                className={`text-[11px] px-2.5 py-1 rounded-md font-semibold transition-all ${
                  descriptionType === "description"
                    ? "bg-gray-1 text-gray-12 shadow-sm"
                    : "text-gray-8 hover:text-gray-10"
                }`}
              >
                Description
              </button>
              <button
                type="button"
                onClick={() => setDescriptionType("checklist")}
                className={`text-[11px] px-2.5 py-1 rounded-md font-semibold transition-all ${
                  descriptionType === "checklist"
                    ? "bg-gray-1 text-gray-12 shadow-sm"
                    : "text-gray-8 hover:text-gray-10"
                }`}
              >
                Checklist
              </button>
            </div>

            {descriptionType === "checklist" ? (
              <div className="bg-gray-1 rounded-xl border border-gray-3 p-1">
                <ChecklistTaskInput value={formData.taskDescription} onChange={handleChange} />
              </div>
            ) : (
              <textarea
                name="taskDescription"
                value={
                  typeof formData.taskDescription === "string" &&
                  (formData.taskDescription.trim().startsWith("[") ||
                    formData.taskDescription.trim().startsWith("{"))
                    ? ""
                    : formData.taskDescription
                }
                onChange={handleChange}
                placeholder="Add description…"
                className={`w-full bg-transparent border-none outline-none transition-all resize-y text-sm text-gray-12 placeholder:text-gray-6 ${
                  isExpanded ? "h-48" : "h-24"
                }`}
                required
              />
            )}
          </div>

          {/* 3. PROPERTY BAR */}
          <div className="flex flex-wrap items-center gap-2 py-2.5 border-t border-gray-3/40">
            {/* Category Pill */}
            <div className="relative z-[72]" ref={categoryRef}>
              <button
                type="button"
                onClick={() => { if (formData.loggedById) togglePopover("category"); }}
                className={`property-pill ${openPopover === "category" ? "active" : ""} ${!formData.loggedById ? "static" : ""}`}
              >
                <Tag size={13} className="text-gray-8" />
                <span className={formData.categoryId ? "text-gray-12" : "text-gray-7"}>
                  {formData.categoryId || "Category"}
                </span>
                {formData.loggedById && <ChevronDown size={12} className="text-gray-7" />}
              </button>
              {openPopover === "category" && (
                <div className="absolute bottom-full left-0 mb-1.5 bg-gray-2 border border-gray-4 rounded-xl shadow-2xl z-[72] w-[280px] popover-enter">
                  <div className="p-2 border-b border-gray-3">
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-1 rounded-lg border border-gray-3">
                      <Search size={14} className="text-gray-7 flex-shrink-0" />
                      <input type="text" placeholder="Search categories…" value={categorySearch} onChange={(e) => setCategorySearch(e.target.value)} className="flex-1 bg-transparent outline-none text-xs text-gray-12 placeholder:text-gray-7" autoFocus />
                    </div>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto p-1 scrollbar-hide">
                    {searchedCategories.length === 0 ? (
                      <p className="text-xs text-gray-7 text-center py-4">
                        {isLoadingData ? "Loading…" : "No categories found"}
                      </p>
                    ) : (
                      searchedCategories.map((cat) => (
                        <button key={cat.category_id} type="button" onClick={() => { setFormData((p) => ({ ...p, categoryId: cat.category_id })); setCommitteeRole(""); setOthersRemarks(""); setOpenPopover(null); }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 ${formData.categoryId === cat.category_id ? "bg-gray-4 text-gray-12 font-bold" : "text-gray-11 hover:bg-gray-3"}`}
                        >
                          <span className="truncate flex-1">
                            <span className="font-semibold">{cat.category_id}</span>
                            <span className="text-gray-8 ml-1.5">— {cat.description}</span>
                          </span>
                          {formData.categoryId === cat.category_id && <Check size={14} className="text-gray-10 flex-shrink-0" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Priority Pill */}
            <div className="relative z-[72]" ref={priorityRef}>
              <button type="button" onClick={() => togglePopover("priority")} className={`property-pill ${openPopover === "priority" ? "active" : ""}`}>
                <span className={`inline-block w-2 h-2 rounded-full ${currentPriority.dot}`} />
                <span className="text-gray-11">{currentPriority.label}</span>
                <ChevronDown size={12} className="text-gray-7" />
              </button>
              {openPopover === "priority" && (
                <div className="absolute bottom-full left-0 mb-1.5 bg-gray-2 border border-gray-4 rounded-xl shadow-2xl z-[72] min-w-[150px] popover-enter p-1">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => { setFormData((p) => ({ ...p, priority: opt.value })); setOpenPopover(null); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${formData.priority === opt.value ? "bg-gray-4 text-gray-12 font-bold" : "text-gray-11 hover:bg-gray-3"}`}
                    >
                      <span className={`inline-block w-2 h-2 rounded-full ${opt.dot}`} />
                      {opt.label}
                      {formData.priority === opt.value && <Check size={13} className="ml-auto text-gray-9 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="w-px h-4 bg-gray-4 mx-0.5" />

            {/* Start Time (static pill) */}
            <div className="property-pill static" title="Start time (auto-set)">
              <Clock size={13} className="text-gray-7" />
              <span className="text-gray-8">{formatDateTime(formData.startAt)}</span>
            </div>

            {/* End Time */}
            {(isHead || isHr) ? (
              <div className="relative z-[72]" ref={endTimeRef}>
                <button type="button" onClick={() => togglePopover("endTime")} className={`property-pill ${openPopover === "endTime" ? "active" : ""}`}>
                  <Clock size={13} className={formData.endAt ? "text-gray-11" : "text-gray-7"} />
                  <span className={formData.endAt ? "text-gray-12" : "text-gray-7"}>{formData.endAt ? formatDateTime(formData.endAt) : "End time"}</span>
                  <ChevronDown size={12} className="text-gray-7" />
                </button>
                {openPopover === "endTime" && (
                  <div className="absolute bottom-full left-0 mb-1.5 bg-gray-2 border border-gray-4 rounded-xl shadow-2xl z-[72] p-3 popover-enter">
                    <label className="text-[10px] font-bold text-gray-8 uppercase tracking-wider mb-1.5 block">End Date & Time</label>
                    <input type="datetime-local" name="endAt" value={formData.endAt} onChange={handleChange} className="bg-gray-1 border border-gray-4 focus:border-gray-6 text-gray-12 rounded-lg px-3 py-2 text-xs outline-none transition-colors" />
                  </div>
                )}
              </div>
            ) : (
              <div className="property-pill static" title="End time (set by head)">
                <Clock size={13} className="text-gray-7" />
                <span className="text-gray-8">No end time</span>
              </div>
            )}


            {/* Committee Roles */}
            {isCommittee && (
              <>
                <div className="w-px h-4 bg-gray-4 mx-0.5" />
                {["EVENT", "CREATIVE", "DEMO", "BAC", "ODOO", "OTHERS"].map((role) => (
                  <button key={role} type="button" onClick={() => setCommitteeRole(role)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase transition-all border ${
                      committeeRole === role ? "bg-gray-12 text-gray-1 border-gray-12" : "bg-gray-1 text-gray-10 border-gray-4 hover:border-gray-6"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Others specify */}
          {(isOthersGlobal || (isCommittee && committeeRole === "OTHERS")) && (
            <div className="py-2 animate-slide-down">
              <input type="text" required value={othersRemarks} onChange={(e) => setOthersRemarks(e.target.value)} placeholder="Specify details for this task…" className="w-full bg-transparent border border-gray-3/50 hover:border-gray-4 focus:border-gray-6 rounded-lg px-3 py-2 outline-none transition-all text-sm text-gray-12 placeholder:text-gray-6" />
            </div>
          )}

          {/* ASSIGNMENT SECTION (HR / Head) */}
          {canAssignOthers && (
            <div className="pt-3 border-t border-gray-3/30 mt-1" ref={assignmentRef}>
              <div className="flex items-center gap-2 mb-2">
                <Users size={13} className="text-gray-7" />
                <span className="text-[10px] font-bold text-gray-8 uppercase tracking-wider">Assignment</span>
              </div>

              {/* HR Filters */}
              {isHr && (
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold text-gray-7 uppercase tracking-wider pl-1">Dept</span>
                    <Select unstyled classNames={selectClassNames}
                      options={[{ value: "", label: "All" }, ...uniqueDepts.map((d) => ({ value: d, label: d }))]}
                      value={{ value: hrDeptFilter, label: hrDeptFilter || "All" }}
                      onChange={(s) => { setHrDeptFilter(s.value); setHrSubDeptFilter(""); setFormData((p) => ({ ...p, loggedById: "", categoryId: "" })); }}
                      isSearchable={false}
                      onMenuOpen={() => scrollToElement(assignmentRef, true)}
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold text-gray-7 uppercase tracking-wider pl-1">Sub-Dept</span>
                    <Select unstyled
                      classNames={{ ...selectClassNames, control: (s) => `${selectClassNames.control(s)} ${!hrDeptFilter && "opacity-50 pointer-events-none"}` }}
                      options={[{ value: "", label: "All" }, ...uniqueSubDepts.map((s) => ({ value: s, label: s }))]}
                      value={{ value: hrSubDeptFilter, label: hrSubDeptFilter || "All" }}
                      onChange={(s) => { setHrSubDeptFilter(s.value); setFormData((p) => ({ ...p, loggedById: "", categoryId: "" })); }}
                      isSearchable={false} isDisabled={!hrDeptFilter}
                      onMenuOpen={() => scrollToElement(assignmentRef, true)}
                    />
                  </div>
                </div>
              )}

              {/* Assign To */}
              <Select unstyled classNames={selectClassNames}
                options={filteredEmployees.map((emp) => ({ value: emp.id, label: emp.id === user.id ? "Myself" : emp.name }))}
                value={filteredEmployees.find((e) => e.id === formData.loggedById)
                  ? { value: formData.loggedById, label: formData.loggedById === user.id ? "Myself" : filteredEmployees.find((e) => e.id === formData.loggedById)?.name }
                  : null}
                onChange={(s) => { setFormData((p) => ({ ...p, loggedById: s.value, categoryId: "" })); setCommitteeRole(""); setOthersRemarks(""); }}
                placeholder="Select Employee…" isSearchable
                onMenuOpen={() => scrollToElement(assignmentRef, true)}
              />
              {isHr && filteredEmployees.length === 0 && (
                <p className="text-[10px] text-red-500 mt-1 font-semibold">No employees found.</p>
              )}

              {/* Dept/Sub-Dept (when assigning to other) */}
              {!isAssigningSelf && formData.loggedById && (
                <div className="mt-2 grid grid-cols-2 gap-2 animate-slide-down">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold text-gray-7 uppercase tracking-wider pl-1">Department</span>
                    <div className="min-h-[34px] flex items-center bg-gray-2 border border-gray-3/50 rounded-lg px-3">
                      <p className="text-xs font-semibold text-gray-10">{selectedEmployeeInfo.department}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold text-gray-7 uppercase tracking-wider pl-1">Sub-Department</span>
                    <div className="min-h-[34px] flex items-center bg-gray-2 border border-gray-3/50 rounded-lg px-3">
                      <p className="text-xs font-semibold text-gray-10">{selectedEmployeeInfo.sub_department}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Report To (always visible when applicable) */}
              {showHeadDropdown && (
                <div className="flex flex-col gap-0.5 mt-2">
                  <span className="flex items-center gap-1.5 text-[9px] font-bold text-gray-7 uppercase tracking-wider pl-1">
                    <ClipboardList size={11} className="text-gray-6" />
                    Report To (Head)
                  </span>
                  <Select unstyled classNames={selectClassNames}
                    options={[{ value: "", label: "— No specific head —" }, ...filteredHeads.map((h) => ({ value: h.id, label: `${h.name} — ${h.sub_department || h.department}${h.is_super_admin ? " (Admin)" : ""}` }))]}
                    value={selectedHead ? { value: selectedHead, label: filteredHeads.find((h) => h.id === selectedHead)?.name || "— No specific head —" } : { value: "", label: "— No specific head —" }}
                    onChange={(s) => setSelectedHead(s.value)} isSearchable
                    onMenuOpen={() => scrollToElement(assignmentRef, true)}
                  />
                  {filteredHeads.length === 0 && formData.loggedById && (
                    <p className="text-[10px] text-gray-8 mt-0.5 font-semibold">No heads mapped.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </form>

        {/* ── Modal Footer ────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-3/40 shrink-0">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div
              className={`w-3.5 h-3.5 rounded border transition-all flex items-center justify-center ${
                createMore
                  ? "bg-primary border-primary"
                  : "bg-transparent border-gray-4 group-hover:border-gray-6"
              }`}
              onClick={() => setCreateMore(!createMore)}
            >
              {createMore && <Check size={10} className="text-white" strokeWidth={3} />}
            </div>
            <span className="text-[11px] text-gray-8 group-hover:text-gray-11 transition-colors select-none font-medium">Create more</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-gray-9 hover:text-gray-12 hover:bg-gray-3 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="log-task-form"
              className="flex items-center gap-2 px-5 py-2 rounded-lg font-semibold bg-primary text-white hover:bg-primary-hover shadow-sm transition-all disabled:opacity-50 text-xs"
              disabled={isLoadingData || !formData.loggedById || addTaskMutation.isPending}
            >
              {addTaskMutation.isPending ? "Creating…" : "Create Task"}
              <kbd className="text-[9px] font-medium bg-white/15 text-white/70 px-1.5 py-0.5 rounded border border-white/20 hidden sm:inline-block">
                Ctrl ↵
              </kbd>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Route fallback (generouted still maps this file to /log-task) ───
export default function LogTaskPage() {
  const nav = useNavigate();
  useEffect(() => { nav("/", { replace: true }); }, [nav]);
  return null;
}
