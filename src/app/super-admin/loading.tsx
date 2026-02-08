import { Skeleton } from "@/shared/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>

      <div className="grid gap-6">
        {/* Daily stats chart */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <Skeleton className="h-5 w-72" />
          <Skeleton className="h-[250px] sm:h-[400px] w-full rounded" />
        </div>

        {/* Plan distribution section */}
        <div className="space-y-4">
          <Skeleton className="h-7 w-72" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-lg border bg-card p-6 space-y-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
