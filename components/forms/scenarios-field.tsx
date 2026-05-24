"use client";

import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StringArrayField } from "./string-array-field";
import type { Scenario } from "@/lib/agents/user-story-writer/schema";

type Props = {
  values: Scenario[];
  onChange: (next: Scenario[]) => void;
};

function emptyScenario(): Scenario {
  return { name: "", given: "", when: "", then: "", and: [] };
}

export function ScenariosField({ values, onChange }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  function updateAt(i: number, patch: Partial<Scenario>) {
    onChange(values.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function removeAt(i: number) {
    onChange(values.filter((_, idx) => idx !== i));
    if (openIdx === i) setOpenIdx(null);
  }

  function add() {
    onChange([...values, emptyScenario()]);
    setOpenIdx(values.length);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Cenários ({values.length})</Label>
        <Button type="button" size="sm" variant="ghost" onClick={add}>
          <Plus className="h-3.5 w-3.5" />
          Adicionar cenário
        </Button>
      </div>

      {values.length === 0 ? (
        <p className="rounded-md border border-dashed py-3 text-center text-xs text-muted-foreground">
          Nenhum cenário.
        </p>
      ) : (
        <ul className="space-y-2">
          {values.map((s, i) => {
            const isOpen = openIdx === i;
            return (
              <li key={i} className="rounded-md border bg-muted/20">
                <div className="flex items-start gap-2 p-2">
                  <button
                    type="button"
                    onClick={() => setOpenIdx(isOpen ? null : i)}
                    className="mt-0.5 shrink-0"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <div className="flex-1 text-sm font-medium">
                    Cenário {i + 1} — {s.name || "(sem nome)"}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeAt(i)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {isOpen ? (
                  <div className="space-y-3 border-t bg-background p-3">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Nome</Label>
                      <Input
                        value={s.name}
                        onChange={(e) => updateAt(i, { name: e.target.value })}
                        className="h-8 text-xs"
                        maxLength={200}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Dado (Given)</Label>
                      <Textarea
                        value={s.given}
                        onChange={(e) => updateAt(i, { given: e.target.value })}
                        rows={2}
                        className="text-xs"
                        maxLength={1000}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Quando (When)</Label>
                      <Textarea
                        value={s.when}
                        onChange={(e) => updateAt(i, { when: e.target.value })}
                        rows={2}
                        className="text-xs"
                        maxLength={1000}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Então (Then)</Label>
                      <Textarea
                        value={s.then}
                        onChange={(e) => updateAt(i, { then: e.target.value })}
                        rows={2}
                        className="text-xs"
                        maxLength={1000}
                      />
                    </div>
                    <StringArrayField
                      label="E (complementos)"
                      values={s.and ?? []}
                      onChange={(v) => updateAt(i, { and: v })}
                      placeholder="Complemento opcional"
                      max={10}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
