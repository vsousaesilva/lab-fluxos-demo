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
  generatedFlowSpecSchema,
  type GeneratedFlowSpec,
} from "@/lib/agents/pje-xml-generator/schema";
import type { UserStory } from "@/lib/db/schema";

type Props = {
  stories: UserStory[];
};

export function GeneratorRunner({ stories }: Props) {
  const router = useRouter();
  const [userStoryId, setUserStoryId] = useState<string>(stories[0]?.id ?? "");
  const [additionalContext, setAdditionalContext] = useState("");

  const { object, submit, isLoading, stop, error } = useObject({
    api: "/api/agents/pje-xml-generator",
    schema: generatedFlowSpecSchema,
    onFinish: () => {
      toast.success("Fluxo XML gerado e validado");
      router.refresh();
    },
    onError: (err) => {
      toast.error(err.message || "Falha ao gerar fluxo");
    },
  });

  function onRun() {
    if (!userStoryId) {
      toast.error("Selecione uma HU aprovada");
      return;
    }
    submit({
      userStoryId,
      additionalContext: additionalContext.trim() || undefined,
    });
  }

  if (stories.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="space-y-2 py-8 text-center text-sm text-muted-foreground">
          <p>Nenhuma HU aprovada disponível.</p>
          <p>
            Aprove uma HU em <strong>Histórias de Usuário</strong> para gerar
            o XML do fluxo.
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
          Gerar XML jPDL 3.2 a partir de uma HU
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="userStoryId">HU aprovada</Label>
          <select
            id="userStoryId"
            value={userStoryId}
            onChange={(e) => setUserStoryId(e.target.value)}
            disabled={isLoading}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {stories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-muted-foreground">
            O agente busca fluxos PJe semelhantes (RAG) e usa como referência
            de EL/estrutura. O XML é validado pelas 6 LintRules automaticamente.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="context">Contexto adicional (opcional)</Label>
          <Textarea
            id="context"
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            disabled={isLoading}
            placeholder="Ex.: comportamentos específicos, integrações, EL a reutilizar…"
            rows={3}
            maxLength={5000}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={onRun} disabled={isLoading || !userStoryId}>
            <Sparkles className="h-4 w-4" />
            {isLoading ? "Gerando…" : "Gerar XML"}
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

        {object ? <SpecPreview object={object} /> : null}
      </CardContent>
    </Card>
  );
}

function SpecPreview({
  object,
}: {
  object: DeepPartial<GeneratedFlowSpec>;
}) {
  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-4">
      <Badge variant="secondary">Pré-visualização do spec (streaming)</Badge>

      {object.processName ? (
        <p className="text-sm">
          <strong>Processo:</strong> {object.processName}
        </p>
      ) : null}
      {object.startNode ? (
        <p className="text-sm">
          <strong>Nó inicial:</strong> {object.startNode}
        </p>
      ) : null}

      {object.nodes?.length ? (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">
            Nós ({object.nodes.length})
          </h4>
          <ul className="space-y-2">
            {object.nodes.map((n, i) => (
              <li key={i} className="rounded border bg-background p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {n?.kind ? <Badge variant="outline">{n.kind}</Badge> : null}
                  {n?.name ? <span className="font-medium">{n.name}</span> : null}
                  {n?.swimlane ? (
                    <Badge variant="secondary">{n.swimlane}</Badge>
                  ) : null}
                </div>
                {n?.decisionExpression ? (
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {n.decisionExpression}
                  </p>
                ) : null}
                {n?.transitions?.length ? (
                  <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                    {n.transitions.map((t, j) => (
                      <li key={j}>
                        → <span className="font-mono">{t?.to ?? "?"}</span>
                        {t?.name && t.name !== t.to ? ` (${t.name})` : ""}
                        {t?.condition ? (
                          <span className="font-mono"> [{t.condition}]</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Após o stream terminar, o XML é renderizado deterministicamente e
        validado. Confira o card abaixo.
      </p>
    </div>
  );
}
