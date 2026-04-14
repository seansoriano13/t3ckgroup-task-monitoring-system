import { useState, useEffect } from "react";
import { X, Users, Building2, FolderKanban, Receipt, ClipboardList } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../context/AuthContext.jsx";
import toast from "react-hot-toast";
import ChecklistTaskInput from "./ChecklistTaskInput.jsx";

const getCurrentLocalTime = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
};

export default function AddTaskModal({ isOpen, onClose, onSubmit }) {
  const { user } = useAuth();

  // Role Checks
  const isHr = user?.is_hr === true || user?.isHr === true;
  const isHead = user?.is_head === true || user?.isHead === true;
  const isSuperAdmin = user?.is_super_admin === true || user?.isSuperAdmin === true;

  // Database States
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Head Selection States
  const [availableHeads, setAvailableHeads] = useState([]);
  const [selectedHead, setSelectedHead] = useState("");

  // HR Specific Filter States
  const [hrDeptFilter, setHrDeptFilter] = useState("");
  const [hrSubDeptFilter, setHrSubDeptFilter] = useState("");

  // Form State
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

  // Dynamic Committee/Others State
  const [committeeRole, setCommitteeRole] = useState("");
  const [othersRemarks, setOthersRemarks] = useState("");

  const [descriptionType, setDescriptionType] = useState("description");

  // Fetch Data when modal opens
  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchDropdownData = async () => {
      setIsLoadingData(true);

      try {
        // 1. Fetch Categories
        const { data: catData, error: catError } = await supabase
          .from("categories")
          .select("category_id, description, department, sub_department")
          .order("category_id");

        if (catError) console.error("Category Fetch Error:", catError);
        else if (catData) setCategories(catData);

        const userSubDept = user.sub_department || user.subDepartment;

        // 2. Fetch Employees Based on Role
        let empQuery = supabase
          .from("employees")
          .select("id, name, department, sub_department, is_super_admin")
          .neq("is_deleted", true);

        if (isSuperAdmin) {
          empQuery = empQuery.or(`is_super_admin.eq.false,is_super_admin.is.null,id.eq.${user.id}`);
        } else if (!isHr && isHead) {
          if (userSubDept) {
            empQuery = empQuery.eq("sub_department", userSubDept);
          } else {
            empQuery = empQuery.eq("department", user.department);
          }
        } else if (!isHr && !isHead) {
          empQuery = empQuery.eq("id", user.id);
        }

        const { data: empData, error: empError } = await empQuery.order("name");

        if (empError) console.error("Employee Fetch Error:", empError);
        else if (empData) setEmployees(empData);

        // 3. Fetch Available Heads + Super Admins for "Report To" dropdown
        const { data: headsData } = await supabase
          .from("employees")
          .select("id, name, department, sub_department, is_head, is_super_admin")
          .or("is_head.eq.true,is_super_admin.eq.true")
          .neq("is_deleted", true)
          .order("name");

        if (headsData) {
          setAvailableHeads(headsData);

          // Pre-select logic for regular employees
          if (!isHead && !isHr && !isSuperAdmin) {
            const matchingHeads = headsData.filter((h) => {
              if (userSubDept && h.sub_department) {
                return h.sub_department.trim().toLowerCase() === userSubDept.trim().toLowerCase();
              }
              return h.department?.trim().toLowerCase() === user.department?.trim().toLowerCase();
            });

            if (matchingHeads.length > 0) {
              setSelectedHead(matchingHeads[0].id);
            }
          }
          // For Heads assigning tasks — auto-assign to themselves
          else if (isHead && !isHr && !isSuperAdmin) {
            setSelectedHead(user.id);
          }
        }

        // Reset form data and filters for fresh open
        setHrDeptFilter(isHr && !isSuperAdmin ? (user.department || "ADMIN") : "");
        setHrSubDeptFilter(isHr && !isSuperAdmin ? (user.sub_department || user.subDepartment || "HR") : "");
        setFormData({
          loggedById: user.id,
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
      } catch (err) {
        console.error("Unexpected error fetching dropdowns:", err);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchDropdownData();
  }, [isOpen, user, isHr, isHead, isSuperAdmin]);

  // Update head pre-selection when assignee changes (for HR/SA who can pick different employees)
  useEffect(() => {
    if (!formData.loggedById || !availableHeads.length) return;
    if (isHead && !isHr && !isSuperAdmin) return; // Heads are locked to themselves

    const selectedEmployee = employees.find((e) => e.id === formData.loggedById);
    if (!selectedEmployee) return;

    const empSubDept = selectedEmployee.sub_department;
    const empDept = selectedEmployee.department;

    const matchingHeads = availableHeads.filter((h) => {
      if (empSubDept && h.sub_department) {
        return h.sub_department.trim().toLowerCase() === empSubDept.trim().toLowerCase();
      }
      return h.department?.trim().toLowerCase() === empDept?.trim().toLowerCase();
    });

    if (matchingHeads.length > 0) {
      setSelectedHead(matchingHeads[0].id);
    } else {
      setSelectedHead("");
    }
  }, [formData.loggedById, availableHeads, employees, isHead, isHr, isSuperAdmin]);

  // Handle Input Changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      if (name === "loggedById") {
        newData.categoryId = ""; // Wipe category if assignee changes
        setCommitteeRole("");
        setOthersRemarks("");
      }
      if (name === "categoryId") {
        setCommitteeRole(""); // Reset chips on category swap
        setOthersRemarks("");
      }
      return newData;
    });
  };

  const selectedCategoryObj = categories.find(
    (c) => c.category_id === formData.categoryId,
  );
  const isCommittee = selectedCategoryObj?.description
    ?.toUpperCase()
    .includes("COMMITTEE");
  const isOthersGlobal = selectedCategoryObj?.category_id
    ?.toUpperCase()
    .includes("OTHERS") || selectedCategoryObj?.description
      ?.toUpperCase()
      .includes("OTHERS");

  const handleSubmit = (e) => {
    e.preventDefault();

    // Process complex remarks merging
    let mergedRemarks = "";
    if (isCommittee) {
      if (!committeeRole) {
        toast?.error("Please select a specific Committee Role.");
        return;
      }
      mergedRemarks = `[COMMITTEE - ${committeeRole}]`;
      if (committeeRole === "OTHERS") {
        if (!othersRemarks.trim()) {
          toast?.error("Please specify details for 'Others'.");
          return;
        }
        mergedRemarks += ` ${othersRemarks.trim()}`;
      }
    } else if (isOthersGlobal) {
      if (!othersRemarks.trim()) {
        toast?.error("Please specify details for your 'Others' task.");
        return;
      }
      mergedRemarks = `[OTHERS] ${othersRemarks.trim()}`;
    }

    const isAutoVerified = false;

    const payload = {
      ...formData,
      isAutoVerified,
      remarks: mergedRemarks,
      paymentVoucher: formData.paymentVoucher?.trim() || null,
      submittedById: user.id,
      submittedByName: user.name,
      reportedTo: selectedHead || null,
    };

    if (onSubmit) onSubmit(payload);

    // Reset secondary states post-submit
    setCommitteeRole("");
    setOthersRemarks("");
  };

  if (!isOpen) return null;

  // --- HR CASCADING FILTER LOGIC ---
  const uniqueDepts = [
    ...new Set(categories.map((c) => c.department).filter(Boolean)),
  ].sort();
  const uniqueSubDepts = [
    ...new Set(
      categories
        .filter((c) => !hrDeptFilter || c.department === hrDeptFilter)
        .map((c) => c.sub_department)
        .filter(Boolean),
    ),
  ].sort();

  const filteredEmployees = employees.filter((emp) => {
    if (!isHr) return true;
    if (hrDeptFilter && emp.department !== hrDeptFilter) return false;
    if (hrSubDeptFilter && emp.sub_department !== hrSubDeptFilter) return false;
    return true;
  }).sort((a, b) => {
    if (a.id === user.id) return -1;
    if (b.id === user.id) return 1;
    return a.name.localeCompare(b.name);
  });

  // --- DYNAMIC CATEGORY & DEPARTMENT DISPLAY LOGIC ---
  const selectedEmployeeInfo = employees.find(
    (emp) => emp.id === formData.loggedById,
  ) || {
    department: user?.department || "N/A",
    sub_department: user?.sub_department || user?.subDepartment || "N/A",
  };
  const filteredCategories = categories.filter((cat) => {
      // 1. Universal Override: COMMITTEE and OTHERS must always be selectable by everyone
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
      ) return true;

      // 2. If HR is actively using the dropdown filters, respect those first
      if (isHr && hrSubDeptFilter) return cat.sub_department === hrSubDeptFilter;
      if (isHr && hrDeptFilter) return cat.department === hrDeptFilter;

      // 3. Default behavior: Strictly lock to the Selected Employee's sub-department
      return cat.sub_department === selectedEmployeeInfo.sub_department;
    });

  // --- HEADS DROPDOWN LOGIC ---
  // For regular employees: show heads matching the selected employee's dept
  // For HR/SA: show all heads
  // For Heads: hidden (auto-set to themselves)
  const filteredHeads = (() => {
    if (isHead && !isHr && !isSuperAdmin) return []; // Hidden for heads
    if (isSuperAdmin || isHr) return availableHeads; // All heads for HR/SA

    // Employee view: filter heads by their dept/subdept
    const empSubDept = selectedEmployeeInfo.sub_department;
    const empDept = selectedEmployeeInfo.department;

    return availableHeads.filter((h) => {
      if (empSubDept && h.sub_department) {
        return h.sub_department.trim().toLowerCase() === empSubDept?.trim().toLowerCase();
      }
      return h.department?.trim().toLowerCase() === empDept?.trim().toLowerCase();
    });
  })();

  const showHeadDropdown = !isHead || isHr || isSuperAdmin;

  return (
    <>
      <div
        className="dropdown-backdrop flex-center transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="fixed absolute-center w-full max-w-lg z-[9999] p-4">
        <div className="bg-gray-2 border border-gray-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex-between p-6 border-b border-gray-3 bg-gray-1 shrink-0">
            <h2 className="text-xl font-bold text-gray-12">Log New Task</h2>
            <button
              onClick={onClose}
              className="text-gray-9 hover:text-red-9 transition-colors flex-center h-8 w-8 rounded-full hover:bg-gray-3"
            >
              <X size={20} />
            </button>
          </div>

          <div className="overflow-y-auto p-6 custom-scrollbar">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* --- MANAGEMENT SECTION (Unified Look) --- */}
              <div className="grid grid-cols-2 gap-4 bg-gray-2 border border-gray-4 p-4 rounded-xl shadow-sm">
                <div className="col-span-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-10 uppercase tracking-wider mb-2">
                    <Building2 size={14} /> Organization Details
                  </label>
                </div>

                {/* Department */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider pl-1">
                    Department
                  </label>
                  {isHr ? (
                    <select
                      value={hrDeptFilter}
                      onChange={(e) => {
                        setHrDeptFilter(e.target.value);
                        setHrSubDeptFilter("");
                        setFormData((p) => ({
                          ...p,
                          loggedById: "",
                          categoryId: "",
                        }));
                      }}
                      className="min-h-[44px] w-full bg-gray-1 border border-gray-4 focus-within:border-red-9 text-gray-12 rounded-lg px-3 outline-none transition-colors text-sm"
                    >
                      <option value="">All Departments</option>
                      {uniqueDepts.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="min-h-[44px] flex items-center w-full bg-gray-1 border border-transparent rounded-lg px-3">
                      <p className="text-sm font-semibold text-gray-12">
                        {selectedEmployeeInfo.department}
                      </p>
                    </div>
                  )}
                </div>

                {/* Sub-Department */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider pl-1">
                    Sub-Department
                  </label>
                  {isHr ? (
                    <select
                      value={hrSubDeptFilter}
                      onChange={(e) => {
                        setHrSubDeptFilter(e.target.value);
                        setFormData((p) => ({
                          ...p,
                          loggedById: "",
                          categoryId: "",
                        }));
                      }}
                      disabled={!hrDeptFilter}
                      className="min-h-[44px] w-full bg-gray-1 border border-gray-4 focus-within:border-red-9 text-gray-12 rounded-lg px-3 outline-none transition-colors disabled:opacity-50 text-sm"
                    >
                      <option value="">All Sub-Departments</option>
                      {uniqueSubDepts.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="min-h-[44px] flex items-center w-full bg-gray-1 border border-transparent rounded-lg px-3">
                      <p className="text-sm font-semibold text-gray-12">
                        {selectedEmployeeInfo.sub_department}
                      </p>
                    </div>
                  )}
                </div>

                {/* ASSIGNEE (Visible to HR/HEAD) */}
                {(isHr || isHead) && (
                  <div className="col-span-2 pt-2 border-t border-gray-3">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-wider mb-1 mt-1">
                      <Users size={12} /> Assign Task To
                    </label>
                    <select
                      name="loggedById"
                      value={formData.loggedById}
                      onChange={handleChange}
                      required
                      className="min-h-[44px] w-full bg-gray-1 border border-gray-4 focus:border-gray-6 text-gray-12 rounded-lg px-3 outline-none transition-colors font-semibold text-sm"
                    >
                      <option value="" disabled>
                        Select Employee...
                      </option>
                      {filteredEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.id === user.id ? "Myself" : emp.name}
                        </option>
                      ))}
                    </select>
                    {isHr && filteredEmployees.length === 0 && (
                      <p className="text-[10px] text-red-500 mt-2 font-bold">
                        No employees found in this filter.
                      </p>
                    )}
                  </div>
                )}

                {/* REPORT TO (Head Selection) */}
                {showHeadDropdown && (
                  <div className="col-span-2 pt-2 border-t border-gray-3">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1 mt-1">
                      <ClipboardList size={12} /> Report To (Head)
                    </label>
                    <select
                      value={selectedHead}
                      onChange={(e) => setSelectedHead(e.target.value)}
                      className="min-h-[44px] w-full bg-gray-1 border border-gray-4 focus:border-amber-500 text-gray-12 rounded-lg px-3 outline-none transition-colors font-semibold text-sm"
                    >
                      <option value="">— No specific head —</option>
                      {filteredHeads.map((head) => (
                        <option key={head.id} value={head.id}>
                          {head.name} — {head.sub_department || head.department}{head.is_super_admin ? " (Admin)" : ""}
                        </option>
                      ))}
                    </select>
                    {filteredHeads.length === 0 && formData.loggedById && (
                      <p className="text-[10px] text-gray-7 mt-1 font-bold">
                        No heads found for this department.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* --- PROJECT TITLE --- */}
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-9 uppercase tracking-wider pl-1">
                  <FolderKanban size={12} /> Project / Campaign Title
                  <span className="font-normal text-gray-7 normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  name="projectTitle"
                  value={formData.projectTitle}
                  onChange={handleChange}
                  placeholder="e.g. Q2 Brand Awareness Campaign"
                  className="min-h-[44px] w-full bg-gray-1 border border-gray-4 focus:border-violet-500 text-gray-12 rounded-lg px-4 outline-none transition-colors text-sm placeholder:text-gray-7"
                />
              </div>

              {/* --- PAYMENT VOUCHER (ADMIN DEPT WIDE) --- */}
              {selectedEmployeeInfo.department?.toUpperCase() === "ADMIN" && (
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-9 uppercase tracking-wider pl-1">
                    <Receipt size={12} /> Payment Voucher
                    <span className="font-normal text-gray-7 normal-case tracking-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    name="paymentVoucher"
                    value={formData.paymentVoucher}
                    onChange={handleChange}
                    placeholder="e.g. PV001-2024"
                    className="min-h-[44px] w-full bg-gray-1 border border-gray-4 focus:border-violet-500 text-gray-12 rounded-lg px-4 outline-none transition-colors text-sm placeholder:text-gray-7"
                  />
                </div>
              )}

              {/* --- TASK DETAILS SECTION --- */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-9 uppercase tracking-wider pl-1 mb-1.5">
                    Task Category
                  </label>
                  <select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleChange}
                    disabled={!formData.loggedById}
                    className="min-h-[44px] w-full bg-gray-1 border border-gray-4 focus:border-gray-6 text-gray-12 rounded-lg px-3 outline-none transition-colors disabled:opacity-50 text-sm"
                    required
                  >
                    <option value="" disabled className="text-gray-8">
                      {isLoadingData
                        ? "Loading..."
                        : !formData.loggedById
                          ? "Select Assignee First"
                          : "Select Category..."}
                    </option>
                    {filteredCategories.map((cat) => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.category_id} - {cat.description}
                      </option>
                    ))}
                  </select>
                  {filteredCategories.length === 0 &&
                    !isLoadingData &&
                    formData.loggedById && (
                      <p className="text-[10px] text-red-500 mt-1 font-bold">
                        No categories mapped for this team.
                      </p>
                    )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-9 uppercase tracking-wider pl-1 mb-1.5">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="min-h-[44px] w-full bg-gray-1 border border-gray-4 focus:border-gray-6 text-gray-12 rounded-lg px-3 outline-none transition-colors text-sm font-bold"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH" className="text-red-9">
                      HIGH
                    </option>
                  </select>
                </div>
              </div>

              {/* DYNAMIC COMMITTEE CHIPS */}
              {isCommittee && (
                <div className="bg-gray-a2 p-4 rounded-xl border border-gray-a3 mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-3">
                    Select Committee Role
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {["EVENT", "CREATIVE", "DEMO", "BAC", "ODOO", "OTHERS"].map(
                      (role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setCommitteeRole(role)}
                          className={`px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase transition-all border shadow-sm ${committeeRole === role ? "bg-primary text-white border-primary shadow-primary/30 scale-105" : "bg-gray-1 text-gray-10 border-gray-4 hover:border-primary/50 hover:text-primary"}`}
                        >
                          {role}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* DYNAMIC OTHERS REMARKS */}
              {(isOthersGlobal ||
                (isCommittee && committeeRole === "OTHERS")) && (
                  <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-bold text-red-500 uppercase tracking-wider pl-1 mb-1.5 block flex items-center gap-1.5">
                      Specify Details (Required)
                    </label>
                    <input
                      type="text"
                      required
                      value={othersRemarks}
                      onChange={(e) => setOthersRemarks(e.target.value)}
                      placeholder="Please elaborate on your exact role or task..."
                      className="min-h-11 w-full bg-gray-1 border border-gray-6 focus:border-red-500 text-gray-12 rounded-lg px-4 outline-none transition-colors text-sm shadow-inner"
                    />
                  </div>
                )}

              {/* Time Tracking Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-9 uppercase tracking-wider pl-1 mb-1.5">
                    Start Time
                  </label>
                  <input
                    disabled
                    type="datetime-local"
                    name="startAt"
                    value={formData.startAt}
                    onChange={handleChange}
                    className="min-h-[44px] w-full
                               bg-gray-1 border border-gray-4
                               focus:border-gray-6 text-gray-12
                               rounded-lg px-3 outline-none transition-colors text-sm
                               [color-scheme:dark]

                               disabled:opacity-50
                               disabled:cursor-not-allowed
                               disabled:bg-gray-2
                               disabled:border-gray-3
                               disabled:text-gray-9
                             "
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-9 uppercase tracking-wider pl-1 mb-1.5">
                    End Time
                  </label>
                  <input
                    disabled={!isHead && !isHr}
                    type="datetime-local"
                    name="endAt"
                    value={formData.endAt}
                    onChange={handleChange}
                    className="min-h-[44px] w-full
                               bg-gray-1 border border-gray-4
                               focus:border-gray-6 text-gray-12
                               rounded-lg px-3 outline-none transition-colors text-sm
                               [color-scheme:dark]

                               disabled:opacity-50
                               disabled:cursor-not-allowed
                               disabled:bg-gray-2
                               disabled:border-gray-3
                               disabled:text-gray-9
                             "
                  />
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between pl-1">
                  <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider">
                    Task Details
                  </label>
                  <div className="flex gap-1 bg-gray-3 p-0.5 rounded-lg border border-gray-4">
                    <button
                      type="button"
                      onClick={() => setDescriptionType("description")}
                      className={`text-[10px] px-3 py-1 rounded-md font-bold transition-all ${
                        descriptionType === "description" ? "bg-gray-1 text-gray-12 shadow-sm" : "text-gray-8 hover:text-gray-10"
                      }`}
                    >
                      Description
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescriptionType("checklist")}
                      className={`text-[10px] px-3 py-1 rounded-md font-bold transition-all ${
                        descriptionType === "checklist" ? "bg-gray-1 text-gray-12 shadow-sm" : "text-gray-8 hover:text-gray-10"
                      }`}
                    >
                      Checklist
                    </button>
                  </div>
                </div>

                {descriptionType === "checklist" ? (
                  <ChecklistTaskInput 
                    value={formData.taskDescription}
                    onChange={handleChange}
                  />
                ) : (
                  <textarea
                    name="taskDescription"
                    value={
                      typeof formData.taskDescription === "string" &&
                      (formData.taskDescription.trim().startsWith("[") || formData.taskDescription.trim().startsWith("{"))
                        ? ""
                        : formData.taskDescription
                    }
                    onChange={handleChange}
                    placeholder="Detail your completed work here..."
                    className="w-full bg-gray-1 border border-gray-4 focus:border-red-9 focus:ring-1 focus:ring-red-9 text-gray-12 rounded-lg p-4 outline-none transition-all h-28 resize-none text-sm placeholder:text-gray-7 shadow-inner"
                    required
                  />
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-3 mt-2 pb-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-lg font-bold text-gray-10 hover:text-gray-12 hover:bg-gray-3 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg font-bold bg-red-9 text-gray-1 hover:bg-red-10 shadow-lg shadow-red-a3 transition-all active:scale-95 disabled:opacity-50 text-sm flex items-center gap-2"
                  disabled={isLoadingData || !formData.loggedById}
                >
                  Submit Task
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
