import { Skeleton } from "@/shared/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Goal cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
            {/* Goal header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="space-y-1">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="flex gap-1">
                <Skeleton className="h-7 w-7 rounded" />
                <Skeleton className="h-7 w-7 rounded" />
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-3.5 w-10" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-3.5 w-40" />
            </div>

            {/* Monthly suggestion */}
            <Skeleton className="h-16 w-full rounded-md" />

            {/* Contribute button */}
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
