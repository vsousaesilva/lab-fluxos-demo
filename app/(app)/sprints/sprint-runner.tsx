"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { experimental_useObject as useObject } from "ai/react";
import type { DeepPartial } from "ai";
import { Sparkles, StopCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  sprintManagerOutputSchema,
  type SprintManagerOutput,
} from "@/lib/agents/sprint-manager/schema";
import type { DemandAnalysis } from "@/lib/db/schema";

type Props = {
  analyses: DemandAnalysis[];
  demandTitleById: Record<string, string>;
};

export function SprintRunner({ analyses, demandTitleById }: Props) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(analyses.map((a) => a.id))
  );
  const [weeks, setWeeks] = useState<number>(2);
  const [capacityDescription, setCapacityDescription] = useState("");
  const [goalHint, setGoalHint] = useState("");

  const totalItems = useMemo(() => {
    let n = 0;
    for (const a of analyses) {
      if (selectedIds.has(a.id)) n += a.backlogItems.length;
    }
    return n;
  }, [analyses, selectedIds]);

  const { object, submit, isLoading, stop, error } = useObject({
    api: "/api/agents/sprint-manager",
    schema: sprintManagerOutputSchema,
    onFinish: () => {
      toast.success("Sprint proposta e salva");
      router.refresh();
    },
    onError: (err) => {
      toast.error(err.message || "Falha ao gerar sprint");
    },
  });

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onRun() {
    if (selectedIds.size === 0) {
      toast.error("Selecione pelo menos uma análise aprovada");
      return;
    }
    submit({
      analysisIds: Array.from(selectedIds),
      weeks,
      capacityDescription: capacityDescription.trim() || undefined,
      goalHint: goalHint.trim() || undefined,
    });
  }

  if (analyses.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="space-y-2 py-8 text-center text-sm text-muted-foreground">
          <p>Nenhuma análise aprovada disponível.</p>
          <p>
            Aprove análises em <strong>Análise de Demanda</strong> para liberar
            o planejamento de sprints.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Propor sprint
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Análises aprovadas no escopo ({selectedIds.size} selecionada{selectedIds.size === 1 ? "" : "s"} · {totalItems} item{totalItems === 1 ? "" : "s"})</Label>
          <ul className="space-y-1 rounded-md border p-2 max-h-48 overflow-auto">
            {analyses.map((a) => {
              const checked = selectedIds.has(a.id);
              return (
                <li key={a.id}>
                  <label className="flex items-start gap-2 rounded p-2 hover:bg-muted/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(a.id)}
                      disabled={isLoading}
                      className="mt-1"
                    />
                    <div className="flex-1 text-sm">
                      <div className="font-medium">
                        {demandTitleById[a.demandId] ?? `Análise ${a.id.slice(0, 8)}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {a.backlogItems.length} item(ns) ·{" "}
                        {a.impactedTeams.join(", ")}
                      </div>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-1">
            <Label htmlFor="weeks">Duração (semanas)</Label>
            <Input
              id="weeks"
              type="number"
              min={1}
              max={8}
              value={weeks}
              onChange={(e) => setWeeks(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="goalHint">Indicação de objetivo (opcional)</Label>
            <Input
              id="goalHint"
              value={goalHint}
              onChange={(e) => setGoalHint(e.target.value)}
              disabled={isLoading}
              placeholder="Ex.: estabilizar o fluxo de RPV"
              maxLength={500}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="capacity">Descrição da capacidade (opcional)</Label>
          <Textarea
            id="capacity"
            value={capacityDescription}
            onChange={(e) => setCapacityDescription(e.target.value)}
            disabled={isLoading}
            placeholder="Ex.: 2 desenvolvedores em tempo integral, 1 QA em meio período…"
            rows={3}
            maxLength={2000}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={onRun} disabled={isLoading || selectedIds.size === 0}>
            <Sparkles className="h-4 w-4" />
            {isLoading ? "Planejando…" : "Propor sprint"}
          </Button>
          {isLoading ? (
            <Button variant="outline" onClick={() => stop()}>
              <StopCircle className="h-4 w-4" />
              Parar
            </Button>
          ) : null}
        </div>

        {error ? (
          <p className="text-sm text-destructive">{error.message}</p>
        ) : null}

        {object ? <SprintStreamingPreview object={object} /> : null}
      </CardContent>
    </Card>
  );
}

function SprintStreamingPreview({
  object,
}: {
  object: DeepPartial<SprintManagerOutput>;
}) {
  return (
    <div className="space-y-4 rounded-md border bg-muted/30 p-4">
      <Badge variant="secondary">Pré-visualização (streaming)</Badge>

      {object.name ? (
        <h3 className="text-base font-medium">{object.name}</h3>
      ) : null}

      {object.goal ? (
        <section className="rounded border bg-background p-3 text-sm">
          <p>
            <strong>Sprint Goal:</strong> {object.goal}
          </p>
        </section>
      ) : null}

      {object.capacityNotes ? (
        <section className="space-y-1">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">
            Capacidade x escopo
          </h4>
          <p className="text-sm">{object.capacityNotes}</p>
        </section>
      ) : null}

      {object.items?.length ? (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">
            Itens selecionados ({object.items.length})
          </h4>
          <ul className="space-y-2">
            {object.items.map((it, i) => (
              <li key={i} className="rounded border bg-background p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {it?.type ? <Badge variant="outline">{it.type}</Badge> : null}
                  {it?.title ? (
                    <span className="font-medium">{it.title}</span>
                  ) : null}
                  {it?.priority ? (
                    <Badge variant="secondary">{it.priority}</Badge>
                  ) : null}
                  {it?.team ? <Badge>{it.team}</Badge> : null}
                  {it?.estimate ? (
                    <span className="text-xs text-muted-foreground">
                      · {it.estimate}
                    </span>
                  ) : null}
                </div>
                {it?.rationale ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {it.rationale}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {object.outOfScope?.length ? (
        <ListSection title="Fora do escopo" items={object.outOfScope} />
      ) : null}
      {object.risks?.length ? (
        <ListSection title="Riscos" items={object.risks} />
      ) : null}
      {object.definitionOfDone?.length ? (
        <ListSection title="Definition of Done" items={object.definitionOfDone} />
      ) : null}
    </div>
  );
}

function ListSection({
  title,
  items,
}: {
  title: string;
  items: Array<string | undefined>;
}) {
  return (
    <section className="space-y-1">
      <h4 className="text-xs font-semibold uppercase text-muted-foreground">
        {title}
      </h4>
      <ul className="list-disc space-y-0.5 pl-5 text-sm">
        {items
          .filter((s): s is string => Boolean(s))
          .map((s, i) => (
            <li key={i}>{s}</li>
          ))}
      </ul>
    </section>
  );
}
