import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";
import { MBTI_TYPES, MBTI_LABELS, type MbtiType } from "../domain/mbti.types";

interface MbtiSelectorProps {
  value: MbtiType | null;
  onChange: (value: MbtiType | null) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

/**
 * MBTI選択コンポーネント
 * 16種類のMBTIタイプをドロップダウンで選択できます。
 */
export function MbtiSelector({
  value,
  onChange,
  disabled = false,
  label = "MBTI性格タイプ",
  placeholder = "MBTIタイプを選択してください",
  required = false,
  className = "",
}: MbtiSelectorProps) {
  const handleValueChange = (selectedValue: string) => {
    if (selectedValue === "none") {
      onChange(null);
    } else {
      onChange(selectedValue as MbtiType);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label htmlFor="mbti-selector">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Select
        value={value ?? "none"}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger id="mbti-selector" className="h-11">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">選択しない</SelectItem>
          {MBTI_TYPES.map((mbtiType) => (
            <SelectItem key={mbtiType} value={mbtiType}>
              {mbtiType} - {MBTI_LABELS[mbtiType]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
