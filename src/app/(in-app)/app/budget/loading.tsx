import { Skeleton } from "@/shared/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col h-full">
      {/* Sticky header area */}
      <div className="px-3 sm:px-4 pt-4 pb-2">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>

      {/* Month selector + budget bar */}
      <div className="px-3 sm:px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-8 w-32" />
        </div>
        {/* Budget progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-3 w-full" />
        </div>
      </div>

      {/* Filter bar */}
      <div className="px-3 sm:px-4 py-2 flex gap-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-8 w-24" />
      </div>

      {/* Income section */}
      <div className="px-3 sm:px-4 py-2">
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>

      {/* Expense groups */}
      <div className="flex-1 px-3 sm:px-4 py-2 space-y-1">
        <Skeleton className="h-12 w-full rounded-t-lg" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-x">
            <Skeleton className="h-5 w-5 rounded flex-shrink-0" />
            <Skeleton className="h-4 w-32 flex-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
        <Skeleton className="h-12 w-full" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-x">
            <Skeleton className="h-5 w-5 rounded flex-shrink-0" />
            <Skeleton className="h-4 w-28 flex-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
        <Skeleton className="h-12 w-full rounded-b-lg" />
      </div>
    </div>
  );
}
