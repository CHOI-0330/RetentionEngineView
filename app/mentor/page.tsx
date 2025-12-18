"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "../../src/components/ui/skeleton";

const MentorDashboardPageComponent = dynamic(
  () => import("../../src/interfaceAdapters/pages/entitle/MentorDashboardPage"),
  {
    loading: () => (
      <div className="container mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    ),
    ssr: false,
  }
);

export default function MentorDashboardPage() {
  return <MentorDashboardPageComponent />;
}
