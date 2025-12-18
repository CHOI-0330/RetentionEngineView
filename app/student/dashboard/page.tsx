"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "../../../src/components/ui/skeleton";

const StudentDashboardPageComponent = dynamic(
  () => import("../../../src/interfaceAdapters/pages/entitle/StudentDashboardPage"),
  {
    loading: () => (
      <div className="container mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    ),
    ssr: false,
  }
);

export default function StudentDashboardPage() {
  return <StudentDashboardPageComponent />;
}
