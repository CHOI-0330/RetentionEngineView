"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "../../src/components/ui/skeleton";

const ProfilePageComponent = dynamic(
  () => import("../../src/interfaceAdapters/pages/profile/ProfilePage"),
  {
    loading: () => (
      <div className="container mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>
    ),
    ssr: false,
  }
);

export default function ProfilePage() {
  return <ProfilePageComponent />;
}
