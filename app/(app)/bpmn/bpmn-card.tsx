"use client";

import { useState, useTransition } from "react";
import {
  Check,
  Copy,
  X,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PrintTrigger } from "@/components/print/print-trigger";
import { RegenerateButton } from "@/components/regenerate-button";
import { BpmnEditForm } from "./bpmn-edit-form";
import { setBpmnStatusAction } from "./actions";
import type { BpmnDiagram, GeneratedFlowStatus } from "@/lib/db/schema";

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

export function BpmnCard({ diagram }: { diagram: BpmnDiagram }) {
  const [pending, startTransition] = useTransition();
  const [showXml, setShowXml] = useState(false);
  const [showFindings, setShowFindings] = useState(false);
  const status = STATUS_LABEL[diagram.status];

  function changeStatus(next: GeneratedFlowStatus) {
    startTransition(async () => {
      const result = await setBpmnStatusAction({ id: diagram.id, status: next });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Diagrama ${STATUS_LABEL[next].label.toLowerCase()}`);
    });
  }

  function copyXml() {
    navigator.clipboard
      .writeText(diagram.bpmnXml)
      .then(() => toast.success("XML copiado"))
      .catch(() => toast.error("Falha ao copiar"));
  }

  function safeFileName(): string {
    return (diagram.processName || "diagrama").replace(/[^A-Za-z0-9_-]+/g, "_");
  }

  function downloadBpmn() {
    const blob = new Blob([diagram.bpmnXml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFileName()}.bpmn`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Arquivo ${safeFileName()}.bpmn baixado`);
  }

  /** Abre demo.bpmn.io em nova aba. O usuário arrasta o .bpmn baixado para o editor. */
  function openInBpmnIo() {
    downloadBpmn();
    window.open("https://demo.bpmn.io/new", "_blank", "noopener,noreferrer");
    toast.info(
      "Arraste o arquivo .bpmn baixado para a janela do bpmn.io que abriu"
    );
  }

  /** Abre página do Bizagi Modeler (desktop) com instrução de import. */
  function openInBizagi() {
    downloadBpmn();
    window.open(
      "https://www.bizagi.com/en/platform/modeler",
      "_blank",
      "noopener,noreferrer"
    );
    toast.info(
      "No Bizagi Modeler: aba Export/Import → grupo Import → BPMN → selecione o .bpmn baixado (NÃO use File → Open, que só abre .bpm)"
    );
  }

  const passed = diagram.validationResult === "PASSED";

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-medium leading-tight">{diagram.processName}</h3>
            <p className="text-xs text-muted-foreground">
              {formatDate(diagram.createdAt)} ·{" "}
              {diagram.bpmnXml.length.toLocaleString("pt-BR")} chars
            </p>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={passed ? "success" : "destructive"}>
            Lint {diagram.validationResult ?? "?"}
          </Badge>
          <Badge variant="destructive">{diagram.errorCount} erro(s)</Badge>
          <Badge variant="warning">{diagram.warningCount} aviso(s)</Badge>
          <Badge variant="secondary">{diagram.infoCount} info</Badge>
        </div>

        {diagram.findings.length > 0 ? (
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
              Findings ({diagram.findings.length})
            </button>
            {showFindings ? (
              <ul className="mt-2 space-y-1">
                {diagram.findings.map((f, i) => (
                  <li key={i} className="rounded border p-2 text-xs">
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
            Ver XML BPMN
          </button>
          {showXml ? (
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="default" onClick={downloadBpmn}>
                  <Download className="h-3 w-3" />
                  Baixar .bpmn
                </Button>
                <Button size="sm" variant="outline" onClick={openInBpmnIo}>
                  <ExternalLink className="h-3 w-3" />
                  Visualizar no bpmn.io
                </Button>
                <Button size="sm" variant="outline" onClick={openInBizagi}>
                  <ExternalLink className="h-3 w-3" />
                  Abrir no Bizagi
                </Button>
                <Button size="sm" variant="ghost" onClick={copyXml}>
                  <Copy className="h-3 w-3" />
                  Copiar XML
                </Button>
              </div>
              <ul className="space-y-0.5 text-[10px] text-muted-foreground">
                <li>
                  <strong>bpmn.io</strong> (web): clique no botão → o arquivo
                  baixa e o editor abre em nova aba → arraste o .bpmn para a
                  janela.
                </li>
                <li>
                  <strong>Bizagi Modeler</strong> (desktop, gratuito): clique no
                  botão → o arquivo baixa e a página do Bizagi abre → instale o
                  Modeler se necessário → abra-o e use a aba{" "}
                  <strong>Export/Import → grupo Import → BPMN</strong> apontando
                  para o .bpmn baixado.{" "}
                  <em>
                    File → Open só abre o formato nativo <code>.bpm</code> do
                    Bizagi e rejeita <code>.bpmn</code> como “invalid or corrupt”.
                  </em>
                </li>
                <li>
                  O mesmo XML BPMN 2.0 também é compatível com{" "}
                  <strong>Camunda Modeler</strong> e demais ferramentas BPMN.
                </li>
              </ul>
              <pre className="max-h-72 overflow-auto rounded border bg-muted/50 p-3 font-mono text-[10px] leading-relaxed">
                {diagram.bpmnXml}
              </pre>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {diagram.status === "DRAFT" ? (
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
          <BpmnEditForm diagram={diagram} />
          <RegenerateButton
            endpoint="/api/agents/bpmn-designer"
            payload={{
              userStoryId: diagram.userStoryId,
              replaceDiagramId: diagram.id,
            }}
            confirmIfApproved
            approved={diagram.status === "APPROVED"}
            disabled={!diagram.userStoryId}
            disabledReason="Diagrama sem HU de origem"
          />
          <PrintTrigger href={`/print/bpmn/${diagram.id}`} />
        </div>
      </CardContent>
    </Card>
  );
}
