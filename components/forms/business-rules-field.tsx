"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BusinessRule } from "@/lib/agents/user-story-writer/schema";

type Props = {
  values: BusinessRule[];
  onChange: (next: BusinessRule[]) => void;
};

function nextRuleCode(values: BusinessRule[]): string {
  const max = values.reduce((acc, r) => {
    const m = r.code.match(/^RN(\d+)$/);
    const n = m ? parseInt(m[1], 10) : 0;
    return Math.max(acc, n);
  }, 0);
  return `RN${String(max + 1).padStart(2, "0")}`;
}

export function BusinessRulesField({ values, onChange }: Props) {
  function updateAt(i: number, patch: Partial<BusinessRule>) {
    onChange(values.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function removeAt(i: number) {
    onChange(values.filter((_, idx) => idx !== i));
  }

  function add() {
    onChange([
      ...values,
      { code: nextRuleCode(values), title: "", description: "" },
    ]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Regras de negócio ({values.length})</Label>
        <Button type="button" size="sm" variant="ghost" onClick={add}>
          <Plus className="h-3.5 w-3.5" />
          Adicionar regra
        </Button>
      </div>

      {values.length === 0 ? (
        <p className="rounded-md border border-dashed py-3 text-center text-xs text-muted-foreground">
          Nenhuma regra de negócio.
        </p>
      ) : (
        <ul className="space-y-2">
          {values.map((r, i) => (
            <li key={i} className="space-y-2 rounded-md border bg-muted/20 p-3">
              <div className="grid grid-cols-[100px_1fr_auto] gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">Código</Label>
                  <Input
                    value={r.code}
                    onChange={(e) => updateAt(i, { code: e.target.value.toUpperCase() })}
                    className="h-8 font-mono text-xs"
                    placeholder="RN01"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Título</Label>
                  <Input
                    value={r.title}
                    onChange={(e) => updateAt(i, { title: e.target.value })}
                    className="h-8 text-xs"
                    maxLength={200}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeAt(i)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Descrição</Label>
                <Textarea
                  value={r.description}
                  onChange={(e) => updateAt(i, { description: e.target.value })}
                  rows={2}
                  className="text-xs"
                  maxLength={2000}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
