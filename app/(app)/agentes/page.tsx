import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { estimateCost, formatBrl, USD_TO_BRL_RATE } from "@/lib/ai/pricing";
import {
  CheckCircle2,
  Clock,
  Coins,
  Database,
  Loader2,
  XCircle,
} from "lucide-react";
import type {
  AgentJob,
  AgentJobStatus,
  AgentType,
} from "@/lib/db/schema";
import { getAgentMetrics, listAgentJobs } from "./actions";
import { JobsFilters } from "./filters";

const STATUS_META: Record<
  AgentJobStatus,
  { label: string; variant: "default" | "success" | "destructive" | "secondary" | "warning" }
> = {
  PENDING: { label: "Pendente", variant: "secondary" },
  RUNNING: { label: "Em execução", variant: "warning" },
  SUCCESS: { label: "Sucesso", variant: "success" },
  FAILED: { label: "Falha", variant: "destructive" },
};

const AGENT_LABEL: Record<AgentType, string> = {
  DEMAND_ANALYST: "Demand Analyst",
  USER_STORY_WRITER: "User Story Writer",
  SPRINT_MANAGER: "Sprint Manager",
  PJE_XML_GENERATOR: "PJe XML Generator",
  BPMN_DESIGNER: "BPMN Designer",
  FLOW_CONSULTANT: "Flow Consultant",
  RITES_SCRIBE: "Rites Scribe",
  JIRA_SYNCHRONIZER: "Jira Synchronizer",
  XML_VALIDATOR: "XML Validator",
  EL_DESCRIBER: "EL Describer",
};

function formatDateTime(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Fortaleza",
  }).format(d);
}

function formatLatency(start: Date | null, end: Date | null): string {
  if (!start || !end) return "—";
  const ms = end.getTime() - start.getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTokens(n: number): string {
  if (n === 0) return "—";
  return n.toLocaleString("pt-BR");
}

export default async function AgentesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; agentType?: string }>;
}) {
  const params = await searchParams;
  const filter = {
    status: params.status as AgentJobStatus | undefined,
    agentType: params.agentType as AgentType | undefined,
  };

  const [jobs, metrics] = await Promise.all([
    listAgentJobs(filter, 200),
    getAgentMetrics(filter),
  ]);

  // Custo total agregado (estima por job)
  let totalCostUsd = 0;
  let totalCostWithPricingCount = 0;
  for (const j of jobs) {
    const c = estimateCost(j.llmModel, j.promptTokens, j.completionTokens);
    totalCostUsd += c.totalUsd;
    if (c.hasPricing) totalCostWithPricingCount++;
  }

  return (
    <>
      <PageHeader
        title="Agentes (jobs)"
        description="Auditoria e governança de custo de LLM. Cada disparo de agente gera um AgentJob com tokens, modelo e tempo de execução."
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<Database className="h-4 w-4" />}
          label="Total de jobs"
          value={metrics.totalJobs.toLocaleString("pt-BR")}
          hint={`${metrics.successCount} sucesso · ${metrics.failedCount} falha · ${metrics.runningCount} em execução`}
        />
        <MetricCard
          icon={<CheckCircle2 className="h-4 w-4 text-success" />}
          label="Taxa de sucesso"
          value={`${(metrics.successRate * 100).toFixed(0)}%`}
          hint="Entre jobs finalizados (SUCCESS + FAILED)"
        />
        <MetricCard
          icon={<Clock className="h-4 w-4 text-info" />}
          label="Tokens consumidos"
          value={(
            metrics.totalPromptTokens + metrics.totalCompletionTokens
          ).toLocaleString("pt-BR")}
          hint={`${metrics.totalPromptTokens.toLocaleString("pt-BR")} input · ${metrics.totalCompletionTokens.toLocaleString("pt-BR")} output`}
        />
        <MetricCard
          icon={<Coins className="h-4 w-4 text-accent" />}
          label="Custo estimado"
          value={formatBrl(totalCostUsd)}
          hint={
            totalCostWithPricingCount < jobs.length
              ? `${totalCostWithPricingCount}/${jobs.length} jobs com pricing · câmbio R$ ${USD_TO_BRL_RATE.toFixed(2).replace(".", ",")}/US$`
              : `Convertido a R$ ${USD_TO_BRL_RATE.toFixed(2).replace(".", ",")}/US$`
          }
        />
      </section>

      <Card>
        <CardContent className="p-5">
          <JobsFilters />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {jobs.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum job encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-muted/30">
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Agente</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Modelo</th>
                    <th className="px-3 py-2 text-right font-medium">Tokens</th>
                    <th className="px-3 py-2 text-right font-medium">Custo</th>
                    <th className="px-3 py-2 text-right font-medium">Latência</th>
                    <th className="px-3 py-2 font-medium">Início</th>
                    <th className="px-3 py-2 font-medium">Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <JobRow key={j.id} job={j} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
          {icon}
          {label}
        </div>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function JobRow({ job }: { job: AgentJob }) {
  const status = STATUS_META[job.status];
  const cost = estimateCost(job.llmModel, job.promptTokens, job.completionTokens);
  const totalTokens = job.promptTokens + job.completionTokens;

  return (
    <tr className="border-b align-top hover:bg-muted/20">
      <td className="px-3 py-2 text-xs font-medium">
        {AGENT_LABEL[job.agentType] ?? job.agentType}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          {job.status === "RUNNING" ? (
            <Loader2 className="h-3 w-3 animate-spin text-warning" />
          ) : job.status === "FAILED" ? (
            <XCircle className="h-3 w-3 text-destructive" />
          ) : job.status === "SUCCESS" ? (
            <CheckCircle2 className="h-3 w-3 text-success" />
          ) : null}
          <Badge variant={status.variant} className="text-[10px]">
            {status.label}
          </Badge>
        </div>
      </td>
      <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
        {job.llmModel ?? "—"}
      </td>
      <td className="px-3 py-2 text-right text-xs">
        {totalTokens === 0 ? (
          "—"
        ) : (
          <div>
            <div className="font-medium">{formatTokens(totalTokens)}</div>
            <div className="text-[10px] text-muted-foreground">
              {formatTokens(job.promptTokens)}↓ /{" "}
              {formatTokens(job.completionTokens)}↑
            </div>
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-right text-xs">
        {cost.hasPricing ? formatBrl(cost.totalUsd) : "—"}
      </td>
      <td className="px-3 py-2 text-right text-xs">
        {formatLatency(job.startedAt, job.finishedAt)}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">
        {formatDateTime(job.startedAt)}
      </td>
      <td className="px-3 py-2 text-xs">
        {job.errorMessage ? (
          <span
            className="line-clamp-2 text-destructive"
            title={job.errorMessage}
          >
            {job.errorMessage}
          </span>
        ) : job.outputSummary ? (
          <span
            className="line-clamp-2 text-muted-foreground"
            title={job.outputSummary}
          >
            {job.outputSummary}
          </span>
        ) : job.inputSummary ? (
          <span
            className="line-clamp-2 text-muted-foreground/70"
            title={job.inputSummary}
          >
            {job.inputSummary}
          </span>
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}
