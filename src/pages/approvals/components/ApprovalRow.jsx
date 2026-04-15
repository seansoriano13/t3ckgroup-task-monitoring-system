import { useState, useMemo, useEffect } from "react";
import { ChevronDown, ChevronUp, Maximize2 } from "lucide-react";
import { formatDate } from "../../../utils/formatDate.js";
import { formatTaskPreview } from "../../../utils/taskFormatters";
import ImageAttachment from "../../../components/ImageAttachment.jsx";
import ChecklistTaskRenderer from "../../../components/ChecklistTaskRenderer.jsx";
import { TASK_STATUS } from "../../../constants/status.js";

export function ApprovalRow({
  task,
  isHr,
  onProcess,
  isSubmitting,
  currentUserId,
  defaultExpanded,
  onViewDetails,
  appSettings,
}) {
  const [expanded, setExpanded] = useState(!!defaultExpanded);
  const [grade, setGrade] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [hrRemarks, setHrRemarks] = useState("");

  useEffect(() => {
    if (defaultExpanded) {
      queueMicrotask(() => setExpanded(true));
    }
  }, [defaultExpanded]);

  const isDelayed = useMemo(() => {
    if (!task?.createdAt) return false;
    const hrs = (new Date() - new Date(task.createdAt)) / (1000 * 60 * 60);
    return hrs >= 48;
  }, [task.createdAt]);

  const handleHeadApprove = () => {
    onProcess({
      id: task.id,
      status: TASK_STATUS.COMPLETE,
      grade: grade,
      remarks: remarks,
      endAt: new Date().toISOString(),
      evaluatedBy: currentUserId,
      editedBy: currentUserId,
      hrVerified: false,
      hrRemarks: "",
    });
  };

  const handleHeadReject = () => {
    onProcess({
      id: task.id,
      status: "NOT APPROVED",
      grade: 0,
      remarks: remarks,
      evaluatedBy: currentUserId,
      editedBy: currentUserId,
      hrVerified: false,
      hrRemarks: "",
    });
  };

  const handleHrVerify = () => {
    onProcess({
      id: task.id,
      status: TASK_STATUS.COMPLETE,
      hrVerified: true,
      hrVerifiedAt: new Date().toISOString(),
      hrRemarks: hrRemarks,
      editedBy: currentUserId,
    });
  };

  const handleHrReject = () => {
    onProcess({
      id: task.id,
      status: "NOT APPROVED",
      hrVerified: false,
      hrVerifiedAt: null,
      hrRemarks: hrRemarks,
      editedBy: currentUserId,
    });
  };

  return (
    <div
      className={`bg-gray-1 border transition-all rounded-xl shadow-sm ${
        expanded
          ? "border-gray-6 shadow-lg"
          : "border-gray-4 hover:border-gray-6"
      }`}
    >
      {/* COMPACT ROW */}
      <div
        className="p-3 md:p-4 flex items-center justify-between cursor-pointer gap-2"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-3 flex items-center justify-center font-bold text-gray-12 shrink-0 border border-gray-4 text-xs md:text-base">
            {task.loggedByName
              ? task.loggedByName.charAt(0).toUpperCase()
              : "?"}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-gray-12 text-xs md:text-sm truncate">
              {task.loggedByName}
            </h3>
            <p className="text-[9px] md:text-[10px] text-gray-9 font-bold uppercase tracking-widest truncate">
              {task.categoryId}
            </p>
          </div>

          <div className="hidden md:block ml-4 pl-4 border-l border-gray-4">
            <p className="text-sm font-semibold text-gray-11 line-clamp-1 max-w-md">
              {formatTaskPreview(task.taskDescription)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <div className="flex flex-col items-end leading-tight">
            <span className="text-[10px] md:text-xs font-bold text-gray-9">
              {formatDate(task.createdAt)}
            </span>
            {task.editedAt && (
              <span
                className="text-[9px] md:text-[10px] text-gray-8 font-bold uppercase tracking-widest"
                title={`Last modified ${formatDate(task.editedAt)}${task.editedByName ? ` by ${task.editedByName}` : ""}`}
              >
                Mod: {formatDate(task.editedAt)}
              </span>
            )}
          </div>

          {appSettings?.enable_visual_shaming && isDelayed && (
            <span className="px-2 py-1 rounded bg-orange-400/20 text-orange-500 text-[9px] font-black uppercase tracking-widest border border-orange-500/30 animate-pulse">
              Delayed
            </span>
          )}

          {task.priority === "HIGH" && (
            <>
              <span className="hidden sm:block px-2 py-1 rounded bg-red-a3 text-red-11 text-[10px] font-black uppercase tracking-widest border border-red-a5">
                High Priority
              </span>
              <div className="sm:hidden w-2 h-2 rounded-full bg-red-9 shadow-[0_0_8px_rgba(229,72,77,0.5)]" />
            </>
          )}

          <button
            className="text-gray-8 hover:text-primary transition-colors p-1"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(task);
            }}
            title="Open Full Details"
          >
            <Maximize2 size={16} />
          </button>

          <button className="text-gray-8 hover:text-gray-12 transition-colors p-1">
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* EXPANDED ACTION AREA */}
      {expanded && (
        <div className="p-4 border-t border-gray-4 bg-gray-2/50 rounded-b-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Col: Full Description */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider mb-2 block">
                Task Description
              </label>
              {task.taskDescription &&
              task.taskDescription.trim().startsWith("[") ? (
                <div className="mt-1">
                  <ChecklistTaskRenderer
                    description={task.taskDescription}
                    isOwner={false}
                    disabled={true}
                  />
                </div>
              ) : (
                <div className="bg-gray-1 p-3 md:p-4 rounded-lg border border-gray-4 text-xs md:text-sm text-gray-12 whitespace-pre-wrap leading-relaxed shadow-inner">
                  {formatTaskPreview(task.taskDescription)}
                </div>
              )}

              {task.attachments && task.attachments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-4/50">
                  <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider mb-2 block">
                    Screenshots / Attachments
                  </label>
                  <ImageAttachment
                    taskId={task.id}
                    userId={currentUserId}
                    attachments={task.attachments}
                    readOnly={true}
                    onChange={() => {}}
                  />
                </div>
              )}
            </div>

            {/* Right Col: Dynamic UI based on Role */}
            <div className="space-y-4">
              {isHr ? (
                /* --- HR UI --- */
                <>
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-bold text-gray-9 uppercase tracking-wider mb-1">
                      Manager's Evaluation
                    </p>
                    <div className="flex gap-1.5 md:gap-2 pointer-events-none select-none">
                      {[1, 2, 3, 4, 5].map((num) => {
                        const activeColorMap = {
                          1: "bg-red-500 text-gray-1 border-red-500 shadow-red-500/40",
                          2: "bg-orange-500 text-gray-1 border-orange-500 shadow-orange-500/40",
                          3: "bg-yellow-500 text-gray-1 border-yellow-500 shadow-yellow-500/40",
                          4: "bg-lime-500 text-gray-1 border-lime-500 shadow-lime-500/40",
                          5: "bg-green-500 text-gray-1 border-green-500 shadow-green-500/40",
                        };
                        const isSelected = task.grade === num;
                        return (
                          <div
                            key={num}
                            className={`flex-1 py-2.5 rounded-lg font-black border text-xs md:text-sm text-center transition-all ${
                              isSelected
                                ? `${activeColorMap[num]} shadow-md scale-[1.05]`
                                : "bg-gray-2 text-gray-10 border-gray-4 opacity-40"
                            }`}
                          >
                            {num}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {task.remarks && (
                    <div className="bg-gray-1 border border-gray-4 p-3 rounded-xl">
                      <p className="text-[10px] font-bold text-gray-9 uppercase tracking-wider mb-1">
                        Manager Remarks
                      </p>
                      <p className="text-xs text-gray-12">{task.remarks}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider mb-1 block">
                      HR Verification Notes
                    </label>
                    <input
                      type="text"
                      value={hrRemarks}
                      onChange={(e) => setHrRemarks(e.target.value)}
                      placeholder="Audit notes..."
                      className="w-full bg-gray-1 border border-gray-4 text-gray-12 rounded-lg px-3 py-2.5 outline-none focus:border-primary transition-colors text-sm"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                    <button
                      onClick={handleHrReject}
                      disabled={!hrRemarks || isSubmitting}
                      className="order-2 sm:order-1 px-4 py-2.5 rounded-lg font-bold text-sm bg-gray-3 border border-gray-4 text-gray-11 hover:text-red-11 transition-colors disabled:opacity-50"
                    >
                      Not Approve
                    </button>
                    <button
                      onClick={handleHrVerify}
                      disabled={isSubmitting}
                      className="order-1 sm:order-2 px-6 py-2.5 rounded-lg font-bold text-sm bg-green-600 text-white shadow-lg shadow-green-900/20 hover:bg-green-700 transition-colors active:scale-95 disabled:opacity-50"
                    >
                      Verify & Sign
                    </button>
                  </div>
                </>
              ) : (
                /* --- HEAD UI --- */
                <>
                  <div>
                    <label className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2 block">
                      Assign Grade (1-5)
                    </label>
                    <div className="flex gap-1.5 md:gap-2">
                      {[1, 2, 3, 4, 5].map((num) => {
                        const activeColorMap = {
                          1: "bg-red-500 text-gray-1 hover:bg-red-600 border-red-500 shadow-red-500/40",
                          2: "bg-orange-500 text-gray-1 hover:bg-orange-600 border-orange-500 shadow-orange-500/40",
                          3: "bg-yellow-500 text-gray-1 hover:bg-yellow-600 border-yellow-500 shadow-yellow-500/40",
                          4: "bg-lime-500 text-gray-1 hover:bg-lime-600 border-lime-500 shadow-lime-500/40",
                          5: "bg-green-500 text-gray-1 hover:bg-green-600 border-green-500 shadow-green-500/40",
                        };

                        return (
                          <button
                            key={num}
                            onClick={() => setGrade(num)}
                            className={`flex-1 py-2.5 rounded-lg font-black transition-all border text-xs md:text-sm ${
                              grade === num
                                ? `${activeColorMap[num]} shadow-md scale-[1.05]`
                                : "bg-gray-2 text-gray-10 border-gray-4 hover:border-gray-6 hover:bg-gray-3"
                            }`}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider mb-1 block">
                      Evaluation Remarks
                    </label>
                    <input
                      type="text"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Add feedback..."
                      className="w-full bg-gray-1 border border-gray-4 text-gray-12 rounded-lg px-3 py-2.5 outline-none focus:border-primary transition-colors text-sm"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                    <button
                      onClick={handleHeadReject}
                      disabled={!remarks || isSubmitting}
                      className="order-2 sm:order-1 px-4 py-2.5 rounded-lg font-bold text-sm bg-gray-3 border border-gray-4 text-gray-11 hover:text-red-11 transition-colors disabled:opacity-50"
                    >
                      Not Approve
                    </button>
                    <button
                      onClick={handleHeadApprove}
                      disabled={grade === null || isSubmitting}
                      className="order-1 sm:order-2 px-6 py-2.5 rounded-lg font-bold text-sm bg-green-600 text-white shadow-lg shadow-green-900/20 hover:bg-green-700 transition-colors active:scale-95 disabled:opacity-50"
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
