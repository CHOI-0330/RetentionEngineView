/**
 * ChatComposerLegacy コンポーネント
 *
 * レガシースタイルのメッセージ入力フォーム
 */

import { memo, useState } from "react";
import { Loader2, FileText, Globe, Settings2, ChevronDown } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import type { SearchSettings } from "../../interfaceAdapters/gateways/api/types";

interface ChatComposerLegacyProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  canSend: boolean;
  isSending: boolean;
  searchSettings?: SearchSettings;
  onSearchSettingsChange?: (settings: Partial<SearchSettings>) => void;
}

export const ChatComposerLegacy = memo(function ChatComposerLegacy({
  value,
  onChange,
  onSend,
  canSend,
  isSending,
  searchSettings,
  onSearchSettingsChange,
}: ChatComposerLegacyProps) {
  const [isComposing, setIsComposing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleSend = () => {
    if (canSend && !isSending && value.trim()) {
      onSend();
    }
  };

  return (
    <div className="border-t bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-3xl">
        {/* 検索設定トグルバー */}
        {searchSettings && onSearchSettingsChange && (
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* FileSearch トグル */}
              <button
                type="button"
                onClick={() =>
                  onSearchSettingsChange({
                    enableFileSearch: !searchSettings.enableFileSearch,
                  })
                }
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  searchSettings.enableFileSearch
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <FileText className="h-3 w-3" />
                社内検索
                {searchSettings.enableFileSearch ? " ON" : " OFF"}
              </button>

              {/* WebSearch トグル */}
              <button
                type="button"
                onClick={() =>
                  onSearchSettingsChange({
                    allowWebSearch: !searchSettings.allowWebSearch,
                  })
                }
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  searchSettings.allowWebSearch
                    ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <Globe className="h-3 w-3" />
                ウェブ検索
                {searchSettings.allowWebSearch ? " 許可" : " OFF"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted transition-colors"
            >
              <Settings2 className="h-3 w-3" />
              <ChevronDown
                className={`h-3 w-3 transition-transform ${
                  showSettings ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        )}

        {/* 検索設定説明 (折りたたみ領域) */}
        {showSettings && searchSettings && (
          <div className="mb-3 rounded-lg border bg-muted/30 p-3 text-[11px] text-muted-foreground">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <FileText className="h-3.5 w-3.5 mt-0.5 text-emerald-600" />
                <div>
                  <span className="font-medium text-foreground">社内検索:</span>{" "}
                  アップロードされた社内ドキュメントから回答を検索します。
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Globe className="h-3.5 w-3.5 mt-0.5 text-blue-600" />
                <div>
                  <span className="font-medium text-foreground">
                    ウェブ検索:
                  </span>{" "}
                  社内ドキュメントで回答が見つからない場合、ウェブ検索を許可します（確認あり）。
                </div>
              </div>
            </div>
          </div>
        )}

        <form
          className="relative flex items-end gap-2 rounded-xl border bg-background p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onKeyDown={(e) => {
              const isEnter = e.key === "Enter";
              const modifierPressed = e.metaKey || e.ctrlKey;
              if (isComposing || e.nativeEvent.isComposing) return;

              if (isEnter && modifierPressed) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="メッセージを入力..."
            className="min-h-[44px] w-full resize-none border-none bg-transparent px-3 py-2.5 text-sm focus-visible:ring-0"
            rows={1}
            style={{ height: "auto", maxHeight: "200px" }}
            disabled={isSending}
          />
          <Button
            type="submit"
            disabled={!canSend || !value.trim()}
            size="icon"
            className="h-9 w-9 shrink-0 rounded-lg mb-0.5 mr-0.5"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            )}
            <span className="sr-only">送信</span>
          </Button>
        </form>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          ⌘+Enter / Ctrl+Enterで送信・Shift+Enterで改行
        </p>

        <p className="mt-1 text-center text-[10px] text-muted-foreground">
          AIは不正確な情報を生成する可能性があります。重要な情報は確認してください。
        </p>
      </div>
    </div>
  );
});
