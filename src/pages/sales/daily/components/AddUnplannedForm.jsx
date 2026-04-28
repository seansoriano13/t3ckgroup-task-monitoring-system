import { Plus, Image as ImageIcon, X, ChevronDown } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import { storageService } from "../../../../services/storageService";
import toast from "react-hot-toast";
import { useState } from "react";
import Dropdown from "../../../../components/ui/Dropdown";

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
        className="w-full text-[10px] font-black text-muted-foreground hover:text-[color:var(--violet-10)] transition-colors flex items-center gap-1.5 uppercase tracking-widest"
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
    <div className="animate-in fade-in slide-in-from-top-2 p-5 bg-card rounded-2xl border border-border mt-2 space-y-4 shadow-lg relative w-full overflow-hidden">
      <div className="flex justify-between items-center border-b border-border pb-3 mb-2">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--violet-10)] flex items-center gap-1.5">
          <Plus size={13} /> Unplanned Entry
        </h4>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
              Account &amp; Activity
            </label>
            <div className="flex gap-2">
              <Dropdown
                placement="bottom-start"
                trigger={({ isOpen }) => (
                  <button
                    className={`bg-card border ${isOpen ? "border-mauve-8 shadow-sm" : "border-border"} rounded-xl px-3 py-2 text-[10px] font-black outline-none cursor-pointer text-foreground transition-colors flex items-center justify-between min-w-[120px]`}
                  >
                    {payload.activity_type}
                    <ChevronDown size={14} className="opacity-50 ml-2" />
                  </button>
                )}
              >
                {({ close }) => (
                  <div className="flex flex-col p-1.5 w-[140px] max-h-[200px] overflow-y-auto">
                    {categories.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setPayload({ ...payload, activity_type: c });
                          close();
                        }}
                        className={`text-left px-3 py-2 text-[10px] font-black uppercase rounded-lg transition-colors ${payload.activity_type === c ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-mauve-4"}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </Dropdown>
              <input
                autoFocus
                required
                type="text"
                placeholder="Account Name (Required)"
                value={payload.account_name}
                onChange={(e) =>
                  setPayload({ ...payload, account_name: e.target.value })
                }
                className="flex-1 bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm font-bold text-foreground outline-none focus:border-mauve-8 focus:ring-2 focus:ring-mauve-3 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] block mb-1.5">
              Contact Person
            </label>
            <input
              type="text"
              value={payload.contact_person}
              onChange={(e) =>
                setPayload({ ...payload, contact_person: e.target.value })
              }
              className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-mauve-8 focus:ring-2 focus:ring-mauve-3 transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] block mb-1.5">
              Contact Number
            </label>
            <input
              type="text"
              value={payload.contact_number}
              onChange={(e) =>
                setPayload({ ...payload, contact_number: e.target.value })
              }
              className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-mauve-8 focus:ring-2 focus:ring-mauve-3 transition-all"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] block mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={payload.email_address}
              onChange={(e) =>
                setPayload({ ...payload, email_address: e.target.value })
              }
              className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-mauve-8 focus:ring-2 focus:ring-mauve-3 transition-all"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] block mb-1.5">
              Address
            </label>
            <input
              type="text"
              value={payload.address}
              onChange={(e) =>
                setPayload({ ...payload, address: e.target.value })
              }
              className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-mauve-8 focus:ring-2 focus:ring-mauve-3 transition-all"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] flex items-center gap-1 w-full justify-between mb-1.5">
              Execution Details
              <span className="text-[9px] font-medium text-muted-foreground italic lowercase">(optional remarks)</span>
            </label>
            <textarea
              placeholder="What occurred?"
              value={payload.details_daily}
              onChange={(e) =>
                setPayload({ ...payload, details_daily: e.target.value })
              }
              className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm text-foreground font-medium outline-none focus:border-mauve-8 focus:ring-2 focus:ring-mauve-3 transition-all resize-none h-16"
            />
          </div>
        </div>

        <div className="border-t border-border pt-4 mt-2 sm:col-span-2">
          <label className="text-[10px] font-black text-[color:var(--amber-10)] uppercase tracking-[0.2em] block mb-2.5">
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
              className="w-full bg-[color:var(--amber-2)]/50 border border-[color:var(--amber-6)] rounded-xl px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-[color:var(--amber-8)] focus:ring-2 focus:ring-amber-100 transition-all placeholder:text-muted-foreground"
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
              className="w-full bg-[color:var(--amber-2)]/50 border border-[color:var(--amber-6)] rounded-xl px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-[color:var(--amber-8)] focus:ring-2 focus:ring-amber-100 transition-all placeholder:text-muted-foreground"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        {/* --- IMAGE ATTACHMENTS --- */}
        <div className="border-t border-border pt-4 mt-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] block mb-2">
            Proof of Execution
          </label>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-black uppercase bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground px-3 py-2 rounded-xl border border-border cursor-pointer transition-all flex items-center gap-2 hover:border-mauve-6">
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
                className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                title="Clear selection"
              >
                <X size={16} />
              </button>
            )}
            {isUploading && (
              <Spinner size="sm" />
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-border mt-2">
        <button
          onClick={() => setIsOpen(false)}
          className="flex-1 py-2.5 text-[10px] font-black text-muted-foreground hover:text-foreground bg-muted rounded-xl border border-border transition-colors uppercase tracking-widest"
        >
          Cancel
        </button>
        <button
          disabled={!payload.account_name || isUploading}
          onClick={handleSave}
          className="flex-[2] py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {isUploading && <Spinner size="sm" />}
          {isUploading ? "Uploading..." : "Add Item"}
        </button>
      </div>


    </div>
  );
}
