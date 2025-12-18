/**
 * Dev Preview Page
 *
 * 개발 환경에서만 접근 가능한 컴포넌트 미리보기 페이지
 * 인증 없이 UI 컴포넌트를 테스트할 수 있음
 *
 * URL: /dev/preview?component=personality-preset
 */

"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import PersonalityPresetSelector from "../../../src/views/PersonalityPresetSelector";
import type { PersonalityPresetViewModel } from "../../../src/interfaceAdapters/services/PersonalityPresetService";

// 환경 체크 - 개발 환경에서만 허용
const isDev = process.env.NODE_ENV === "development";

// Mock 데이터
const MOCK_PERSONALITY_PRESETS: PersonalityPresetViewModel = {
  presets: [
    {
      id: "default_assistant",
      displayName: "標準アシスタント",
      description: "落ち着いた丁寧な口調で、質問に対してバランスよく回答する標準モード。",
      sampleDialogue: "ご質問ありがとうございます。こちらについてご説明いたします。",
      isSelected: false,
    },
    {
      id: "gentle_mentor",
      displayName: "やさしいメンター",
      description: "初心者や不慣れな人向けに、できるだけ噛み砕いて説明し、背中を押してくれるメンター。",
      sampleDialogue: "大丈夫ですよ！一緒にゆっくり確認していきましょうね。",
      isSelected: true,
    },
    {
      id: "strict_reviewer",
      displayName: "厳しめレビューア",
      description: "アウトプットに対して率直に改善点を指摘するレビュー担当。甘やかさずに質を上げたいとき用。",
      sampleDialogue: "ここは改善の余地がありますね。具体的に指摘させていただきます。",
      isSelected: false,
    },
    {
      id: "idea_partner",
      displayName: "アイデア出しパートナー",
      description: "アイデアを広げたいときに、一緒に発想してくれるモード。発散思考寄り。",
      sampleDialogue: "いいですね！こんなアイデアはどうでしょう？もっと広げてみましょう！",
      isSelected: false,
    },
  ],
  currentPresetId: "gentle_mentor",
  currentPresetName: "やさしいメンター",
  hasSelection: true,
  isDefault: false,
};

// 컴포넌트 레지스트리
const COMPONENTS: Record<string, React.ReactNode> = {
  "personality-preset": (
    <PersonalityPresetSelector
      viewModel={MOCK_PERSONALITY_PRESETS}
      onSelectPreset={(id) => console.log("Selected:", id)}
      onResetToDefault={() => console.log("Reset to default")}
      onDismissError={() => console.log("Dismiss error")}
      isLoading={false}
      isSaving={false}
      error={null}
    />
  ),
  "personality-preset-loading": (
    <PersonalityPresetSelector
      viewModel={MOCK_PERSONALITY_PRESETS}
      onSelectPreset={() => {}}
      onResetToDefault={() => {}}
      isLoading={true}
      isSaving={false}
      error={null}
    />
  ),
  "personality-preset-error": (
    <PersonalityPresetSelector
      viewModel={MOCK_PERSONALITY_PRESETS}
      onSelectPreset={() => {}}
      onResetToDefault={() => {}}
      onDismissError={() => console.log("Dismiss error")}
      isLoading={false}
      isSaving={false}
      error="プリセットの読み込みに失敗しました。再度お試しください。"
    />
  ),
  "personality-preset-saving": (
    <PersonalityPresetSelector
      viewModel={MOCK_PERSONALITY_PRESETS}
      onSelectPreset={() => {}}
      onResetToDefault={() => {}}
      isLoading={false}
      isSaving={true}
      error={null}
    />
  ),
};

function PreviewContent() {
  const searchParams = useSearchParams();
  const componentName = searchParams.get("component");

  if (!isDev) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-destructive/10">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="text-muted-foreground mt-2">
            This page is only available in development mode.
          </p>
        </div>
      </div>
    );
  }

  if (!componentName) {
    return (
      <div className="min-h-screen p-8 bg-background">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Component Preview</h1>
          <p className="text-muted-foreground mb-8">
            인증 없이 UI 컴포넌트를 테스트할 수 있는 개발용 페이지입니다.
          </p>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Available Components</h2>
            <div className="grid gap-3">
              {Object.keys(COMPONENTS).map((name) => (
                <a
                  key={name}
                  href={`/dev/preview?component=${name}`}
                  className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <span className="font-mono text-sm">{name}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="mt-8 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Usage</h3>
            <code className="text-sm">
              /dev/preview?component=personality-preset
            </code>
          </div>
        </div>
      </div>
    );
  }

  const component = COMPONENTS[componentName];

  if (!component) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Component Not Found</h1>
          <p className="text-muted-foreground mt-2">
            &quot;{componentName}&quot; is not registered.
          </p>
          <a href="/dev/preview" className="text-primary underline mt-4 block">
            View available components
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-muted/30 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground">Preview:</span>
            <h1 className="font-mono font-semibold">{componentName}</h1>
          </div>
          <a
            href="/dev/preview"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to list
          </a>
        </div>
      </div>

      {/* Component */}
      <div className="p-8">
        <div className="max-w-2xl mx-auto">{component}</div>
      </div>

      {/* Debug Info */}
      <div className="fixed bottom-4 right-4 p-2 bg-black/80 text-white text-xs rounded font-mono">
        DEV MODE | {componentName}
      </div>
    </div>
  );
}

export default function DevPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p>Loading...</p>
        </div>
      }
    >
      <PreviewContent />
    </Suspense>
  );
}
