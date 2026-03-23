import { supabase } from './supabase.js';

/**
 * Uploads a file to a Supabase bucket.
 * @param {string} bucketName - The name of the bucket (e.g., 'memories').
 * @param {File} file - The file to upload.
 * @param {string} folder - Optional folder path (e.g., '2024/03').
 * @returns {Promise<string|null>} - The public URL of the uploaded file or null on error.
 */
export async function uploadFile(bucketName, file, folder = '') {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = folder ? `${folder}/${fileName}` : fileName;

        // 1. Upload the file
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Upload error:', error);
            throw error;
        }

        // 2. Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (err) {
        console.error('File upload failed:', err);
        return null;
    }
}

/**
 * Helper to delete a file from storage.
 * @param {string} bucketName 
 * @param {string} filePath 
 */
export async function deleteFile(bucketName, filePath) {
    try {
        const { error } = await supabase.storage
            .from(bucketName)
            .remove([filePath]);
        if (error) throw error;
        return true;
    } catch (err) {
        console.error('File deletion failed:', err);
        return false;
    }
}
