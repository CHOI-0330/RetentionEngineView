/**
 * MentorAssignment View コンポーネント
 *
 * メンター割り当て機能のUIを担当するViewコンポーネント
 * MentorDashboardPageから分離して責務を明確化
 */

"use client";

import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

// ============================================
// 型定義
// ============================================

export interface NewhireOption {
  userId: string;
  displayName: string;
  email?: string;
  isAssigned: boolean;
}

export interface MentorAssignmentViewProps {
  newhireOptions: NewhireOption[];
  selectedNewhireId: string;
  onSelectNewhire: (newhireId: string) => void;
  onCreateAssignment: () => void;
  onRefreshNewhires: () => void;
  isLoadingNewhires: boolean;
  isAssigning: boolean;
  assignmentError: string | null;
}

// ============================================
// 内部コンポーネント
// ============================================

interface AssignedNewhireListProps {
  newhires: NewhireOption[];
}

const AssignedNewhireList = ({ newhires }: AssignedNewhireListProps) => {
  if (newhires.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
      <div>
        <p className="text-base font-medium">Assigned New Hires</p>
        <p className="text-sm text-muted-foreground">
          New hires currently assigned to you.
        </p>
      </div>
      <div className="grid gap-2">
        {newhires.map((newhire) => (
          <div
            key={newhire.userId}
            className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium">{newhire.displayName}</span>
              {newhire.email && (
                <span className="text-xs text-muted-foreground">
                  {newhire.email}
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">Assigned</span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface NewhireSelectFormProps {
  availableNewhires: NewhireOption[];
  totalCount: number;
  selectedNewhireId: string;
  onSelectNewhire: (newhireId: string) => void;
  onCreateAssignment: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  isAssigning: boolean;
  error: string | null;
}

const NewhireSelectForm = ({
  availableNewhires,
  totalCount,
  selectedNewhireId,
  onSelectNewhire,
  onCreateAssignment,
  onRefresh,
  isLoading,
  isAssigning,
  error,
}: NewhireSelectFormProps) => {
  const getPlaceholder = () => {
    if (isLoading) return "Loading...";
    if (availableNewhires.length === 0) return "No new hires available";
    return "Select a new hire";
  };

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
      <div>
        <p className="text-base font-medium">Create Assignment</p>
        <p className="text-sm text-muted-foreground">
          Assign a new hire to yourself as their mentor.
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Select New Hire
        </label>
        <Select
          value={selectedNewhireId}
          onValueChange={onSelectNewhire}
          disabled={isLoading || isAssigning}
        >
          <SelectTrigger className="w-full h-12">
            <SelectValue placeholder={getPlaceholder()} />
          </SelectTrigger>
          <SelectContent>
            {availableNewhires.map((newhire) => (
              <SelectItem key={newhire.userId} value={newhire.userId}>
                <div className="flex flex-col">
                  <span>{newhire.displayName}</span>
                  {newhire.email && (
                    <span className="text-xs text-muted-foreground">
                      {newhire.email}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-3">
        <Button
          onClick={onCreateAssignment}
          disabled={isAssigning || !selectedNewhireId}
          className="h-10"
        >
          {isAssigning ? "Creating..." : "Add Assignment"}
        </Button>
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-10"
        >
          {isLoading ? "Refreshing..." : "Refresh List"}
        </Button>
      </div>
      {totalCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {availableNewhires.length} of {totalCount} available for assignment
        </p>
      )}
    </div>
  );
};

// ============================================
// メインコンポーネント
// ============================================

export const MentorAssignmentView = ({
  newhireOptions,
  selectedNewhireId,
  onSelectNewhire,
  onCreateAssignment,
  onRefreshNewhires,
  isLoadingNewhires,
  isAssigning,
  assignmentError,
}: MentorAssignmentViewProps) => {
  const availableNewhires = newhireOptions.filter((n) => !n.isAssigned);
  const assignedNewhires = newhireOptions.filter((n) => n.isAssigned);

  return (
    <>
      <AssignedNewhireList newhires={assignedNewhires} />
      <NewhireSelectForm
        availableNewhires={availableNewhires}
        totalCount={newhireOptions.length}
        selectedNewhireId={selectedNewhireId}
        onSelectNewhire={onSelectNewhire}
        onCreateAssignment={onCreateAssignment}
        onRefresh={onRefreshNewhires}
        isLoading={isLoadingNewhires}
        isAssigning={isAssigning}
        error={assignmentError}
      />
    </>
  );
};

export default MentorAssignmentView;
