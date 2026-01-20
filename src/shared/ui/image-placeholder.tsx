"use client";

import { cn } from "@/shared/lib/utils";
import { ImageIcon } from "lucide-react";

interface ImagePlaceholderProps {
  description: string;
  aspectRatio?: "video" | "square" | "portrait" | "auto";
  className?: string;
}

export function ImagePlaceholder({
  description,
  aspectRatio = "video",
  className,
}: ImagePlaceholderProps) {
  const aspectClasses = {
    video: "aspect-video",
    square: "aspect-square",
    portrait: "aspect-[3/4]",
    auto: "",
  };

  return (
    <div
      className={cn(
        "bg-muted rounded-xl border-2 border-dashed border-muted-foreground/25",
        "flex flex-col items-center justify-center p-6 gap-3",
        aspectClasses[aspectRatio],
        className
      )}
    >
      <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground text-center max-w-md">
        {description}
      </p>
    </div>
  );
}
