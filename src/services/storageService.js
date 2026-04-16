import { supabase } from "../lib/supabase.js";
import imageCompression from 'browser-image-compression';

export const storageService = {
  /**
   * Compresses and uploads an image to the task-attachments bucket.
   * Path: {userId}/{taskId}_{timestamp}.{ext}
   */
  async uploadTaskAttachment(userId, taskId, file) {
    if (!userId || !taskId || !file) throw new Error("Missing required fields for upload.");

    // Compress the image before uploading to save free tier space
    const options = {
      maxSizeMB: 1, // Compress to max 1MB
      maxWidthOrHeight: 1920,
      useWebWorker: true
    };
    
    let fileToUpload = file;
    try {
      if (file.type.startsWith('image/')) {
         fileToUpload = await imageCompression(file, options);
      }
    } catch (error) {
      console.warn("Compression failed, uploading original.", error);
    }

    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'png';
    const filePath = `${userId}/${taskId}_${timestamp}.${extension}`;

    const { data, error } = await supabase.storage
      .from('task-attachments')
      .upload(filePath, fileToUpload, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;
    
    // Returns the storage path needed for the DB
    return data.path;
  },

  /**
   * Batch get signed URLs for viewing attachments.
   */
  async getSignedUrls(paths = []) {
    if (!paths || paths.length === 0) return [];
    
    const { data, error } = await supabase.storage
      .from('task-attachments')
      .createSignedUrls(paths, 3600); // 1 hour expiry

    if (error) throw error;
    return data.map((d, index) => ({
       path: paths[index],
       signedUrl: d.signedUrl 
    }));
  },

  /**
   * Delete an attachment
   */
  async deleteAttachment(path) {
    if (!path) return;
    
    const { error } = await supabase.storage
      .from('task-attachments')
      .remove([path]);

    if (error) throw error;
    return true;
  },

  /**
   * Upload a profile image (avatar/banner) for an employee.
   * Path: profile-media/{userId}/{kind}_{timestamp}.{ext}
   */
  async uploadProfileImage(userId, kind, file) {
    if (!userId || !kind || !file) throw new Error("Missing required upload fields.");
    if (!["avatar", "banner"].includes(kind)) throw new Error("Invalid upload kind.");

    const options = {
      maxSizeMB: kind === "banner" ? 1.5 : 1,
      maxWidthOrHeight: kind === "banner" ? 2200 : 1024,
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

    const timestamp = Date.now();
    const extension = file.name.split(".").pop() || "png";
    const filePath = `profile-media/${userId}/${kind}_${timestamp}.${extension}`;

    const { data, error } = await supabase.storage
      .from("task-attachments")
      .upload(filePath, fileToUpload, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) throw error;
    return data.path;
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
