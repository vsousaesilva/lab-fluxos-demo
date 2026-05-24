"use client";

import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StringArrayField } from "./string-array-field";
import type { CeremonySection } from "@/lib/agents/rites-scribe/schema";

type Props = {
  values: CeremonySection[];
  onChange: (next: CeremonySection[]) => void;
};

function emptySection(): CeremonySection {
  return { title: "", items: [] };
}

export function CeremonySectionsField({ values, onChange }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  function updateAt(i: number, patch: Partial<CeremonySection>) {
    onChange(values.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function removeAt(i: number) {
    onChange(values.filter((_, idx) => idx !== i));
    if (openIdx === i) setOpenIdx(null);
  }

  function add() {
    onChange([...values, emptySection()]);
    setOpenIdx(values.length);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Seções ({values.length})</Label>
        <Button type="button" size="sm" variant="ghost" onClick={add}>
          <Plus className="h-3.5 w-3.5" />
          Adicionar seção
        </Button>
      </div>

      {values.length === 0 ? (
        <p className="rounded-md border border-dashed py-3 text-center text-xs text-muted-foreground">
          Nenhuma seção.
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
                  <div className="flex-1 text-sm">
                    <span className="font-medium">{s.title || "(sem título)"}</span>
                    <span className="ml-2 text-[10px] text-muted-foreground">
                      {s.items.length} item(ns)
                    </span>
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
                      <Label className="text-[10px]">Título da seção</Label>
                      <Input
                        value={s.title}
                        onChange={(e) => updateAt(i, { title: e.target.value })}
                        className="h-8 text-xs"
                        maxLength={120}
                      />
                    </div>
                    <StringArrayField
                      label="Itens"
                      values={s.items}
                      onChange={(v) => updateAt(i, { items: v })}
                      max={30}
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
