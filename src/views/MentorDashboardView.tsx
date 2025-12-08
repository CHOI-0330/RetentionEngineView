import { memo } from "react";
import type { UseCaseFailure } from "../application/entitle/models";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Loader2, MessageCircle, User, Sparkles, Search, ArrowUpDown } from "lucide-react";
import Link from "next/link";

// ============================================
// 型定義
// ============================================

export type SortOption = "lastActivity" | "createdDate" | "name";

export interface MentorDashboardStudentItem {
  id: string;
  name: string;
  avatar?: string;
  lastActivity: Date;
  status: "active" | "idle" | "offline";
  recentChat: {
    summary: string;
    aiResponse: string;
    subject: string;
    timestamp: Date;
    needsReview: boolean;
  };
  totalChats: number;
  conversationId: string;
}

export interface MentorDashboardPresenterViewModel {
  students: MentorDashboardStudentItem[];
  searchQuery: string;
  sortOption: SortOption;
  onChangeSearch: (value: string) => void;
  onSortChange: (option: SortOption) => void;
}

export interface MentorDashboardPresenterStatus {
  isLoading: boolean;
  error: UseCaseFailure | null;
}

export interface MentorDashboardPresenterMeta {
  qualitySubmitting: Record<string, boolean>;
  selectedStudentId: string | null | undefined;
}

export interface MentorDashboardPresenterInteractions {
  requestRefresh: () => void;
  acknowledgeEffect: (effectId: string) => void;
  clearError: () => void;
  selectStudent: (studentId: string | null) => void;
}

interface MentorDashboardViewProps {
  viewModel: MentorDashboardPresenterViewModel;
  status: MentorDashboardPresenterStatus;
  meta: MentorDashboardPresenterMeta;
  interactions: MentorDashboardPresenterInteractions;
  assignmentSection?: React.ReactNode;
}

const MentorDashboardView = ({
  viewModel,
  status,
  meta,
  interactions,
  assignmentSection,
}: MentorDashboardViewProps) => {
  return (
    <main className="min-h-screen pb-20">
      {/* Hero Section */}
      <HeroSection />

      <div className="container px-4 sm:px-6 space-y-12">
        {/* Error Display */}
        {status.error && (
          <ErrorBanner message={status.error.message} onClose={interactions.clearError} />
        )}

        {/* Assignment Section (passed from parent) */}
        {assignmentSection && (
          <div className="grid gap-4 sm:grid-cols-2">
            {assignmentSection}
          </div>
        )}

        {/* Search Section */}
        <SearchSection
          searchQuery={viewModel.searchQuery}
          sortOption={viewModel.sortOption}
          onChangeSearch={viewModel.onChangeSearch}
          onSortChange={viewModel.onSortChange}
          onRefresh={interactions.requestRefresh}
          isLoading={status.isLoading}
        />

        {/* Conversations Grid */}
        <ConversationsSection
          students={viewModel.students}
          selectedStudentId={meta.selectedStudentId}
          isLoading={status.isLoading}
        />
      </div>
    </main>
  );
};

export default MentorDashboardView;

// --- Sub Components ---

const HeroSection = memo(function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
      <div className="container px-4 sm:px-6 relative z-10">
        <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary backdrop-blur-sm">
            <Sparkles className="mr-1 h-3 w-3" />
            Mentor Dashboard
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Assigned New Hires
            <span className="block text-gradient mt-2">Monitor & Support</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            Review conversations between new hires and AI mentors. Provide feedback and guidance to ensure quality learning experiences.
          </p>
        </div>
      </div>

      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -z-10 h-[500px] w-[500px] bg-primary/5 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/4" />
      <div className="absolute bottom-0 left-0 -z-10 h-[300px] w-[300px] bg-secondary/20 blur-[80px] rounded-full -translate-x-1/3 translate-y-1/4" />
    </section>
  );
});

interface ErrorBannerProps {
  message: string;
  onClose: () => void;
}

const ErrorBanner = memo(function ErrorBanner({ message, onClose }: ErrorBannerProps) {
  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive animate-in fade-in zoom-in-95 flex items-center justify-between">
      <span>{message}</span>
      <Button variant="ghost" size="sm" onClick={onClose} className="h-6 px-2">
        Close
      </Button>
    </div>
  );
});

interface SearchSectionProps {
  searchQuery: string;
  sortOption: SortOption;
  onChangeSearch: (value: string) => void;
  onSortChange: (option: SortOption) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "lastActivity", label: "更新順" },
  { value: "createdDate", label: "登録順" },
  { value: "name", label: "名前順" },
];

const SearchSection = memo(function SearchSection({
  searchQuery,
  sortOption,
  onChangeSearch,
  onSortChange,
  onRefresh,
  isLoading,
}: SearchSectionProps) {
  return (
    <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1 space-y-3">
          <label className="text-base font-medium flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Search Conversations
          </label>
          <div className="relative">
            <Input
              value={searchQuery}
              onChange={(e) => onChangeSearch(e.target.value)}
              placeholder="Search by new hire name or subject..."
              autoComplete="off"
              className="h-12 text-base bg-background border-input focus:ring-2 transition-all pl-4"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowUpDown className="h-3 w-3" />
              Sort
            </label>
            <Select value={sortOption} onValueChange={(value) => onSortChange(value as SortOption)}>
              <SelectTrigger className="w-[160px] h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground invisible">Action</label>
            <Button
              variant="outline"
              className="h-12 px-6"
              onClick={onRefresh}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Refresh"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

interface ConversationsSectionProps {
  students: MentorDashboardStudentItem[];
  selectedStudentId: string | null | undefined;
  isLoading: boolean;
}

const ConversationsSection = memo(function ConversationsSection({
  students,
  selectedStudentId,
  isLoading,
}: ConversationsSectionProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-200">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">
          Recent Conversations
        </h2>
        <Badge
          variant="outline"
          className="px-3 py-1 bg-background/50 backdrop-blur-sm"
        >
          {students.length} conversations
        </Badge>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : students.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((student, index) => (
            <MentorDashboardStudentCard
              key={student.conversationId}
              student={student}
              isSelected={selectedStudentId === student.id}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
});

const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-48 rounded-xl border bg-card/50 animate-pulse"
        />
      ))}
    </div>
  );
});

const EmptyState = memo(function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/30 px-4 py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <MessageCircle className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium">No conversations yet</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
        Assign new hires or adjust your search criteria.
      </p>
    </div>
  );
});

interface MentorDashboardStudentCardProps {
  student: MentorDashboardStudentItem;
  isSelected: boolean;
  index: number;
}

const MentorDashboardStudentCard = ({
  student,
  isSelected,
  index,
}: MentorDashboardStudentCardProps) => {
  return (
    <Link href={`/mentor/chat/${encodeURIComponent(student.conversationId)}`}>
      <Card
        className={`group relative overflow-hidden border bg-card hover:shadow-md transition-all duration-300 cursor-pointer ${
          isSelected
            ? "border-primary ring-1 ring-primary"
            : ""
        }`}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <CardContent className="p-6 flex flex-col h-full">
          {/* 상단: 아이콘과 상태 배지 */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2">
              {student.recentChat.needsReview && (
                <Badge variant="destructive" className="text-xs">
                  要確認
                </Badge>
              )}
              <Badge
                variant="secondary"
                className="bg-secondary/50 backdrop-blur-sm text-xs font-normal"
              >
                ACTIVE
              </Badge>
            </div>
          </div>

          {/* 대화 제목 */}
          <h3 className="text-lg font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {student.recentChat.subject}
          </h3>

          {/* 하단: 신입사원 이름 + 날짜 */}
          <div className="mt-auto pt-4 flex items-center justify-between border-t border-border/30">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">{student.name}</span>
            </div>
            <span className="text-xs text-muted-foreground">{student.lastActivity.toLocaleDateString()}</span>
          </div>

          {/* 호버 시 테두리 효과 */}
          <div className="absolute inset-0 pointer-events-none border-2 border-primary/0 group-hover:border-primary/10 rounded-xl transition-all duration-300" />
        </CardContent>
      </Card>
    </Link>
  );
};

