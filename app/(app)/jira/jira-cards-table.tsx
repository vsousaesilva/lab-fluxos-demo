"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { JiraCard, JiraSyncStatus } from "@/lib/db/schema";

const STATUS_META: Record<
  JiraSyncStatus,
  { label: string; variant: "default" | "success" | "destructive" | "secondary" | "warning" }
> = {
  NOT_SYNCED: { label: "Pendente", variant: "secondary" },
  SYNCING: { label: "Sincronizando", variant: "warning" },
  SYNCED: { label: "Sincronizado", variant: "success" },
  FAILED: { label: "Falhou", variant: "destructive" },
};

const SOURCE_LABEL = {
  DEMAND_ANALYSIS: "Análise",
  SPRINT: "Sprint",
} as const;

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Fortaleza",
  }).format(d);
}

type Props = {
  cards: JiraCard[];
  jiraBaseUrl: string | null;
};

export function JiraCardsTable({ cards, jiraBaseUrl }: Props) {
  const router = useRouter();
  const [retrying, setRetrying] = useState<string | null>(null);

  async function retry(sourceType: string, sourceId: string, scopeKey: string) {
    setRetrying(scopeKey);
    try {
      const res = await fetch("/api/agents/jira-synchronizer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: "retry", sourceType, sourceId }),
      });
      const data = (await res.json()) as
        | { ok: true; outcome: { synced: number; failed: number } }
        | { error: string };
      if (!res.ok || "error" in data) {
        throw new Error(("error" in data && data.error) || `HTTP ${res.status}`);
      }
      toast.success(
        `Retry: ${data.outcome.synced} sincronizado(s), ${data.outcome.failed} falha(s)`
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no retry");
    } finally {
      setRetrying(null);
    }
  }

  // Cards com status FAILED agrupados por (sourceType, sourceId) pra mostrar retry agregado
  const failedGroups = new Map<string, { sourceType: string; sourceId: string; count: number }>();
  for (const c of cards) {
    if (c.syncStatus === "FAILED") {
      const key = `${c.sourceType}:${c.sourceId}`;
      const g = failedGroups.get(key);
      if (g) g.count++;
      else
        failedGroups.set(key, {
          sourceType: c.sourceType,
          sourceId: c.sourceId,
          count: 1,
        });
    }
  }

  if (cards.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhum card Jira ainda. Use o painel acima para sincronizar uma análise ou sprint aprovada.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {failedGroups.size > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase text-destructive">
            Falhas pendentes
          </p>
          <div className="flex flex-wrap gap-2">
            {Array.from(failedGroups.entries()).map(([key, g]) => (
              <Button
                key={key}
                size="sm"
                variant="outline"
                disabled={retrying === key}
                onClick={() => retry(g.sourceType, g.sourceId, key)}
              >
                <RotateCw
                  className={
                    retrying === key
                      ? "h-3 w-3 animate-spin"
                      : "h-3 w-3"
                  }
                />
                Retry {SOURCE_LABEL[g.sourceType as keyof typeof SOURCE_LABEL]} ({g.count})
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/30">
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-2 font-medium">Fonte</th>
              <th className="px-3 py-2 font-medium">Tipo</th>
              <th className="px-3 py-2 font-medium">Resumo</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Issue</th>
              <th className="px-3 py-2 font-medium">Criado</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((c) => {
              const meta = STATUS_META[c.syncStatus];
              return (
                <tr key={c.id} className="border-b align-top hover:bg-muted/20">
                  <td className="px-3 py-2 text-xs">
                    <Badge variant="outline" className="text-[10px]">
                      {SOURCE_LABEL[c.sourceType]}
                    </Badge>
                    <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {c.sourceRef}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs">{c.issueType}</td>
                  <td className="px-3 py-2 text-xs">
                    <div className="font-medium leading-tight">{c.summary}</div>
                    <div className="line-clamp-2 text-[10px] text-muted-foreground">
                      {c.description}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={meta.variant} className="text-[10px]">
                      {meta.label}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {c.issueKey ? (
                      jiraBaseUrl ? (
                        <a
                          href={`${jiraBaseUrl}/browse/${c.issueKey}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 font-mono text-primary hover:underline"
                        >
                          {c.issueKey}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="font-mono">{c.issueKey}</span>
                      )
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {formatDate(c.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
