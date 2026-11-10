import { Skeleton } from "@/components/ui/skeleton";

export function InspectSkeleton() {
  return (
    <div
      role="status"
      aria-label="Resolving registry items"
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-6 sm:px-6"
    >
      <Skeleton className="h-12 w-full" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-9 w-80 max-w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
