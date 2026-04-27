import { useState, useRef, useEffect, useCallback } from "react";
import { X, ImagePlus, Maximize2, ClipboardPaste } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import { storageService } from "../services/storageService";
import toast from "react-hot-toast";

export default function CloudinaryImageAttachment({ 
  activityId, 
  attachments = [], 
  onChange, 
  readOnly = false 
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const fileInputRef = useRef(null);

  // Core upload logic — shared by file picker and paste handler
  const uploadFiles = useCallback(async (files) => {
    if (!files || files.length === 0) return;

    if (attachments.length + files.length > 10) {
      toast.error("Maximum 10 images allowed per task.");
      return;
    }

    setIsUploading(true);
    const newUrls = [...attachments];

    try {
      // Cloudinary handles concurrency well, but we'll do it iteratively to prevent network thrashing on slow connections
      const uploadPromises = files.map(file => {
        if (!file.type.startsWith('image/')) {
           throw new Error(`${file.name} is not an image.`);
        }
        if (file.size > 5 * 1024 * 1024) {
           throw new Error(`${file.name} is too large (max 5MB).`);
        }
        return storageService.uploadToCloudinary(file);
      });
      
      const uploadedUrls = await Promise.all(uploadPromises);
      newUrls.push(...uploadedUrls);

      onChange(newUrls);
      toast.success("Attachments uploaded!");
    } catch (err) {
      toast.error("Failed to upload: " + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [attachments, onChange]);

  // Clipboard paste handler — intercepts Ctrl+V screenshots
  useEffect(() => {
    if (readOnly || !activityId || activityId === "NEW") return;

    const handlePaste = (e) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imageItems = items.filter((item) => item.type.startsWith("image/"));
      if (imageItems.length === 0) return;

      e.preventDefault();
      toast("Screenshot detected — uploading...", { icon: "📋" });
      const files = imageItems.map((item) => {
        const blob = item.getAsFile();
        return new File([blob], `paste_${Date.now()}.png`, { type: blob.type });
      });
      uploadFiles(files);
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [readOnly, activityId, uploadFiles]);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    await uploadFiles(files);
  };

  const handleDelete = async (urlToRemove) => {
    // For Cloudinary, we just remove the URL from our DB payload.
    // Cloudinary images can just be orphaned if they are small/compressed, or cleaned up via bulk scripts later.
    const newUrls = attachments.filter(u => u !== urlToRemove);
    onChange(newUrls);
    toast.success("Attachment removed!");
  };

  if (readOnly && (!attachments || attachments.length === 0)) {
    return null; // Don't render anything if readonly and no attachments
  }

  return (
    <div className="space-y-3">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/jpeg, image/png, image/webp" 
        multiple 
        className="hidden" 
      />

      {/* Gallery */}
      {attachments.length > 0 && (
         <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {attachments.map((url, index) => (
              <div key={url} className="relative group rounded-lg overflow-hidden border border-mauve-4 bg-mauve-2 aspect-square flex-center">
                  <img 
                    src={url} 
                    alt={`Attachment ${index + 1}`} 
                    className="object-cover w-full h-full cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setFullscreenImage(url)}
                  />
                  
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setFullscreenImage(url); }}
                        className="bg-black/60 hover:bg-mauve-12/80 text-primary-foreground p-1 rounded backdrop-blur-sm"
                    >
                        <Maximize2 size={12} />
                    </button>
                    {!readOnly && (
                      <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(url); }}
                          className="bg-destructive/80 hover:bg-destructive text-primary-foreground p-1 rounded backdrop-blur-sm"
                      >
                          <X size={12} />
                      </button>
                    )}
                  </div>
              </div>
            ))}
         </div>
      )}

      {/* Upload Button */}
      {!readOnly && attachments.length < 10 && (
         <div className="space-y-2">
           <button 
             type="button"
             onClick={() => fileInputRef.current?.click()}
             disabled={isUploading || activityId === "NEW"}
             className="w-full py-4 border-2 border-dashed border-mauve-4 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {isUploading ? (
                <>
                   <Spinner size="sm" /> Uploading...
                </>
             ) : activityId === "NEW" ? (
               "Save task first to upload attachments"
             ) : (
                <>
                   <ImagePlus size={18} /> Add Images (Max 10)
                </>
             )}
           </button>
           {activityId !== "NEW" && !isUploading && (
             <p className="flex items-center justify-center gap-1.5 text-[11px] text-mauve-7 font-medium">
               <ClipboardPaste size={12} />
               Or paste a screenshot directly (Ctrl+V)
             </p>
           )}
         </div>
      )}

      {/* Fullscreen Lightbox */}
      {fullscreenImage && (
         <div 
           className="fixed inset-0 z-[99999] bg-black/90 flex-center p-4 backdrop-blur-sm"
           onClick={() => setFullscreenImage(null)}
         >
           <button 
             className="absolute top-6 right-6 text-primary-foreground hover:text-destructive transition-colors bg-black/50 p-2 rounded-full"
             onClick={() => setFullscreenImage(null)}
           >
             <X size={24} />
           </button>
           <img 
             src={fullscreenImage} 
             alt="Fullscreen Attachment" 
             className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" 
             onClick={(e) => e.stopPropagation()} 
           />
         </div>
      )}
    </div>
  );
}
