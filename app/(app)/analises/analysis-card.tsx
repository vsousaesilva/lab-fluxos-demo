"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PrintTrigger } from "@/components/print/print-trigger";
import { RegenerateButton } from "@/components/regenerate-button";
import { AnalysisEditForm } from "./analysis-edit-form";
import { setAnalysisStatusAction } from "./actions";
import type { AnalysisStatus, DemandAnalysis } from "@/lib/db/schema";

const STATUS_LABEL: Record<
  AnalysisStatus,
  { label: string; variant: "default" | "success" | "destructive" | "secondary" }
> = {
  DRAFT: { label: "Rascunho", variant: "secondary" },
  APPROVED: { label: "Aprovada", variant: "success" },
  REJECTED: { label: "Rejeitada", variant: "destructive" },
};

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Fortaleza",
  }).format(d);
}

export function AnalysisCard({
  analysis,
  demandTitle,
}: {
  analysis: DemandAnalysis;
  demandTitle?: string;
}) {
  const [pending, startTransition] = useTransition();
  const status = STATUS_LABEL[analysis.status];

  function changeStatus(next: AnalysisStatus) {
    startTransition(async () => {
      const result = await setAnalysisStatusAction({ id: analysis.id, status: next });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Análise ${STATUS_LABEL[next].label.toLowerCase()}`);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-medium leading-tight">
              {demandTitle ?? `Análise ${analysis.id.slice(0, 8)}`}
            </h3>
            <p className="text-xs text-muted-foreground">
              {formatDate(analysis.createdAt)} · {analysis.backlogItems.length}{" "}
              item(ns) · {analysis.risks.length} risco(s)
            </p>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {analysis.summary}
        </p>
        <div className="flex flex-wrap gap-1">
          {analysis.impactedTeams.map((t) => (
            <Badge key={t} variant="outline" className="text-[10px]">
              {t}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {analysis.status === "DRAFT" ? (
            <>
              <Button
                size="sm"
                disabled={pending}
                onClick={() => changeStatus("APPROVED")}
              >
                <Check className="h-4 w-4" />
                Aprovar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => changeStatus("REJECTED")}
              >
                <X className="h-4 w-4" />
                Rejeitar
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => changeStatus("DRAFT")}
            >
              Reabrir
            </Button>
          )}
          <AnalysisEditForm analysis={analysis} />
          <RegenerateButton
            endpoint="/api/agents/demand-analyst"
            payload={{
              demandId: analysis.demandId,
              replaceAnalysisId: analysis.id,
            }}
            confirmIfApproved
            approved={analysis.status === "APPROVED"}
          />
          <PrintTrigger href={`/print/analise/${analysis.id}`} />
        </div>
      </CardContent>
    </Card>
  );
}
