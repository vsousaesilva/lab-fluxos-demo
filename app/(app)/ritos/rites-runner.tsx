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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ritesScribeOutputSchema,
  CEREMONY_TYPES,
  type CeremonyTypeValue,
  type RitesScribeOutput,
} from "@/lib/agents/rites-scribe/schema";
import {
  ceremonyLabel,
  recommendedSectionsFor,
} from "@/lib/agents/rites-scribe/prompt";
import type { Sprint } from "@/lib/db/schema";

type Props = {
  sprints: Sprint[];
};

function todayISO(): string {
  const tz = "America/Fortaleza";
  // Pega a data no fuso correto sem precisar de lib extra
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

export function RitesRunner({ sprints }: Props) {
  const router = useRouter();
  const [type, setType] = useState<CeremonyTypeValue>("PLANNING");
  const [occurredOn, setOccurredOn] = useState<string>(todayISO());
  const [sprintId, setSprintId] = useState<string>("");
  const [rawNotes, setRawNotes] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");

  const { object, submit, isLoading, stop, error } = useObject({
    api: "/api/agents/rites-scribe",
    schema: ritesScribeOutputSchema,
    onFinish: () => {
      toast.success("Ata gerada e salva como rascunho");
      router.refresh();
    },
    onError: (err) => {
      toast.error(err.message || "Falha ao gerar ata");
    },
  });

  function onRun() {
    if (!rawNotes.trim()) {
      toast.error("Cole as anotações/transcrição da cerimônia");
      return;
    }
    submit({
      type,
      occurredOn,
      sprintId: sprintId || null,
      rawNotes,
      additionalContext: additionalContext.trim() || undefined,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Gerar ata de cerimônia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="type">Tipo</Label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as CeremonyTypeValue)}
              disabled={isLoading}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {CEREMONY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ceremonyLabel(t)}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground">
              Seções: {recommendedSectionsFor(type)}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={occurredOn}
              onChange={(e) => setOccurredOn(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sprint">Sprint (opcional)</Label>
            <select
              id="sprint"
              value={sprintId}
              onChange={(e) => setSprintId(e.target.value)}
              disabled={isLoading}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">— sem sprint —</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rawNotes">Anotações/transcrição</Label>
          <Textarea
            id="rawNotes"
            value={rawNotes}
            onChange={(e) => setRawNotes(e.target.value)}
            disabled={isLoading}
            placeholder="Cole as anotações brutas da cerimônia — pode ser bagunçado, em tópicos, ou transcrição corrida"
            rows={8}
            maxLength={50000}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="context">Contexto adicional (opcional)</Label>
          <Textarea
            id="context"
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            disabled={isLoading}
            placeholder="Ex.: foco da sprint, contexto institucional…"
            rows={2}
            maxLength={5000}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={onRun} disabled={isLoading || !rawNotes.trim()}>
            <Sparkles className="h-4 w-4" />
            {isLoading ? "Gerando…" : "Gerar ata"}
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

        {object ? <CeremonyPreview object={object} /> : null}
      </CardContent>
    </Card>
  );
}

function CeremonyPreview({
  object,
}: {
  object: DeepPartial<RitesScribeOutput>;
}) {
  return (
    <div className="space-y-4 rounded-md border bg-muted/30 p-4">
      <Badge variant="secondary">Pré-visualização (streaming)</Badge>

      {object.title ? (
        <h3 className="text-base font-medium">{object.title}</h3>
      ) : null}
      {object.summary ? (
        <p className="text-sm">{object.summary}</p>
      ) : null}

      {object.participants?.length ? (
        <section className="space-y-1">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">
            Participantes
          </h4>
          <div className="flex flex-wrap gap-1">
            {object.participants
              .filter((p): p is string => Boolean(p))
              .map((p, i) => (
                <Badge key={i} variant="outline">
                  {p}
                </Badge>
              ))}
          </div>
        </section>
      ) : null}

      {object.sections?.length ? (
        <section className="space-y-2">
          {object.sections.map((s, i) => (
            <div key={i} className="rounded border bg-background p-3 text-sm">
              {s?.title ? <p className="font-medium">{s.title}</p> : null}
              {s?.items?.length ? (
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {s.items
                    .filter((it): it is string => Boolean(it))
                    .map((it, j) => (
                      <li key={j}>{it}</li>
                    ))}
                </ul>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {object.actionItems?.length ? (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">
            Itens de ação ({object.actionItems.length})
          </h4>
          <ul className="space-y-1">
            {object.actionItems.map((a, i) => (
              <li key={i} className="rounded border bg-background p-3 text-sm">
                {a?.description ? (
                  <p className="font-medium">{a.description}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {a?.owner ? `Responsável: ${a.owner}` : ""}
                  {a?.owner && a?.dueDate ? " · " : ""}
                  {a?.dueDate ? `Prazo: ${a.dueDate}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
