import { DashboardSkeleton } from "../../src/components/PageLoading";

export default function MentorLoading() {
  return (
    <div className="container px-4 sm:px-6 py-8">
      <DashboardSkeleton />
    </div>
  );
}
