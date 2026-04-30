import { supabase } from "../lib/supabase.js";
import imageCompression from 'browser-image-compression';

export const storageService = {
  /**
   * Compresses and uploads an image to Cloudinary (formerly Supabase Storage).
   *Offloading media to Cloudinary eliminates Supabase Egress costs.
   */
  async uploadTaskAttachment(userId, taskId, file) {
    if (!userId || !taskId || !file) throw new Error("Missing required fields for upload.");
    
    // Switch to Cloudinary for all task attachments to save Supabase Egress
    return this.uploadToCloudinary(file);
  },

  /**
   * Batch get signed URLs for viewing attachments.
   * If the path is already a full URL (Cloudinary), returns it as is.
   */
  async getSignedUrls(paths = []) {
    if (!paths || paths.length === 0) return [];
    
    const supabasePaths = paths.filter(p => !p.startsWith('http'));
    const cloudinaryUrls = paths.filter(p => p.startsWith('http'));

    let signedSupabase = [];
    if (supabasePaths.length > 0) {
      const { data, error } = await supabase.storage
        .from('task-attachments')
        .createSignedUrls(supabasePaths, 3600);
      if (!error && data) {
        signedSupabase = data.map((d, i) => ({
          path: supabasePaths[i],
          signedUrl: d.signedUrl
        }));
      }
    }

    const cloudinaryMapped = cloudinaryUrls.map(url => ({
      path: url,
      signedUrl: url
    }));

    return [...signedSupabase, ...cloudinaryMapped];
  },

  /**
   * Delete an attachment.
   * Skips Supabase if it's a Cloudinary URL.
   */
  async deleteAttachment(path) {
    if (!path) return;
    
    if (path.startsWith('http')) {
      // For now, we don't delete from Cloudinary to keep it simple (requires signed requests)
      // Offloading egress is the priority.
      return true;
    }
    
    const { error } = await supabase.storage
      .from('task-attachments')
      .remove([path]);

    if (error) throw error;
    return true;
  },

  /**
   * Upload a profile image (avatar/banner) for an employee to Cloudinary.
   */
  async uploadProfileImage(userId, kind, file) {
    if (!userId || !kind || !file) throw new Error("Missing required upload fields.");
    if (!["avatar", "banner"].includes(kind)) throw new Error("Invalid upload kind.");

    // Redirect profile media to Cloudinary to save Supabase Egress
    return this.uploadToCloudinary(file);
  },

  /**
   * Get a signed URL for a single storage path.
   */
  async getSignedUrl(path, expiresIn = 3600) {
    if (!path) return null;
    const { data, error } = await supabase.storage
      .from("task-attachments")
      .createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data?.signedUrl || null;
  },

  /**
   * Upload an image directly to Cloudinary using an unsigned preset.
   */
  async uploadToCloudinary(file) {
    if (!file) throw new Error("No file provided.");

    // Compress client side first to save time and bandwidth
    const options = {
      maxSizeMB: 1, // 1 MB limit
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };

    let fileToUpload = file;
    try {
      if (file.type?.startsWith("image/")) {
        fileToUpload = await imageCompression(file, options);
      }
    } catch (error) {
      console.warn("Compression failed, uploading original.", error);
    }

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error("Missing Cloudinary configuration in .env");
    }

    const formData = new FormData();
    formData.append("file", fileToUpload);
    formData.append("upload_preset", uploadPreset);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData?.error?.message || "Cloudinary upload failed");
    }

    const data = await response.json();
    return data.secure_url;
  },
};
