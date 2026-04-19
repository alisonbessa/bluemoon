"use client";

import { useMemo } from "react";
import { marked } from "marked";
import { Megaphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import type { Announcement } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement: Pick<Announcement, "title" | "body" | "ctaLabel" | "ctaUrl">;
}

export function AnnouncementModal({ open, onOpenChange, announcement }: Props) {
  const html = useMemo(
    () => marked.parse(announcement.body, { async: false }) as string,
    [announcement.body]
  );

  const showCta = !!announcement.ctaLabel && !!announcement.ctaUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary mb-2">
            <Megaphone className="size-5" />
          </div>
          <DialogTitle className="text-xl">{announcement.title}</DialogTitle>
        </DialogHeader>
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {showCta && (
            <Button asChild onClick={() => onOpenChange(false)}>
              <a
                href={announcement.ctaUrl!}
                target={announcement.ctaUrl!.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
              >
                {announcement.ctaLabel}
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
