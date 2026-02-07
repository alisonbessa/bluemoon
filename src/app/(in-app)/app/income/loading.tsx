import { Skeleton } from "@/shared/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>

      {/* Income table */}
      <div className="rounded-lg border bg-card">
        {/* Table header */}
        <Skeleton className="h-10 w-full rounded-t-lg" />

        {/* Income type groups */}
        {[1, 2, 3].map((group) => (
          <div key={group}>
            {/* Group header */}
            <div className="flex items-center gap-3 px-4 py-3 border-t bg-muted/30">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-6 rounded" />
              <div className="flex-1" />
              <Skeleton className="h-4 w-20" />
            </div>
            {/* Income source rows */}
            {[1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3 px-4 py-2.5 border-t">
                <Skeleton className="h-5 w-5 rounded flex-shrink-0" />
                <Skeleton className="h-4 w-32 flex-1" />
                <Skeleton className="h-4 w-16 hidden sm:block" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
