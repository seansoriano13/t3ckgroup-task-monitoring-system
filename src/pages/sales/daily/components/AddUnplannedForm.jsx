import { Plus, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { storageService } from "../../../../services/storageService";
import toast from "react-hot-toast";
import { useState } from "react";

export function AddUnplannedForm({
  timeOfDay,
  onSave,
  categories = ["SALES CALL", "IN-HOUSE"],
}) {
  const [isOpen, setIsOpen] = useState(false);

  const getInitialPayload = () => ({
    activity_type: "SALES CALL",
    account_name: "",
    details_daily: "",
    contact_person: "",
    contact_number: "",
    email_address: "",
    address: "",
    reference_number: "",
    expense_amount: "",
  });

  const [payload, setPayload] = useState(getInitialPayload());
  const [selectedImages, setSelectedImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full text-xs font-bold text-gray-9 hover:text-primary transition-colors flex items-center gap-1"
      >
        <Plus size={14} /> NEW UNPLANNED ITEM
      </button>
    );
  }

  const handleSave = async () => {
    if (isUploading) return;

    let attachmentsArray = [];
    if (selectedImages.length > 0) {
      if (selectedImages.length > 10) {
        toast.error("Maximum 10 images allowed.");
        return;
      }
      setIsUploading(true);
      try {
        const uploadPromises = Array.from(selectedImages).map((file) =>
          storageService.uploadToCloudinary(file),
        );
        attachmentsArray = await Promise.all(uploadPromises);
      } catch (err) {
        toast.error("Failed to upload images: " + err.message);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const finalPayload = {
      ...payload,
      time_of_day: timeOfDay,
      attachments: attachmentsArray,
    };

    // Fix optional numeric fields
    if (finalPayload.expense_amount === "") finalPayload.expense_amount = null;
    if (finalPayload.reference_number === "")
      finalPayload.reference_number = null;

    onSave(finalPayload);
    setIsOpen(false);
    setPayload(getInitialPayload());
    setSelectedImages([]);
  };

  return (
    <div className="animate-in fade-in slide-in-from-top-2 p-4 bg-gray-3 rounded-xl border border-gray-4 mt-2 space-y-4 shadow-sm relative w-full overflow-hidden">
      <div className="flex justify-between items-center border-b border-gray-4 pb-2 mb-2">
        <h4 className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
          <Plus size={14} /> Unplanned Entry
        </h4>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">
              Account &amp; Activity
            </label>
            <div className="flex gap-2">
              <select
                value={payload.activity_type}
                onChange={(e) =>
                  setPayload({ ...payload, activity_type: e.target.value })
                }
                className="bg-gray-1 border border-gray-4 rounded-lg px-2 py-2 text-xs font-bold outline-none cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                autoFocus
                required
                type="text"
                placeholder="Account Name (Required)"
                value={payload.account_name}
                onChange={(e) =>
                  setPayload({ ...payload, account_name: e.target.value })
                }
                className="flex-1 bg-gray-1 border border-gray-4 rounded-lg px-3 py-2 text-sm font-bold text-gray-12 outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">
              Contact Person
            </label>
            <input
              type="text"
              value={payload.contact_person}
              onChange={(e) =>
                setPayload({ ...payload, contact_person: e.target.value })
              }
              className="w-full bg-gray-1 border border-gray-4 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">
              Contact Number
            </label>
            <input
              type="text"
              value={payload.contact_number}
              onChange={(e) =>
                setPayload({ ...payload, contact_number: e.target.value })
              }
              className="w-full bg-gray-1 border border-gray-4 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={payload.email_address}
              onChange={(e) =>
                setPayload({ ...payload, email_address: e.target.value })
              }
              className="w-full bg-gray-1 border border-gray-4 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">
              Address
            </label>
            <input
              type="text"
              value={payload.address}
              onChange={(e) =>
                setPayload({ ...payload, address: e.target.value })
              }
              className="w-full bg-gray-1 border border-gray-4 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1 flex items-center gap-1 w-full justify-between">
              Execution Details
              <span className="text-[9px] font-medium text-gray-8 italic lowercase">
                (optional remarks)
              </span>
            </label>
            <textarea
              placeholder="What occurred?"
              value={payload.details_daily}
              onChange={(e) =>
                setPayload({ ...payload, details_daily: e.target.value })
              }
              className="w-full bg-gray-1 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus:border-primary transition-colors resize-none h-16"
            />
          </div>
        </div>

        <div className="border-t border-gray-4 pt-3 mt-1 sm:col-span-2">
          <label className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block mb-2">
            Fund Request &amp; Reference
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Ref No. (e.g. SQ/TRM)"
              value={payload.reference_number || ""}
              onChange={(e) =>
                setPayload({ ...payload, reference_number: e.target.value })
              }
              className="w-full bg-gray-1 border border-gray-4 rounded-lg px-3 py-1.5 text-xs text-gray-12 outline-none focus:border-amber-500 placeholder:text-gray-7"
            />
            <input
              type="number"
              placeholder="Est. Expense (₱)"
              value={payload.expense_amount || ""}
              onChange={(e) =>
                setPayload({
                  ...payload,
                  expense_amount:
                    e.target.value === "" ? "" : Number(e.target.value),
                })
              }
              className="w-full bg-gray-1 border border-gray-4 rounded-lg px-3 py-1.5 text-xs text-gray-12 outline-none focus:border-amber-500 placeholder:text-gray-7"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        {/* --- IMAGE ATTACHMENTS --- */}
        <div className="border-t border-gray-4 pt-3 mt-1">
          <label className="text-[10px] font-bold text-gray-9 uppercase tracking-widest block mb-1">
            Proof of Execution
          </label>
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-black uppercase bg-gray-1 hover:bg-white text-gray-9 hover:text-primary px-3 py-2 rounded-lg border border-gray-4 cursor-pointer transition-all flex items-center gap-2">
              <ImageIcon size={14} />
              {selectedImages.length > 0
                ? `${selectedImages.length} Photo(s) Selected`
                : "Attach Proof (Max 10)"}
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => setSelectedImages(Array.from(e.target.files))}
              />
            </label>
            {selectedImages.length > 0 && !isUploading && (
              <button
                onClick={() => setSelectedImages([])}
                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Clear selection"
              >
                <X size={16} />
              </button>
            )}
            {isUploading && (
              <Loader2 size={16} className="animate-spin text-primary" />
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-3 border-t border-gray-4 mt-4">
        <button
          onClick={() => setIsOpen(false)}
          className="flex-1 py-2 text-xs font-bold text-gray-9 hover:text-gray-12 bg-gray-2 rounded-lg border border-gray-4 transition-colors"
        >
          Cancel
        </button>
        <button
          disabled={!payload.account_name || isUploading}
          onClick={handleSave}
          className="flex-[2] py-2 rounded-lg bg-primary text-white text-xs font-bold shadow-lg shadow-red-a3 disabled:opacity-50 transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {isUploading && <Loader2 size={14} className="animate-spin" />}
          {isUploading ? "Uploading..." : "Add Item"}
        </button>
      </div>
    </div>
  );
}
