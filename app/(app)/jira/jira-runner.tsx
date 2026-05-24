"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { DemandAnalysis, Sprint } from "@/lib/db/schema";

type Props = {
  analyses: DemandAnalysis[];
  sprints: Sprint[];
  analysisTitleById: Record<string, string>;
};

export function JiraRunner({ analyses, sprints, analysisTitleById }: Props) {
  const router = useRouter();
  const [analysisId, setAnalysisId] = useState<string>(analyses[0]?.id ?? "");
  const [sprintId, setSprintId] = useState<string>(sprints[0]?.id ?? "");
  const [pending, setPending] = useState<"analysis" | "sprint" | null>(null);

  async function sync(source: "analysis" | "sprint") {
    const id = source === "analysis" ? analysisId : sprintId;
    if (!id) {
      toast.error(
        source === "analysis"
          ? "Selecione uma análise aprovada"
          : "Selecione uma sprint aprovada"
      );
      return;
    }
    setPending(source);
    try {
      const res = await fetch("/api/agents/jira-synchronizer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source, id }),
      });
      const data = (await res.json()) as
        | {
            ok: true;
            outcome: {
              cardsTotal: number;
              synced: number;
              failed: number;
              skipped: number;
            };
          }
        | { error: string };
      if (!res.ok || "error" in data) {
        throw new Error(
          ("error" in data && data.error) || `HTTP ${res.status}`
        );
      }
      const o = data.outcome;
      toast.success(
        `${o.cardsTotal} card(s): ${o.synced} sincronizado(s), ${o.failed} falha(s)`
      );
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha";
      toast.error(message);
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Send className="h-4 w-4 text-primary" />
          Sincronizar com o Jira
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 rounded-md border p-3">
            <Label htmlFor="analysisId" className="text-sm font-medium">
              Análise aprovada
            </Label>
            <p className="text-[10px] text-muted-foreground">
              Cada item do backlog vira um card no Jira (Epic / Story / Task / Bug).
            </p>
            <select
              id="analysisId"
              value={analysisId}
              onChange={(e) => setAnalysisId(e.target.value)}
              disabled={pending !== null || analyses.length === 0}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {analyses.length === 0 ? (
                <option value="">— nenhuma análise aprovada —</option>
              ) : (
                analyses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {analysisTitleById[a.demandId] ?? `Análise ${a.id.slice(0, 8)}`}
                    {" "}
                    ({a.backlogItems.length} item{a.backlogItems.length === 1 ? "" : "s"})
                  </option>
                ))
              )}
            </select>
            <Button
              size="sm"
              onClick={() => sync("analysis")}
              disabled={
                pending !== null || analyses.length === 0 || !analysisId
              }
            >
              <Send className="h-4 w-4" />
              {pending === "analysis" ? "Enviando…" : "Sincronizar análise"}
            </Button>
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <Label htmlFor="sprintId" className="text-sm font-medium">
              Sprint aprovada
            </Label>
            <p className="text-[10px] text-muted-foreground">
              Cada item da sprint vira um card. Itens já enviados não são duplicados.
            </p>
            <select
              id="sprintId"
              value={sprintId}
              onChange={(e) => setSprintId(e.target.value)}
              disabled={pending !== null || sprints.length === 0}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sprints.length === 0 ? (
                <option value="">— nenhuma sprint aprovada —</option>
              ) : (
                sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.items.length} item{s.items.length === 1 ? "" : "s"})
                  </option>
                ))
              )}
            </select>
            <Button
              size="sm"
              onClick={() => sync("sprint")}
              disabled={pending !== null || sprints.length === 0 || !sprintId}
            >
              <Send className="h-4 w-4" />
              {pending === "sprint" ? "Enviando…" : "Sincronizar sprint"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
