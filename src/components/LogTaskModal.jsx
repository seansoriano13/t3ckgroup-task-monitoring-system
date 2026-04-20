import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";

// Hooks
import { useLogTaskData } from "../hooks/useLogTaskData";
import { useLogTaskHandlers } from "../hooks/useLogTaskHandlers";

// Components
import LogTaskHeader from "./log-task/LogTaskHeader";
import LogTaskDetailsSection from "./log-task/LogTaskDetailsSection";
import LogTaskPropertyBar from "./log-task/LogTaskPropertyBar";
import LogTaskAssignmentBar from "./log-task/LogTaskAssignmentBar";
import LogTaskFooter from "./log-task/LogTaskFooter";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// ═════════════════════════════════════════════════════════════
//  MODAL COMPONENT
// ═════════════════════════════════════════════════════════════
export default function LogTaskModal({ isOpen, onClose }) {
  const { user } = useAuth();

  const titleRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const categoryRef = useRef(null);
  const priorityRef = useRef(null);
  const endTimeRef = useRef(null);
  const assignmentRef = useRef(null);

  // ── Data Hook ─────────────────────────────────────────────
  const {
    categories,
    employees,
    availableHeads,
    isLoadingData,
    roles
  } = useLogTaskData(isOpen, user);

  // ── Handlers & Form Hook ──────────────────────────────────
  const {
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
    isSubmitting,
    hrDeptFilter,
    setHrDeptFilter,
    hrSubDeptFilter,
    setHrSubDeptFilter,
    isExpanded,
    setIsExpanded
  } = useLogTaskHandlers({ isOpen, onClose, user, categories, employees, availableHeads, roles });

  // ── Auto-scroll Helper ────────────────────────────────────
  const scrollToElement = (ref, isSelect = false) => {
    if (ref.current) {
      setTimeout(() => {
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
            block: isSelect ? "center" : "nearest",
          });
        }
      }, 150);
    }
  };

  const togglePopoverWithScroll = (name) => {
    handleTogglePopover(name);
    if (name === "category") scrollToElement(categoryRef);
    if (name === "priority") scrollToElement(priorityRef);
    if (name === "endTime") scrollToElement(endTimeRef);
  };

  // ── Effects ───────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => titleRef.current?.focus(), 150);
    }
  }, [isOpen]);

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
  }, [isOpen, openPopover, onClose, setOpenPopover]);

  // ── Derived / Computed ────────────────────────────────────
  const selectedCategoryObj = categories.find((c) => c.category_id === formData.categoryId);
  const isCommittee = selectedCategoryObj?.description?.toUpperCase().includes("COMMITTEE");
  const isOthersGlobal =
    selectedCategoryObj?.category_id?.toUpperCase().includes("OTHERS") ||
    selectedCategoryObj?.description?.toUpperCase().includes("OTHERS");

  const { isHr, isHead, isSuperAdmin } = roles;

  const uniqueDepts = [
    ...new Set([
      ...categories.map((c) => c.department),
      ...employees.map((e) => e.department),
    ].filter(Boolean)),
  ].sort();



  const uniqueSubDepts = [
    ...new Set([
      ...categories
        .filter((c) => !hrDeptFilter || c.department === hrDeptFilter)
        .map((c) => c.sub_department),
      ...employees
        .filter((e) => !hrDeptFilter || e.department === hrDeptFilter)
        .map((e) => e.sub_department),
    ].filter(Boolean)),
  ].sort();

  const filteredEmployees = employees
    .filter((emp) => {
      if (!isHr) return true;
      if (hrDeptFilter && emp.department !== hrDeptFilter) return false;
      if (hrSubDeptFilter && emp.sub_department !== hrSubDeptFilter)
        return false;
      return true;
    })
    .sort((a, b) => {
      if (a.id === user.id) return -1;
      if (b.id === user.id) return 1;
      return a.name.localeCompare(b.name);
    });

  const selectedEmployeeInfo = employees.find(
    (emp) => emp.id === formData.loggedById,
  ) || {
    department: user?.department || "N/A",
    sub_department: user?.sub_department || user?.subDepartment || "N/A",
  };

  const filteredCategories = categories.filter((cat) => {
    const catId = cat.category_id?.toUpperCase() || "";
    const desc = cat.description?.toUpperCase() || "";
    if (
      catId.includes("COMMITTEE") ||
      catId.includes("OTHERS") ||
      catId.includes("CHECKLIST") ||
      desc.includes("COMMITTEE") ||
      desc.includes("OTHERS") ||
      desc.includes("CHECKLIST") ||
      cat.sub_department === "ALL"
    )
      return true;
    if (isHr && hrSubDeptFilter) return cat.sub_department === hrSubDeptFilter;
    if (isHr && hrDeptFilter) return cat.department === hrDeptFilter;
    return cat.sub_department === selectedEmployeeInfo.sub_department;
  });

  const searchedCategories = filteredCategories.filter((cat) => {
    if (!categorySearch) return true;
    const q = categorySearch.toLowerCase();
    return (
      cat.category_id.toLowerCase().includes(q) ||
      cat.description.toLowerCase().includes(q)
    );
  });

  // Refined hooks needed... let's quickly check useLogTaskData and useLogTaskHandlers again.

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={`p-0 gap-0 z-[70] shadow-[0_10px_40px_-10px_rgba(79,70,229,0.15)] flex flex-col transition-all duration-300 w-[680px] sm:max-w-none max-w-[95vw] rounded-2xl ${isExpanded
            ? "top-4 bottom-4 !translate-y-0 h-[calc(100vh-2rem)] max-h-none overflow-hidden"
            : "max-h-[90vh] overflow-hidden"
          }`}
      >

        <LogTaskHeader
          user={user}
          isExpanded={isExpanded}
          onToggleExpand={() => setIsExpanded(!isExpanded)}
          onClose={onClose}
        />

        <form
          id="log-task-form"
          ref={scrollContainerRef}
          onSubmit={(e) => handleSubmit(e, { isCommittee, isOthersGlobal })}
          className="flex-1 overflow-y-auto px-5 py-3 flex flex-col min-h-0"
        >
          <LogTaskDetailsSection
            formData={formData}
            handleChange={handleChange}
            titleRef={titleRef}
            selectedEmployeeInfo={selectedEmployeeInfo}
            descriptionType={descriptionType}
            setDescriptionType={setDescriptionType}
            isExpanded={isExpanded}
          />

          <LogTaskPropertyBar
            formData={formData}
            setFormData={setFormData}
            categories={filteredCategories}
            isLoadingData={isLoadingData}
            categoryRef={categoryRef}
            priorityRef={priorityRef}
            endTimeRef={endTimeRef}
            setCommitteeRole={setCommitteeRole}
            setOthersRemarks={setOthersRemarks}
          />

          <LogTaskAssignmentBar
            formData={formData}
            setFormData={setFormData}
            roles={roles}
            employees={employees}
            availableHeads={availableHeads}
            filteredEmployees={filteredEmployees}
            selectedHead={selectedHead}
            setSelectedHead={setSelectedHead}
            assignmentRef={assignmentRef}
            uniqueDepts={uniqueDepts}
            uniqueSubDepts={uniqueSubDepts}
            hrDeptFilter={hrDeptFilter}
            setHrDeptFilter={setHrDeptFilter}
            hrSubDeptFilter={hrSubDeptFilter}
            setHrSubDeptFilter={setHrSubDeptFilter}
            onScroll={scrollToElement}
            user={user}
          />

          {/* Committee / Others details */}
          {(isCommittee || isOthersGlobal) && (
            <div className="py-3 animate-slide-down">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                {isCommittee ? "Committee Details" : "Others Details"}
              </label>
              {isCommittee && (
                <select
                  value={committeeRole}
                  onChange={(e) => setCommitteeRole(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none mb-2"
                >
                  <option value="">Select Committee Role...</option>
                  <option value="CHAIRPERSON">CHAIRPERSON</option>
                  <option value="SECRETARY">SECRETARY</option>
                  <option value="MEMBER">MEMBER</option>
                  <option value="OTHERS">OTHERS</option>
                </select>
              )}
              {(isOthersGlobal || committeeRole === "OTHERS") && (
                <textarea
                  placeholder="Specify details..."
                  value={othersRemarks}
                  onChange={(e) => setOthersRemarks(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none h-20 resize-none"
                />
              )}
            </div>
          )}
        </form>

        <LogTaskFooter
          createMore={createMore}
          setCreateMore={setCreateMore}
          isSubmitting={isSubmitting}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
