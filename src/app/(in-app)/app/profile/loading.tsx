import { Skeleton } from "@/shared/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>

        {/* Profile Information card */}
        <div className="rounded-lg border bg-card p-6 space-y-6">
          <div className="space-y-1">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-72" />
          </div>

          {/* Avatar section */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full flex-shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-9 w-32 rounded-md" />
              <Skeleton className="h-3 w-44" />
            </div>
          </div>

          {/* Name field */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Email field (read-only) */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-3 w-64" />
          </div>

          {/* Submit button */}
          <div className="flex justify-end">
            <Skeleton className="h-10 w-36" />
          </div>
        </div>

        {/* Account Information card */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="space-y-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
      </div>
    </div>
  );
}
