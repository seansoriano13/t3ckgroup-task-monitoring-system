import { Receipt } from "lucide-react";
import ChecklistTaskInput from "../ChecklistTaskInput";

export default function LogTaskDetailsSection({ 
  formData, 
  handleChange, 
  titleRef, 
  selectedEmployeeInfo,
  descriptionType,
  setDescriptionType,
  isExpanded
}) {
  return (
    <>
      {/* 1. PROJECT / CAMPAIGN TITLE */}
      <div className="animate-content-in stagger-1">
        <input
          ref={titleRef}
          type="text"
          name="projectTitle"
          value={formData.projectTitle}
          onChange={handleChange}
          placeholder="Project / Campaign Title"
          className="w-full text-lg font-semibold text-foreground bg-transparent outline-none placeholder:text-mauve-6 border-none pb-1 mb-1"
          autoComplete="off"
        />
      </div>

      {/* Payment Voucher (ADMIN dept) */}
      {selectedEmployeeInfo.department?.toUpperCase() === "ADMIN" && (
        <div className="flex items-center gap-2.5 mb-3 px-3 py-2 bg-muted border border-mauve-3 rounded-lg animate-slide-down">
          <Receipt size={14} className="text-mauve-7 shrink-0" />
          <input
            type="text"
            name="paymentVoucher"
            value={formData.paymentVoucher}
            onChange={handleChange}
            placeholder="Payment Voucher (e.g. PV001-2024)"
            className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-mauve-7"
            autoComplete="off"
          />
        </div>
      )}

      {/* 2. DESCRIPTION / CHECKLIST */}
      <div className="mb-4 animate-content-in stagger-2">
        {/* Toggle tabs */}
        <div className="flex gap-0.5 mb-2 bg-muted rounded-lg border border-mauve-3 p-0.5 w-fit">
          <button
            type="button"
            onClick={() => setDescriptionType("description")}
            className={`text-[11px] px-2.5 py-1 rounded-md font-semibold transition-all ${
              descriptionType === "description"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-muted-foreground/80"
            }`}
          >
            Description
          </button>
          <button
            type="button"
            onClick={() => setDescriptionType("checklist")}
            className={`text-[11px] px-2.5 py-1 rounded-md font-semibold transition-all ${
              descriptionType === "checklist"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-muted-foreground/80"
            }`}
          >
            Checklist
          </button>
        </div>

        {descriptionType === "checklist" ? (
          <div className="bg-card rounded-xl border border-mauve-3 p-1">
            <ChecklistTaskInput
              value={formData.taskDescription}
              onChange={handleChange}
            />
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
            className={`w-full bg-transparent border-none outline-none transition-all resize-y text-sm text-foreground placeholder:text-mauve-6 ${
              isExpanded ? "h-48" : "h-24"
            }`}
            required
          />
        )}
      </div>
    </>
  );
}
