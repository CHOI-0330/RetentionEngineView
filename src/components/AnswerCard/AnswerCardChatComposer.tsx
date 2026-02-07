"use client";

import { memo, useState, useCallback } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

interface AnswerCardChatComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
}

export const AnswerCardChatComposer = memo(
  function AnswerCardChatComposer({
    onSend,
    disabled = false,
    isStreaming = false,
  }: AnswerCardChatComposerProps) {
    const [value, setValue] = useState("");

    const handleSend = useCallback(() => {
      const trimmed = value.trim();
      if (!trimmed || disabled || isStreaming) return;
      onSend(trimmed);
      setValue("");
    }, [value, disabled, isStreaming, onSend]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          handleSend();
        }
      },
      [handleSend],
    );

    return (
      <div className="flex flex-col gap-2 border-t bg-background p-4 pb-6">
        <div className="flex gap-2">
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="質問への回答を入力してください。AIが専門用語をわかりやすく説明します..."
            className="min-h-[44px] max-h-[120px] resize-none text-sm"
            disabled={disabled || isStreaming}
            rows={2}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={disabled || isStreaming || !value.trim()}
            className="shrink-0 self-end bg-green-600 hover:bg-green-700"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          ⌘+Enter で送信 / Shift+Enter で改行
        </p>
      </div>
    );
  },
);
