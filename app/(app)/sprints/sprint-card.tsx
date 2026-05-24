"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PrintTrigger } from "@/components/print/print-trigger";
import { RegenerateButton } from "@/components/regenerate-button";
import { SprintEditForm } from "./sprint-edit-form";
import { setSprintStatusAction } from "./actions";
import type { Sprint, SprintStatus } from "@/lib/db/schema";

const STATUS_LABEL: Record<
  SprintStatus,
  { label: string; variant: "default" | "success" | "destructive" | "secondary" }
> = {
  PROPOSED: { label: "Proposta", variant: "secondary" },
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

export function SprintCard({ sprint }: { sprint: Sprint }) {
  const [pending, startTransition] = useTransition();
  const status = STATUS_LABEL[sprint.status];

  function changeStatus(next: SprintStatus) {
    startTransition(async () => {
      const result = await setSprintStatusAction({ id: sprint.id, status: next });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Sprint ${STATUS_LABEL[next].label.toLowerCase()}`);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-medium leading-tight">{sprint.name}</h3>
            <p className="text-xs text-muted-foreground">
              {sprint.weeks} sem · {sprint.items.length} item(ns) ·{" "}
              {formatDate(sprint.createdAt)}
            </p>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <p>
            <strong>Goal:</strong> {sprint.goal}
          </p>
        </div>

        {sprint.outOfScope.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Fora do escopo: {sprint.outOfScope.length} item(ns)
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-1">
          {sprint.status === "PROPOSED" ? (
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
              onClick={() => changeStatus("PROPOSED")}
            >
              Reabrir
            </Button>
          )}
          <SprintEditForm sprint={sprint} />
          <RegenerateButton
            endpoint="/api/agents/sprint-manager"
            payload={{
              analysisIds: Array.from(
                new Set(
                  sprint.items
                    .map((it) => it.sourceAnalysisId)
                    .filter((id): id is string => Boolean(id))
                )
              ),
              weeks: sprint.weeks,
              capacityDescription: sprint.capacityDescription ?? undefined,
              goalHint: sprint.goalHint ?? undefined,
              replaceSprintId: sprint.id,
            }}
            confirmIfApproved
            approved={sprint.status === "APPROVED"}
            disabled={
              sprint.items.filter((it) => it.sourceAnalysisId).length === 0
            }
            disabledReason="Sprint sem análises de origem (criado antes do recurso de regenerar)"
          />
          <PrintTrigger href={`/print/sprint/${sprint.id}`} />
        </div>
      </CardContent>
    </Card>
  );
}
