"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props<T extends string> = {
  label: string;
  options: readonly T[];
  value: T[];
  onChange: (next: T[]) => void;
  helperText?: string;
};

/**
 * Multi-select via pílulas toggláveis. Usado em campos de enum array
 * como `impactedTeams[]`.
 */
export function MultiSelectField<T extends string>({
  label,
  options,
  value,
  onChange,
  helperText,
}: Props<T>) {
  function toggle(opt: T) {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {helperText ? (
        <p className="text-[10px] text-muted-foreground">{helperText}</p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = value.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
