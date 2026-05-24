"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { experimental_useObject as useObject } from "ai/react";
import type { DeepPartial } from "ai";
import { Sparkles, StopCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  demandAnalystOutputSchema,
  type DemandAnalystOutput,
} from "@/lib/agents/demand-analyst/schema";
import type { Demand } from "@/lib/db/schema";

type Props = {
  demands: Demand[];
};

export function AnalysisRunner({ demands }: Props) {
  const router = useRouter();
  const [demandId, setDemandId] = useState<string>(demands[0]?.id ?? "");
  const [additionalContext, setAdditionalContext] = useState("");

  const { object, submit, isLoading, stop, error } = useObject({
    api: "/api/agents/demand-analyst",
    schema: demandAnalystOutputSchema,
    onFinish: () => {
      toast.success("Análise gerada e salva como rascunho");
      router.refresh();
    },
    onError: (err) => {
      toast.error(err.message || "Falha ao gerar análise");
    },
  });

  function onRun() {
    if (!demandId) {
      toast.error("Selecione uma demanda aprovada");
      return;
    }
    submit({ demandId, additionalContext: additionalContext.trim() || undefined });
  }

  if (demands.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="space-y-2 py-8 text-center text-sm text-muted-foreground">
          <p>Nenhuma demanda aprovada disponível.</p>
          <p>
            Aprove uma demanda em <strong>Demandas</strong> para liberar a
            análise.
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
          Gerar análise
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="demandId">Demanda aprovada</Label>
          <select
            id="demandId"
            value={demandId}
            onChange={(e) => setDemandId(e.target.value)}
            disabled={isLoading}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {demands.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="context">Contexto adicional (opcional)</Label>
          <Textarea
            id="context"
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            disabled={isLoading}
            placeholder="Ex.: restrições normativas, integrações disponíveis, prazo do TRF5…"
            rows={3}
            maxLength={5000}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={onRun} disabled={isLoading || !demandId}>
            <Sparkles className="h-4 w-4" />
            {isLoading ? "Gerando…" : "Gerar análise"}
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

        {object ? <StreamingPreview object={object} /> : null}
      </CardContent>
    </Card>
  );
}

function StreamingPreview({
  object,
}: {
  object: DeepPartial<DemandAnalystOutput>;
}) {
  return (
    <div className="space-y-4 rounded-md border bg-muted/30 p-4">
      <Badge variant="secondary">Pré-visualização (streaming)</Badge>

      {object.summary ? (
        <section className="space-y-1">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">
            Resumo
          </h4>
          <p className="text-sm">{object.summary}</p>
        </section>
      ) : null}

      {object.objectives?.length ? (
        <ListSection title="Objetivos" items={object.objectives} />
      ) : null}

      {object.impactedTeams?.length ? (
        <section className="space-y-1">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">
            Times impactados
          </h4>
          <div className="flex flex-wrap gap-1">
            {object.impactedTeams.map((t, i) => (
              <Badge key={i} variant="outline">
                {t}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}

      {object.assumptions?.length ? (
        <ListSection title="Premissas" items={object.assumptions} />
      ) : null}
      {object.risks?.length ? (
        <ListSection title="Riscos" items={object.risks} />
      ) : null}
      {object.openQuestions?.length ? (
        <ListSection title="Dúvidas em aberto" items={object.openQuestions} />
      ) : null}

      {object.backlogItems?.length ? (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">
            Backlog candidato ({object.backlogItems.length})
          </h4>
          <ul className="space-y-2">
            {object.backlogItems.map((item, i) => (
              <li
                key={i}
                className="rounded border bg-background p-3 text-sm"
              >
                {item?.title ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{item.type}</Badge>
                    <span className="font-medium">{item.title}</span>
                    {item.priority ? (
                      <Badge variant="secondary">{item.priority}</Badge>
                    ) : null}
                    {item.team ? <Badge>{item.team}</Badge> : null}
                    {item.estimate ? (
                      <span className="text-xs text-muted-foreground">
                        · {item.estimate}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {item?.description ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.description}
                  </p>
                ) : null}
                {item?.acceptanceCriteria?.length ? (
                  <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">
                    {item.acceptanceCriteria
                      .filter((c): c is string => Boolean(c))
                      .map((c, j) => (
                        <li key={j}>{c}</li>
                      ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
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
