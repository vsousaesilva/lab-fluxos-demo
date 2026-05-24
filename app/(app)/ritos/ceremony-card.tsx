"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PrintTrigger } from "@/components/print/print-trigger";
import { RegenerateButton } from "@/components/regenerate-button";
import { CeremonyEditForm } from "./ceremony-edit-form";
import { setCeremonyStatusAction } from "./actions";
import type { CeremonyRecord, CeremonyStatus, Sprint } from "@/lib/db/schema";

const STATUS_LABEL: Record<
  CeremonyStatus,
  { label: string; variant: "default" | "success" | "destructive" | "secondary" }
> = {
  DRAFT: { label: "Rascunho", variant: "secondary" },
  APPROVED: { label: "Aprovada", variant: "success" },
  REJECTED: { label: "Rejeitada", variant: "destructive" },
};

const TYPE_LABEL: Record<string, string> = {
  STANDUP: "Daily",
  PLANNING: "Planning",
  REVIEW: "Review",
  RETRO: "Retro",
};

export function CeremonyCard({
  ceremony,
  sprints = [],
}: {
  ceremony: CeremonyRecord;
  sprints?: Sprint[];
}) {
  const [pending, startTransition] = useTransition();
  const status = STATUS_LABEL[ceremony.status];

  function changeStatus(next: CeremonyStatus) {
    startTransition(async () => {
      const result = await setCeremonyStatusAction({ id: ceremony.id, status: next });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Ata ${STATUS_LABEL[next].label.toLowerCase()}`);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-medium leading-tight">{ceremony.title}</h3>
            <p className="text-xs text-muted-foreground">
              {TYPE_LABEL[ceremony.ceremonyType] ?? ceremony.ceremonyType} ·{" "}
              {ceremony.occurredOn} · {ceremony.actionItems.length} ação(ões)
            </p>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        <p className="line-clamp-3 text-sm text-muted-foreground">
          {ceremony.summary}
        </p>

        {ceremony.participants.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {ceremony.participants.slice(0, 6).map((p, i) => (
              <Badge key={i} variant="outline" className="text-[10px]">
                {p}
              </Badge>
            ))}
            {ceremony.participants.length > 6 ? (
              <span className="text-[10px] text-muted-foreground">
                +{ceremony.participants.length - 6}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-1">
          {ceremony.status === "DRAFT" ? (
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
          <CeremonyEditForm ceremony={ceremony} sprints={sprints} />
          <RegenerateButton
            endpoint="/api/agents/rites-scribe"
            payload={{
              type: ceremony.ceremonyType,
              occurredOn: ceremony.occurredOn,
              sprintId: ceremony.sprintId,
              rawNotes: ceremony.rawNotes,
              additionalContext: ceremony.additionalContext ?? undefined,
              replaceCeremonyId: ceremony.id,
            }}
            confirmIfApproved
            approved={ceremony.status === "APPROVED"}
            disabled={!ceremony.rawNotes || ceremony.rawNotes.trim() === ""}
            disabledReason="Ata sem anotações brutas (criada antes do recurso de regenerar)"
          />
          <PrintTrigger href={`/print/cerimonia/${ceremony.id}`} />
        </div>
      </CardContent>
    </Card>
  );
}
