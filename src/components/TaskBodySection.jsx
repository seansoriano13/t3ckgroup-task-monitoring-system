import { FolderKanban, Receipt } from "lucide-react"
import Dot from "./ui/Dot"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import ChecklistTaskInput from "./ChecklistTaskInput"
import ChecklistTaskRenderer from "./ChecklistTaskRenderer"
import HighlightText from "./HighlightText"
import ImageAttachment from "./ImageAttachment"
import { useProjectTitles } from "../hooks/useProjectTitles"

export default function TaskBodySection({
  isEditing,
  formData,
  handleChange,
  descriptionType,
  setDescriptionType,
  isChecklistFormat,
  isOthersGlobal,
  taskDept,
  isOwner,
  canEdit,
  searchTerm,
  setFormData,
  executeUpdate,
  task,
  user,
}) {
  const projectTitles = useProjectTitles(task?.loggedById || task?.logged_by || user?.id, isEditing);

  return (
    <>
      {/* --- PROJECT / CAMPAIGN TITLE --- */}
      {(isEditing || formData.projectTitle) && (
        <div className="flex flex-col gap-1.5 pt-2">
          <label className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
            <FolderKanban size={12} /> Project / Campaign Title
            {isEditing && (
              <span className="font-normal text-muted-foreground normal-case tracking-normal">
                (optional)
              </span>
            )}
          </label>
          {isEditing ? (
            <div className="relative">
              <Input
                type="text"
                name="projectTitle"
                value={formData.projectTitle}
                onChange={handleChange}
                placeholder="e.g. Q2 Brand Awareness Campaign"
                className="h-11 shadow-sm"
                autoComplete="on"
                list="project-titles-list"
              />
              <datalist id="project-titles-list">
                {projectTitles.map((title) => (
                  <option key={title} value={title} />
                ))}
              </datalist>
            </div>
          ) : (
            <div className="bg-muted px-4 py-3 rounded-xl border border-border/50 text-sm font-bold text-violet-10 flex items-center gap-2 shadow-sm">
              <FolderKanban size={14} />
              {formData.projectTitle}
            </div>
          )}
        </div>
      )}

      {/* --- PAYMENT VOUCHER --- */}
      {((isEditing && taskDept?.toUpperCase() === "ADMIN") ||
        formData.paymentVoucher) && (
        <div className="flex flex-col gap-1.5 pt-2">
          <label className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
            <Receipt size={12} /> Payment Voucher
            {isEditing && (
              <span className="font-normal text-muted-foreground normal-case tracking-normal">
                (optional)
              </span>
            )}
          </label>
          {isEditing ? (
            <Input
              type="text"
              name="paymentVoucher"
              value={formData.paymentVoucher || ""}
              onChange={handleChange}
              placeholder="e.g. PV-2026-001"
              className="h-11 shadow-sm"
            />
          ) : (
            <div className="bg-muted px-4 py-3 rounded-xl border border-border/50 text-sm font-bold text-foreground flex items-center gap-2 shadow-sm">
              <Receipt size={14} />
              {formData.paymentVoucher}
            </div>
          )}
        </div>
      )}

      {/* --- OTHERS DETAILS --- */}
      {isEditing && isOthersGlobal && (
        <div className="flex flex-col gap-1.5 pt-2 animate-slide-down">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
            Others Details
          </label>
          <Textarea
            name="remarks"
            value={formData.remarks || ""}
            onChange={handleChange}
            placeholder="Specify details..."
            className="w-full bg-card border border-border text-foreground rounded-xl p-3 outline-none transition-all h-20 resize-none text-[13px] shadow-sm"
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5 pt-2">
        {isEditing ? (
          <div className="flex items-center justify-between pl-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Task Details
            </label>
            <div className="flex gap-1 bg-muted/50 p-0.5 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setDescriptionType("description")}
                className={`text-[10px] px-3 py-1 rounded-md font-bold transition-all ${
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
                className={`text-[10px] px-3 py-1 rounded-md font-bold transition-all ${
                  descriptionType === "checklist"
                    ? "bg-card text-muted-foreground00 shadow-sm"
                    : "text-muted-foreground hover:text-slate-50000"
                }`}
              >
                Checklist
              </button>
            </div>
          </div>
        ) : (
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] pl-1 flex items-center gap-2">
            <Dot />
            Description
          </label>
        )}

        {isEditing ? (
          descriptionType === "checklist" ? (
            <ChecklistTaskInput
              value={formData.taskDescription}
              onChange={handleChange}
            />
          ) : (
            <Textarea
              name="taskDescription"
              value={
                typeof formData.taskDescription === "string" &&
                (formData.taskDescription.trim().startsWith("[") ||
                  formData.taskDescription.trim().startsWith("{"))
                  ? ""
                  : formData.taskDescription
              }
              onChange={handleChange}
              required
              className="w-full bg-card border border-border text-foreground rounded-xl p-4 outline-none transition-all h-32 resize-none text-[14px] shadow-sm"
            />
          )
        ) : isChecklistFormat ? (
          <ChecklistTaskRenderer
            description={task.taskDescription}
            isOwner={isOwner}
            disabled={!canEdit || !isOwner}
            searchTerm={searchTerm}
            onInlineCheck={(newDesc) => {
              setFormData((prev) => ({
                ...prev,
                taskDescription: newDesc,
              }))
              executeUpdate(
                {
                  id: task.id,
                  taskDescription: newDesc,
                  editedBy: user.id,
                },
                true,
              )
            }}
          />
        ) : (
          <div className="bg-muted/30 p-6 rounded-2xl border border-border text-foreground leading-relaxed text-[15px] whitespace-pre-wrap shadow-sm">
            <HighlightText
              text={task.taskDescription}
              search={searchTerm}
            />
          </div>
        )}
      </div>

      {/* --- ATTACHMENTS (all tasks, owner only) --- */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-border mt-2">
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
          Attachments
        </label>
        <ImageAttachment
          taskId={task.id}
          userId={user.id}
          attachments={formData.attachments || []}
          onChange={(newAttachments) => {
            setFormData({ ...formData, attachments: newAttachments })
            executeUpdate(
              {
                id: task.id,
                attachments: newAttachments,
                editedBy: user.id,
              },
              true,
            )
          }}
          readOnly={!canEdit || !isOwner}
        />
      </div>
    </>
  )
}
