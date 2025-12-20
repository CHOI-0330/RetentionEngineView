import { DashboardSkeleton } from "../../src/components/PageLoading";

export default function StudentLoading() {
  return (
    <div className="container px-4 sm:px-6 py-8">
      <DashboardSkeleton />
    </div>
  );
}
