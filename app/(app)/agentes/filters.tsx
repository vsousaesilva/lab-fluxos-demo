"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const STATUSES = [
  { value: "", label: "Todos" },
  { value: "RUNNING", label: "Em execução" },
  { value: "SUCCESS", label: "Sucesso" },
  { value: "FAILED", label: "Falha" },
  { value: "PENDING", label: "Pendente" },
];

const AGENT_TYPES = [
  { value: "", label: "Todos agentes" },
  { value: "DEMAND_ANALYST", label: "Analista de demanda" },
  { value: "USER_STORY_WRITER", label: "Redator de HU" },
  { value: "SPRINT_MANAGER", label: "Gestor de sprint" },
  { value: "PJE_XML_GENERATOR", label: "Gerador jPDL" },
  { value: "BPMN_DESIGNER", label: "Designer BPMN" },
  { value: "FLOW_CONSULTANT", label: "Consultor de fluxos" },
  { value: "RITES_SCRIBE", label: "Escriba de ritos" },
  { value: "XML_VALIDATOR", label: "Validador XML" },
  { value: "JIRA_SYNCHRONIZER", label: "Sincronizador Jira" },
];

export function JobsFilters() {
  const params = useSearchParams();
  const status = params.get("status") ?? "";
  const agentType = params.get("agentType") ?? "";

  function buildHref(next: { status?: string; agentType?: string }) {
    const s = next.status ?? status;
    const a = next.agentType ?? agentType;
    const qs = new URLSearchParams();
    if (s) qs.set("status", s);
    if (a) qs.set("agentType", a);
    const q = qs.toString();
    return q ? `/agentes?${q}` : "/agentes";
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
          Status
        </p>
        <div className="flex flex-wrap gap-1">
          {STATUSES.map((s) => {
            const active = s.value === status;
            return (
              <Link
                key={s.value}
                href={buildHref({ status: s.value })}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                )}
              >
                {s.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
          Agente
        </p>
        <div className="flex flex-wrap gap-1">
          {AGENT_TYPES.map((a) => {
            const active = a.value === agentType;
            return (
              <Link
                key={a.value}
                href={buildHref({ agentType: a.value })}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                )}
              >
                {a.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
