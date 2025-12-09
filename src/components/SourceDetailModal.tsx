import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { FileText, MapPin } from "lucide-react";
import type { FileSearchSource } from "../domain/core";

interface SourceDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: FileSearchSource | null;
}

export function SourceDetailModal({
  open,
  onOpenChange,
  source,
}: SourceDetailModalProps) {
  if (!source) return null;

  const formatPageRange = (
    pageStart?: number,
    pageEnd?: number
  ): string | null => {
    if (pageStart === undefined) return null;
    if (pageEnd === undefined || pageEnd === pageStart) {
      return `페이지: ${pageStart}`;
    }
    return `페이지: ${pageStart}-${pageEnd}`;
  };

  const getConfidenceBadge = (confidence?: number) => {
    if (confidence === undefined) return null;

    const percentage = Math.round(confidence * 100);
    let variant: "default" | "secondary" | "destructive" = "default";

    if (percentage >= 80) {
      variant = "default";
    } else if (percentage >= 60) {
      variant = "secondary";
    } else {
      variant = "destructive";
    }

    return (
      <Badge variant={variant} className="text-xs">
        신뢰도: {percentage}%
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <span className="truncate">{source.fileName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 py-4">
            {/* Chunk Count */}
            <div className="text-sm text-muted-foreground mb-4">
              참조된 내용 ({source.chunks.length}개 섹션)
            </div>

            {/* Empty State */}
            {source.chunks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mb-3 opacity-50" />
                <p>참조된 내용이 없습니다</p>
              </div>
            ) : (
              /* Chunks List */
              <div className="space-y-4">
                {source.chunks.map((chunk, index) => {
                  const pageRange = formatPageRange(
                    chunk.pageStart,
                    chunk.pageEnd
                  );

                  return (
                    <div
                      key={chunk.chunkId || index}
                      className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
                    >
                      {/* Section Header */}
                      <div className="flex items-start justify-between mb-3 gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium text-sm">
                            섹션 {index + 1}
                          </span>
                          {pageRange && (
                            <span className="text-sm text-muted-foreground">
                              {pageRange}
                            </span>
                          )}
                        </div>
                        {getConfidenceBadge(chunk.confidence)}
                      </div>

                      {/* Divider */}
                      <div className="border-t my-3" />

                      {/* Chunk Text */}
                      <blockquote className="text-sm leading-relaxed text-foreground/90 pl-4 border-l-2 border-blue-500/50 italic whitespace-pre-wrap">
                        "{chunk.text}"
                      </blockquote>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
