"use client";

import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BACKLOG_ITEM_TYPES,
  IMPACTED_TEAMS,
  PRIORITIES,
} from "@/lib/agents/demand-analyst/schema";
import type { SprintItem } from "@/lib/agents/sprint-manager/schema";

type Props = {
  values: SprintItem[];
  onChange: (next: SprintItem[]) => void;
};

function emptyItem(): SprintItem {
  return {
    sourceAnalysisId: null,
    type: "TASK",
    title: "",
    team: "DEV",
    priority: "MEDIUM",
    estimate: "M",
    rationale: "",
  };
}

export function SprintItemsField({ values, onChange }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  function updateAt(i: number, patch: Partial<SprintItem>) {
    onChange(values.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  function removeAt(i: number) {
    onChange(values.filter((_, idx) => idx !== i));
    if (openIdx === i) setOpenIdx(null);
  }

  function add() {
    onChange([...values, emptyItem()]);
    setOpenIdx(values.length);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Itens da sprint ({values.length})</Label>
        <Button type="button" size="sm" variant="ghost" onClick={add}>
          <Plus className="h-3.5 w-3.5" />
          Adicionar item
        </Button>
      </div>

      {values.length === 0 ? (
        <p className="rounded-md border border-dashed py-3 text-center text-xs text-muted-foreground">
          Nenhum item.
        </p>
      ) : (
        <ul className="space-y-2">
          {values.map((item, i) => {
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
                    <span className="font-mono text-[10px] text-muted-foreground">
                      [{item.type}]
                    </span>{" "}
                    <span className="font-medium">{item.title || "(sem título)"}</span>
                    <span className="ml-2 text-[10px] text-muted-foreground">
                      {item.team} · {item.priority} · {item.estimate}
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
                    <div className="grid grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Tipo</Label>
                        <select
                          value={item.type}
                          onChange={(e) =>
                            updateAt(i, { type: e.target.value as SprintItem["type"] })
                          }
                          className="h-8 w-full rounded-md border bg-transparent px-2 text-xs"
                        >
                          {BACKLOG_ITEM_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Time</Label>
                        <select
                          value={item.team}
                          onChange={(e) =>
                            updateAt(i, { team: e.target.value as SprintItem["team"] })
                          }
                          className="h-8 w-full rounded-md border bg-transparent px-2 text-xs"
                        >
                          {IMPACTED_TEAMS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Prioridade</Label>
                        <select
                          value={item.priority}
                          onChange={(e) =>
                            updateAt(i, {
                              priority: e.target.value as SprintItem["priority"],
                            })
                          }
                          className="h-8 w-full rounded-md border bg-transparent px-2 text-xs"
                        >
                          {PRIORITIES.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Estimativa</Label>
                        <Input
                          value={item.estimate}
                          onChange={(e) => updateAt(i, { estimate: e.target.value })}
                          className="h-8 text-xs"
                          maxLength={40}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Título</Label>
                      <Input
                        value={item.title}
                        onChange={(e) => updateAt(i, { title: e.target.value })}
                        className="h-8 text-xs"
                        maxLength={200}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">
                        Racional (por que entra nesta sprint)
                      </Label>
                      <Textarea
                        value={item.rationale}
                        onChange={(e) => updateAt(i, { rationale: e.target.value })}
                        rows={2}
                        className="text-xs"
                        maxLength={800}
                      />
                    </div>
                    {item.sourceAnalysisId ? (
                      <p className="text-[10px] text-muted-foreground">
                        Origem: análise{" "}
                        <span className="font-mono">
                          {item.sourceAnalysisId.slice(0, 8)}
                        </span>
                      </p>
                    ) : null}
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
