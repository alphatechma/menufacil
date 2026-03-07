import { cn } from '@/utils/cn';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('animate-pulse rounded-lg bg-muted', className)} {...props} />
  );
}

/** Skeleton for list pages: header + search bar + table rows */
function ListPageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <Skeleton className="h-10 w-full max-w-sm rounded-xl" />
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-4 py-3 flex gap-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-20" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-[180px]" />
              <Skeleton className="h-3 w-[120px]" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for form pages: header + form card with fields */
function FormPageSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="rounded-2xl border border-border bg-card">
        <div className="p-6 space-y-5">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          ))}
        </div>
        <div className="px-6 py-4 bg-muted/50 border-t border-border rounded-b-2xl flex justify-end gap-3">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton for detail pages: header + grid of cards */
function DetailPageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center py-2">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[140px]" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Skeleton for settings/config pages: header + card sections */
function SettingsPageSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: sections }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export { Skeleton, ListPageSkeleton, FormPageSkeleton, DetailPageSkeleton, SettingsPageSkeleton };
