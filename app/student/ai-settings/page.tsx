"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "../../../src/components/ui/skeleton";

const AISettingsPageComponent = dynamic(
  () => import("../../../src/interfaceAdapters/pages/entitle/AISettingsPage"),
  {
    loading: () => (
      <div className="container mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-12 w-32" />
      </div>
    ),
    ssr: false,
  }
);

export default function AISettingsPage() {
  return <AISettingsPageComponent />;
}
