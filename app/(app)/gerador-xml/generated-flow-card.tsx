"use client";

import { useState, useTransition } from "react";
import { Check, Copy, X, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PrintTrigger } from "@/components/print/print-trigger";
import { RegenerateButton } from "@/components/regenerate-button";
import { FlowEditForm } from "./flow-edit-form";
import { setGeneratedFlowStatusAction } from "./actions";
import type { GeneratedFlow, GeneratedFlowStatus } from "@/lib/db/schema";

const STATUS_LABEL: Record<
  GeneratedFlowStatus,
  { label: string; variant: "default" | "success" | "destructive" | "secondary" }
> = {
  DRAFT: { label: "Rascunho", variant: "secondary" },
  APPROVED: { label: "Aprovado", variant: "success" },
  REJECTED: { label: "Rejeitado", variant: "destructive" },
};

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Fortaleza",
  }).format(d);
}

export function GeneratedFlowCard({ flow }: { flow: GeneratedFlow }) {
  const [pending, startTransition] = useTransition();
  const [showXml, setShowXml] = useState(false);
  const [showFindings, setShowFindings] = useState(false);
  const status = STATUS_LABEL[flow.status];

  function changeStatus(next: GeneratedFlowStatus) {
    startTransition(async () => {
      const result = await setGeneratedFlowStatusAction({ id: flow.id, status: next });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Fluxo ${STATUS_LABEL[next].label.toLowerCase()}`);
    });
  }

  function copyXml() {
    navigator.clipboard
      .writeText(flow.xml)
      .then(() => toast.success("XML copiado"))
      .catch(() => toast.error("Falha ao copiar"));
  }

  const validationPassed = flow.validationResult === "PASSED";

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-medium leading-tight">{flow.processName}</h3>
            <p className="text-xs text-muted-foreground">
              {formatDate(flow.createdAt)} · {flow.xml.length.toLocaleString("pt-BR")} chars
            </p>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={validationPassed ? "success" : "destructive"}>
            Lint {flow.validationResult ?? "?"}
          </Badge>
          <Badge variant="destructive">{flow.errorCount} erro(s)</Badge>
          <Badge variant="warning">{flow.warningCount} aviso(s)</Badge>
          <Badge variant="secondary">{flow.infoCount} info</Badge>
        </div>

        {flow.findings.length > 0 ? (
          <div>
            <button
              onClick={() => setShowFindings((v) => !v)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {showFindings ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              Findings ({flow.findings.length})
            </button>
            {showFindings ? (
              <ul className="mt-2 space-y-1">
                {flow.findings.map((f, i) => (
                  <li
                    key={i}
                    className="rounded border p-2 text-xs"
                  >
                    <div className="flex items-center gap-1">
                      <Badge
                        variant={
                          f.severity === "ERROR"
                            ? "destructive"
                            : f.severity === "WARNING"
                              ? "warning"
                              : "secondary"
                        }
                        className="font-mono text-[10px]"
                      >
                        {f.code}
                      </Badge>
                      <span>{f.message}</span>
                    </div>
                    {f.nodeKey ? (
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                        {f.nodeKey}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div>
          <button
            onClick={() => setShowXml((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {showXml ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            Ver XML
          </button>
          {showXml ? (
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={copyXml}
                className="mb-2"
              >
                <Copy className="h-3 w-3" />
                Copiar
              </Button>
              <pre className="max-h-72 overflow-auto rounded border bg-muted/50 p-3 font-mono text-[10px] leading-relaxed">
                {flow.xml}
              </pre>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {flow.status === "DRAFT" ? (
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
          <FlowEditForm flow={flow} />
          <RegenerateButton
            endpoint="/api/agents/pje-xml-generator"
            payload={{
              userStoryId: flow.userStoryId,
              replaceFlowId: flow.id,
            }}
            confirmIfApproved
            approved={flow.status === "APPROVED"}
            disabled={!flow.userStoryId}
            disabledReason="Fluxo sem HU de origem"
          />
          <PrintTrigger href={`/print/fluxo/${flow.id}`} />
        </div>
      </CardContent>
    </Card>
  );
}
