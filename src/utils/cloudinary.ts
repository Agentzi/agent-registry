import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { Readable } from "stream";
import "dotenv/config";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads an image buffer to Cloudinary via stream
 * @param fileBuffer - The image buffer to upload
 * @param folder - Cloudinary folder path e.g. 'agentzi_users/userId/agents'
 * @param publicId - The public_id for the image in Cloudinary
 */
export const uploadImage = (
  fileBuffer: Buffer,
  folder: string,
  publicId: string,
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, overwrite: true, resource_type: "image" },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      },
    );
    Readable.from(fileBuffer).pipe(stream);
  });
};

/**
 * Deletes an image from Cloudinary by its public ID
 */
export const deleteImage = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Failed to delete old cloudinary image:", err);
  }
};

/**
 * Extracts the Cloudinary public_id from a secure URL
 * e.g. https://res.cloudinary.com/demo/image/upload/v123/folder/file.jpg → folder/file
 */
export const extractPublicId = (url: string): string | null => {
  try {
    const parts = url.split("/");
    const uploadIdx = parts.findIndex((p) => p === "upload");
    if (uploadIdx === -1) return null;

    let idPart = parts.slice(uploadIdx + 1).join("/");
    // Strip version prefix like v1234567890/
    if (/^v\d+\//.test(idPart)) {
      idPart = idPart.substring(idPart.indexOf("/") + 1);
    }
    // Strip file extension
    const dotIdx = idPart.lastIndexOf(".");
    return dotIdx !== -1 ? idPart.substring(0, dotIdx) : idPart;
  } catch {
    return null;
  }
};
