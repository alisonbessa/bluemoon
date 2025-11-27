import { uploadToBlob } from "./client";

/**
 * Upload a user's avatar to Vercel Blob
 * @param userId - The user's ID
 * @param file - The file to upload
 * @param fileName - Original file name
 * @returns The URL of the uploaded avatar
 */
export async function uploadAvatar(
  userId: string,
  file: Blob | Buffer,
  fileName: string
) {
  const fileExtension = fileName.split(".").pop()?.toLowerCase() || "jpg";
  const fileUuid = crypto.randomUUID();
  const pathname = `users/${userId}/avatars/${fileUuid}.${fileExtension}`;

  const url = await uploadToBlob(pathname, file, {
    access: "public",
    contentType: file instanceof Blob ? file.type : `image/${fileExtension}`,
    cacheControl: "31536000", // 1 year cache
  });

  return url;
}

/**
 * Upload a user's input image to Vercel Blob
 * @param userId - The user's ID
 * @param file - The file to upload
 * @param fileName - Original file name
 * @returns The URL of the uploaded image
 */
export async function uploadInputImage(
  userId: string,
  file: Blob | Buffer,
  fileName: string
) {
  const fileExtension = fileName.split(".").pop()?.toLowerCase() || "jpg";
  const fileUuid = crypto.randomUUID();
  const pathname = `users/${userId}/images/${fileUuid}.${fileExtension}`;

  const url = await uploadToBlob(pathname, file, {
    access: "public",
    contentType: file instanceof Blob ? file.type : `image/${fileExtension}`,
    cacheControl: "31536000", // 1 year cache
  });

  return url;
}

/**
 * Generate a client-side upload token for Vercel Blob
 * This allows client-side uploads directly to Vercel Blob
 * @param pathname - The path where the file will be stored
 * @param options - Upload options
 * @returns Client upload token
 */
export async function generateClientUploadToken(
  pathname: string,
  options?: {
    maximumSizeInBytes?: number;
    validUntil?: number;
  }
) {
  // For client-side uploads, we'll use handleUpload from @vercel/blob
  // This is handled in the API route
  return {
    pathname,
    maximumSizeInBytes: options?.maximumSizeInBytes || 5 * 1024 * 1024, // 5MB default
    validUntil: options?.validUntil || Date.now() + 3600000, // 1 hour
  };
}
