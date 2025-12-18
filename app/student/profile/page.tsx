"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "../../../src/components/ui/skeleton";

const AvatarSettingsPageComponent = dynamic(
  () => import("../../../src/interfaceAdapters/pages/entitle/AvatarSettingsPage"),
  {
    loading: () => (
      <div className="container mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-6">
          <Skeleton className="h-32 w-32 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <Skeleton className="h-12 w-32" />
      </div>
    ),
    ssr: false,
  }
);

export default function AvatarSettingsPage() {
  return <AvatarSettingsPageComponent />;
}
