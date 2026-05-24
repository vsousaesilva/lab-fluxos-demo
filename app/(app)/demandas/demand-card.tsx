"use client";

import { useTransition } from "react";
import { Check, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deleteDemandAction, setDemandStatusAction } from "./actions";
import { DemandForm } from "./demand-form";
import type { Demand, DemandStatus } from "@/lib/db/schema";

const STATUS_VARIANT: Record<
  DemandStatus,
  { label: string; variant: "default" | "success" | "destructive" | "secondary" }
> = {
  REGISTERED: { label: "Registrada", variant: "secondary" },
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

export function DemandCard({ demand }: { demand: Demand }) {
  const [pending, startTransition] = useTransition();
  const statusInfo = STATUS_VARIANT[demand.status];

  function changeStatus(next: DemandStatus) {
    startTransition(async () => {
      const result = await setDemandStatusAction({ id: demand.id, status: next });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Demanda ${STATUS_VARIANT[next].label.toLowerCase()}`);
    });
  }

  function remove() {
    if (!confirm("Excluir essa demanda? Não dá pra desfazer.")) return;
    startTransition(async () => {
      const result = await deleteDemandAction({ id: demand.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Demanda excluída");
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-medium leading-tight">{demand.title}</h3>
            <p className="text-xs text-muted-foreground">
              {demand.requesterName} · {formatDate(demand.createdAt)}
            </p>
          </div>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {demand.description}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap gap-2">
            {demand.status === "REGISTERED" ? (
              <>
                <Button
                  size="sm"
                  variant="default"
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
                onClick={() => changeStatus("REGISTERED")}
              >
                Reabrir
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <DemandForm initial={demand} />
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={remove}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
