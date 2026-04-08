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
  }
};
