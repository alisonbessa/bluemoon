import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import {
  successResponse,
  internalError,
} from "@/shared/lib/api/responses";

export const POST = withAuthRequired(async (req, context) => {
  try {
    const { session } = context;
    const body = (await req.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // Validate file path - should be for avatars only
        const fileExtension = pathname.split(".").pop()?.toLowerCase() || "jpg";
        const allowedExtensions = ["jpg", "jpeg", "png", "gif", "webp"];

        if (!allowedExtensions.includes(fileExtension)) {
          throw new Error("Only image files are allowed for avatars");
        }

        // Generate a unique path for this user's avatar
        const fileUuid = crypto.randomUUID();
        const finalPathname = `users/${session.user.id}/avatars/${fileUuid}.${fileExtension}`;

        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
          ],
          tokenPayload: JSON.stringify({
            userId: session.user.id,
            type: "avatar",
          }),
          maximumSizeInBytes: 5 * 1024 * 1024, // 5MB
          validUntil: Date.now() + 3600000, // 1 hour
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log("Avatar uploaded successfully:", blob.url);
        // You can update the user's avatar in the database here if needed
      },
    });

    return successResponse(jsonResponse);
  } catch (error) {
    console.error("Error handling avatar upload:", error);
    return internalError(
      error instanceof Error ? error.message : "Failed to create upload URL"
    );
  }
});
