"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "../../../src/components/ui/skeleton";

const KnowledgeListPageComponent = dynamic(
  () =>
    import(
      "../../../src/interfaceAdapters/pages/entitle/KnowledgeListPage"
    ),
  {
    loading: () => (
      <div className="container mx-auto max-w-5xl px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    ),
    ssr: false,
  }
);

export default function KnowledgeListPage() {
  return <KnowledgeListPageComponent />;
}
