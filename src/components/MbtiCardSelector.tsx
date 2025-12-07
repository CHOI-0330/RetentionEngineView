import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  MBTI_CATEGORIES,
  MBTI_CATEGORY_COLORS,
  MBTI_CATEGORY_LABELS,
  MBTI_DESCRIPTIONS,
  MBTI_LABELS,
  type MbtiCategory,
  type MbtiType,
} from "../domain/mbti.types";
import { cn } from "./ui/utils";
import { Check } from "lucide-react";

interface MbtiCardSelectorProps {
  value: MbtiType | null;
  onChange: (value: MbtiType | null) => void;
  disabled?: boolean;
  className?: string;
}

export function MbtiCardSelector({
  value,
  onChange,
  disabled = false,
  className = "",
}: MbtiCardSelectorProps) {
  // 現在選択されたMBTIが属するカテゴリを見つけるか、デフォルトで最初のカテゴリを使用
  const defaultCategory =
    (Object.keys(MBTI_CATEGORIES) as MbtiCategory[]).find((cat) =>
      MBTI_CATEGORIES[cat].includes(value as MbtiType)
    ) || "analysts";

  return (
    <div className={cn("w-full", className)}>
      <Tabs defaultValue={defaultCategory} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto p-1 mb-6">
          {(Object.keys(MBTI_CATEGORIES) as MbtiCategory[]).map((category) => (
            <TabsTrigger
              key={category}
              value={category}
              className="py-2 px-1 text-xs sm:text-sm md:text-base data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all whitespace-normal h-auto min-h-[3rem]"
            >
              {MBTI_CATEGORY_LABELS[category]}
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.entries(MBTI_CATEGORIES) as [MbtiCategory, MbtiType[]][]).map(
          ([category, types]) => (
            <TabsContent
              key={category}
              value={category}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
              {types.map((mbtiType) => {
                const isSelected = value === mbtiType;
                const colorClass = MBTI_CATEGORY_COLORS[category];

                return (
                  <button
                    key={mbtiType}
                    type="button"
                    onClick={() => onChange(isSelected ? null : mbtiType)}
                    disabled={disabled}
                    className={cn(
                      "relative flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all duration-200",
                      "hover:shadow-md hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      isSelected
                        ? cn(
                            "border-primary bg-primary/5 shadow-md",
                            colorClass.split(" ")[0]
                          ) // 選択時にテキスト色を適用
                        : "border-muted bg-card hover:border-primary/50 text-muted-foreground",
                      disabled &&
                        "opacity-50 cursor-not-allowed hover:transform-none hover:shadow-none"
                    )}
                  >
                    <div className="flex justify-between w-full mb-2">
                      <div className="flex flex-col">
                        <span className="text-2xl font-bold tracking-wider font-mono">
                          {mbtiType}
                        </span>
                        <span className="text-sm font-medium opacity-90">
                          {MBTI_LABELS[mbtiType]}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="bg-primary text-primary-foreground rounded-full p-1 h-fit">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm leading-relaxed opacity-80">
                      {MBTI_DESCRIPTIONS[mbtiType]}
                    </p>
                  </button>
                );
              })}
            </TabsContent>
          )
        )}
      </Tabs>
    </div>
  );
}
