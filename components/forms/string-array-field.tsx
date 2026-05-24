"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  max?: number;
  multiline?: boolean;
  helperText?: string;
};

/**
 * Editor de array de strings (adicionar / remover / editar item).
 * Usado em campos como `objectives[]`, `risks[]`, `participants[]`, etc.
 */
export function StringArrayField({
  label,
  values,
  onChange,
  placeholder,
  max = 30,
  helperText,
}: Props) {
  function updateAt(i: number, v: string) {
    const next = [...values];
    next[i] = v;
    onChange(next);
  }

  function removeAt(i: number) {
    onChange(values.filter((_, idx) => idx !== i));
  }

  function add() {
    if (values.length >= max) return;
    onChange([...values, ""]);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={add}
          disabled={values.length >= max}
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </Button>
      </div>
      {helperText ? (
        <p className="text-[10px] text-muted-foreground">{helperText}</p>
      ) : null}
      {values.length === 0 ? (
        <p className="rounded-md border border-dashed py-3 text-center text-xs text-muted-foreground">
          Nenhum item — clique em &quot;Adicionar&quot;.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {values.map((v, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 w-5 shrink-0 text-right text-[10px] text-muted-foreground">
                {i + 1}.
              </span>
              <Input
                value={v}
                onChange={(e) => updateAt(i, e.target.value)}
                placeholder={placeholder}
                className="flex-1"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeAt(i)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
