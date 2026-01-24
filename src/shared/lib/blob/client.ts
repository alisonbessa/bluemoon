import { put, del, list } from "@vercel/blob";

/**
 * Upload a file to Vercel Blob storage
 * @param pathname - The path where the file will be stored (e.g., "users/123/avatar.jpg")
 * @param body - The file content (Buffer, Blob, or readable stream)
 * @param options - Additional options like content type, cache control, etc.
 * @returns The uploaded file URL
 */
export async function uploadToBlob(
  pathname: string,
  body: Blob | Buffer | ReadableStream,
  options?: {
    access?: "public";
    contentType?: string;
    cacheControl?: string;
  }
) {
  const { url } = await put(pathname, body, {
    access: options?.access || "public",
    contentType: options?.contentType,
    cacheControlMaxAge: options?.cacheControl
      ? parseInt(options.cacheControl)
      : undefined,
  });

  return url;
}

/**
 * Delete a file from Vercel Blob storage
 * @param url - The URL of the file to delete
 */
export async function deleteFromBlob(url: string) {
  await del(url);
}

/**
 * List files in Vercel Blob storage
 * @param options - Filter options
 * @returns List of blob objects
 */
export async function listBlobFiles(options?: {
  prefix?: string;
  limit?: number;
}) {
  const { blobs } = await list(options);
  return blobs;
}
