"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionItem } from "@/lib/agents/rites-scribe/schema";

type Props = {
  values: ActionItem[];
  onChange: (next: ActionItem[]) => void;
};

function emptyItem(): ActionItem {
  return { description: "", owner: "", dueDate: "" };
}

export function ActionItemsField({ values, onChange }: Props) {
  function updateAt(i: number, patch: Partial<ActionItem>) {
    onChange(values.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  function removeAt(i: number) {
    onChange(values.filter((_, idx) => idx !== i));
  }

  function add() {
    onChange([...values, emptyItem()]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Itens de ação ({values.length})</Label>
        <Button type="button" size="sm" variant="ghost" onClick={add}>
          <Plus className="h-3.5 w-3.5" />
          Adicionar ação
        </Button>
      </div>

      {values.length === 0 ? (
        <p className="rounded-md border border-dashed py-3 text-center text-xs text-muted-foreground">
          Nenhuma ação.
        </p>
      ) : (
        <ul className="space-y-2">
          {values.map((it, i) => (
            <li
              key={i}
              className="space-y-2 rounded-md border bg-muted/20 p-3"
            >
              <div className="space-y-1">
                <Label className="text-[10px]">Descrição</Label>
                <Textarea
                  value={it.description}
                  onChange={(e) => updateAt(i, { description: e.target.value })}
                  rows={2}
                  className="text-xs"
                  maxLength={500}
                />
              </div>
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">Responsável</Label>
                  <Input
                    value={it.owner}
                    onChange={(e) => updateAt(i, { owner: e.target.value })}
                    className="h-8 text-xs"
                    maxLength={120}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Prazo</Label>
                  <Input
                    value={it.dueDate}
                    onChange={(e) => updateAt(i, { dueDate: e.target.value })}
                    className="h-8 text-xs"
                    maxLength={50}
                    placeholder="Ex.: 2026-06-15 ou Próxima sprint"
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
