"use client";

import { upload } from "@vercel/blob/client";
import { useState, useRef } from "react";
import { Button } from "@/shared/ui/button";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

interface BlobUploaderProps {
  onUpload: (urls: string[]) => void;
  apiEndpoint: string;
  accept?: string;
  maxSize?: number;
  buttonText?: string;
  buttonVariant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
}

export function BlobUploader({
  onUpload,
  apiEndpoint,
  accept = "image/*",
  maxSize = 5 * 1024 * 1024, // 5MB default
  buttonText = "Upload File",
  buttonVariant = "default",
  buttonSize = "default",
  multiple = false,
  disabled = false,
  className,
}: BlobUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);

      const uploadPromises = Array.from(files).map(async (file) => {
        // Validate file size
        if (file.size > maxSize) {
          throw new Error(
            `File ${file.name} is too large. Maximum size is ${maxSize / 1024 / 1024}MB`
          );
        }

        // Upload to Vercel Blob via our API endpoint
        const newBlob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: apiEndpoint,
        });

        return newBlob.url;
      });

      const urls = await Promise.all(uploadPromises);
      onUpload(urls);
      toast.success(
        `${urls.length} file${urls.length > 1 ? "s" : ""} uploaded successfully`
      );

      // Reset input
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload file"
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
        disabled={disabled || isUploading}
      />
      <Button
        type="button"
        variant={buttonVariant}
        size={buttonSize}
        onClick={handleClick}
        disabled={disabled || isUploading}
        className={className}
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            {buttonText}
          </>
        )}
      </Button>
    </>
  );
}
