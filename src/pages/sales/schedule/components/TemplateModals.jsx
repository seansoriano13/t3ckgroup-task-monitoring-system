import { useState } from "react";
import { X, Trash2, Loader2 } from "lucide-react";

export function SaveTemplateModal({ isOpen, onClose, onSave, isSaving }) {
  const [templateName, setTemplateName] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!templateName.trim()) return;
    onSave(templateName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-gray-3 flex justify-between items-center bg-gray-1">
          <h3 className="font-black text-gray-12 uppercase tracking-widest text-sm">Save Custom Template</h3>
          <button onClick={onClose} className="text-gray-8 hover:text-gray-11 transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">Template Name</label>
            <input
              autoFocus
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Weekly Code Review"
              className="w-full bg-gray-2 border border-gray-4 rounded-xl px-3 py-2 text-sm text-gray-12 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-9 hover:bg-gray-2 rounded-xl transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSaving || !templateName.trim()}
              className="px-4 py-2 text-xs font-bold bg-primary text-white hover:bg-primary/90 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving && <Loader2 size={14} className="animate-spin" />}
              SAVE TEMPLATE
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ManageTemplatesModal({ isOpen, onClose, customTemplates, onDelete, isDeletingId }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-gray-3 flex justify-between items-center bg-gray-1">
          <h3 className="font-black text-gray-12 uppercase tracking-widest text-sm">Manage Custom Templates</h3>
          <button onClick={onClose} className="text-gray-8 hover:text-gray-11 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-5">
          {customTemplates.length === 0 ? (
            <div className="text-center text-sm text-gray-8 py-8">
              No custom templates found. <br/> Use the 3-dot menu on any activity to save one.
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {customTemplates.map((template) => (
                <div key={template.id} className="flex justify-between items-center p-3 border border-gray-3 rounded-xl hover:border-gray-5 transition-colors bg-gray-1/50">
                  <div className="min-w-0 pr-4">
                    <p className="font-bold text-sm text-gray-12 truncate">{template.template_name}</p>
                    <p className="text-xs text-gray-8 truncate">
                      {template.template_payload?.activity_type} 
                      {template.template_payload?.account_name && ` • ${template.template_payload.account_name}`}
                    </p>
                  </div>
                  <button
                    onClick={() => onDelete(template.id)}
                    disabled={isDeletingId === template.id}
                    className="p-2 text-gray-8 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors shrink-0 disabled:opacity-50"
                    title="Delete template"
                  >
                    {isDeletingId === template.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
