/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export default function AdminTabSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Header & Actions Bar Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-white/10 rounded-lg"></div>
          <div className="h-4 w-72 bg-white/5 rounded"></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-28 bg-white/10 rounded-xl"></div>
          <div className="h-10 w-36 bg-[#d4a359]/20 border border-[#d4a359]/30 rounded-xl"></div>
        </div>
      </div>

      {/* Metrics Row Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
            <div className="h-3.5 w-20 bg-white/10 rounded"></div>
            <div className="h-6 w-16 bg-[#d4a359]/30 rounded"></div>
          </div>
        ))}
      </div>

      {/* Filter / Search Bar Skeleton */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/10">
        <div className="h-10 flex-1 min-w-[200px] bg-white/5 rounded-lg"></div>
        <div className="h-10 w-32 bg-white/5 rounded-lg"></div>
        <div className="h-10 w-32 bg-white/5 rounded-lg"></div>
      </div>

      {/* Table / Grid Content Skeleton */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="h-12 bg-white/[0.04] border-b border-white/10"></div>
        <div className="divide-y divide-white/5 p-2 space-y-3">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="h-14 flex items-center justify-between px-4 gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex-shrink-0"></div>
                <div className="space-y-1.5 flex-1 max-w-md">
                  <div className="h-4 w-3/4 bg-white/10 rounded"></div>
                  <div className="h-3 w-1/2 bg-white/5 rounded"></div>
                </div>
              </div>
              <div className="h-6 w-20 bg-white/5 rounded"></div>
              <div className="h-6 w-24 bg-white/10 rounded"></div>
              <div className="h-8 w-16 bg-white/5 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
