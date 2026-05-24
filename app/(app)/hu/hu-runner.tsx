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
  userStoryWriterOutputSchema,
  type UserStoryWriterOutput,
} from "@/lib/agents/user-story-writer/schema";
import type { Demand } from "@/lib/db/schema";

type Props = {
  demands: Demand[];
};

export function HuRunner({ demands }: Props) {
  const router = useRouter();
  const [demandId, setDemandId] = useState<string>(demands[0]?.id ?? "");
  const [additionalContext, setAdditionalContext] = useState("");

  const { object, submit, isLoading, stop, error } = useObject({
    api: "/api/agents/user-story-writer",
    schema: userStoryWriterOutputSchema,
    onFinish: () => {
      toast.success("HU gerada e salva como rascunho");
      router.refresh();
    },
    onError: (err) => {
      toast.error(err.message || "Falha ao gerar HU");
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
            Aprove uma demanda em <strong>Demandas</strong> para gerar HU.
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
          Gerar História de Usuário
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
            placeholder="Ex.: critérios de aceite específicos, integrações, restrições…"
            rows={3}
            maxLength={5000}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={onRun} disabled={isLoading || !demandId}>
            <Sparkles className="h-4 w-4" />
            {isLoading ? "Gerando…" : "Gerar HU"}
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

        {object ? <HuStreamingPreview object={object} /> : null}
      </CardContent>
    </Card>
  );
}

function HuStreamingPreview({
  object,
}: {
  object: DeepPartial<UserStoryWriterOutput>;
}) {
  return (
    <div className="space-y-4 rounded-md border bg-muted/30 p-4">
      <Badge variant="secondary">Pré-visualização (streaming)</Badge>

      {object.title ? (
        <h3 className="text-base font-medium leading-snug">{object.title}</h3>
      ) : null}

      {(object.asA || object.iWant || object.soThat) ? (
        <section className="space-y-1 rounded border bg-background p-3 text-sm">
          {object.asA ? (
            <p>
              <strong>Como</strong> {object.asA}
            </p>
          ) : null}
          {object.iWant ? (
            <p>
              <strong>Quero</strong> {object.iWant}
            </p>
          ) : null}
          {object.soThat ? (
            <p>
              <strong>Para</strong> {object.soThat}
            </p>
          ) : null}
        </section>
      ) : null}

      {object.scenarios?.length ? (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">
            Cenários ({object.scenarios.length})
          </h4>
          <ul className="space-y-2">
            {object.scenarios.map((s, i) => (
              <li key={i} className="rounded border bg-background p-3 text-sm">
                {s?.name ? <p className="font-medium">{s.name}</p> : null}
                {s?.given ? (
                  <p className="mt-1">
                    <strong>Dado</strong> {s.given}
                  </p>
                ) : null}
                {s?.when ? (
                  <p>
                    <strong>Quando</strong> {s.when}
                  </p>
                ) : null}
                {s?.then ? (
                  <p>
                    <strong>Então</strong> {s.then}
                  </p>
                ) : null}
                {s?.and?.length ? (
                  <ul className="mt-1 list-disc pl-5 text-xs">
                    {s.and
                      .filter((x): x is string => Boolean(x))
                      .map((x, j) => (
                        <li key={j}>
                          <strong>E</strong> {x}
                        </li>
                      ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {object.businessRules?.length ? (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">
            Regras de negócio ({object.businessRules.length})
          </h4>
          <ul className="space-y-1">
            {object.businessRules.map((r, i) => (
              <li key={i} className="rounded border bg-background p-3 text-sm">
                <div className="flex items-center gap-2">
                  {r?.code ? <Badge variant="outline">{r.code}</Badge> : null}
                  {r?.title ? (
                    <span className="font-medium">{r.title}</span>
                  ) : null}
                </div>
                {r?.description ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {object.references ? (
        <section className="space-y-1">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">
            Referências
          </h4>
          <p className="text-sm">{object.references}</p>
        </section>
      ) : null}
    </div>
  );
}
