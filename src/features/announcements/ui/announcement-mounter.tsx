"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { AnnouncementModal } from "./announcement-modal";
import type { Announcement } from "../types";

interface LatestResponse {
  announcement: Announcement | null;
  unseen: boolean;
}

export function AnnouncementMounter() {
  const { data } = useSWR<LatestResponse>("/api/app/announcements/latest");
  const [open, setOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (data?.unseen && data.announcement && !seenIds.has(data.announcement.id)) {
      setOpen(true);
    }
  }, [data, seenIds]);

  const handleClose = (next: boolean) => {
    setOpen(next);
    if (!next && data?.announcement) {
      setSeenIds((prev) => new Set(prev).add(data.announcement!.id));
      void fetch("/api/app/announcements/seen", { method: "POST" });
    }
  };

  if (!data?.announcement) return null;

  return (
    <AnnouncementModal
      open={open}
      onOpenChange={handleClose}
      announcement={data.announcement}
    />
  );
}
