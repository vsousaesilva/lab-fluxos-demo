import Link from "next/link";
import { sql } from "drizzle-orm";
import {
  Inbox,
  Microscope,
  BookOpen,
  Target,
  Workflow,
  FileCode2,
  ShieldCheck,
  MessagesSquare,
  ScrollText,
  Send,
  CheckSquare,
  Bot,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDb, schema } from "@/lib/db/client";

type EntityCount = {
  total: number;
  pending: number; // DRAFT/PROPOSED/REGISTERED/NOT_SYNCED
};

async function getMetrics() {
  const db = await getDb();
  const [demands, analyses, stories, sprints, ceremonies, flows, bpmns, jiraCards] =
    await Promise.all([
      db
        .select({
          total: sql<number>`count(*)`,
          pending: sql<number>`sum(case when status='REGISTERED' then 1 else 0 end)`,
        })
        .from(schema.demand),
      db
        .select({
          total: sql<number>`count(*)`,
          pending: sql<number>`sum(case when status='DRAFT' then 1 else 0 end)`,
        })
        .from(schema.demandAnalysis),
      db
        .select({
          total: sql<number>`count(*)`,
          pending: sql<number>`sum(case when status='DRAFT' then 1 else 0 end)`,
        })
        .from(schema.userStory),
      db
        .select({
          total: sql<number>`count(*)`,
          pending: sql<number>`sum(case when status='PROPOSED' then 1 else 0 end)`,
        })
        .from(schema.sprint),
      db
        .select({
          total: sql<number>`count(*)`,
          pending: sql<number>`sum(case when status='DRAFT' then 1 else 0 end)`,
        })
        .from(schema.ceremonyRecord),
      db
        .select({
          total: sql<number>`count(*)`,
          pending: sql<number>`sum(case when status='DRAFT' then 1 else 0 end)`,
        })
        .from(schema.generatedFlow),
      db
        .select({
          total: sql<number>`count(*)`,
          pending: sql<number>`sum(case when status='DRAFT' then 1 else 0 end)`,
        })
        .from(schema.bpmnDiagram),
      db
        .select({
          total: sql<number>`count(*)`,
          pending: sql<number>`sum(case when sync_status='NOT_SYNCED' or sync_status='FAILED' then 1 else 0 end)`,
        })
        .from(schema.jiraCard),
    ]);

  function toCount(row: { total: number; pending: number } | undefined): EntityCount {
    return {
      total: Number(row?.total ?? 0),
      pending: Number(row?.pending ?? 0),
    };
  }

  return {
    demands: toCount(demands[0]),
    analyses: toCount(analyses[0]),
    stories: toCount(stories[0]),
    sprints: toCount(sprints[0]),
    ceremonies: toCount(ceremonies[0]),
    flows: toCount(flows[0]),
    bpmns: toCount(bpmns[0]),
    jiraCards: toCount(jiraCards[0]),
  };
}

type SectionDef = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  data: EntityCount;
  pendingLabel: string;
};

export default async function PainelPage() {
  const m = await getMetrics();

  const sections: SectionDef[] = [
    {
      href: "/demandas",
      icon: Inbox,
      label: "Demandas",
      desc: "Entrada do pipeline",
      data: m.demands,
      pendingLabel: "registrada(s)",
    },
    {
      href: "/analises",
      icon: Microscope,
      label: "Análises",
      desc: "Backlog candidato com IA",
      data: m.analyses,
      pendingLabel: "rascunho(s)",
    },
    {
      href: "/hu",
      icon: BookOpen,
      label: "Histórias de Usuário",
      desc: "Template oficial com IA",
      data: m.stories,
      pendingLabel: "rascunho(s)",
    },
    {
      href: "/sprints",
      icon: Target,
      label: "Sprints",
      desc: "Planejamento com IA",
      data: m.sprints,
      pendingLabel: "proposta(s)",
    },
    {
      href: "/ritos",
      icon: ScrollText,
      label: "Ritos Scrum",
      desc: "Atas de cerimônia",
      data: m.ceremonies,
      pendingLabel: "rascunho(s)",
    },
    {
      href: "/gerador-xml",
      icon: FileCode2,
      label: "Gerador jPDL",
      desc: "XML PJe 3.2 com RAG",
      data: m.flows,
      pendingLabel: "rascunho(s)",
    },
    {
      href: "/bpmn",
      icon: Workflow,
      label: "Designer BPMN",
      desc: "BPMN 2.0 a partir de HU",
      data: m.bpmns,
      pendingLabel: "rascunho(s)",
    },
    {
      href: "/jira",
      icon: Send,
      label: "Jira",
      desc: "Sincronização de cards",
      data: m.jiraCards,
      pendingLabel: "pendente(s)",
    },
  ];

  // Contador de "para revisão" deve bater com o que /revisao realmente lista:
  // análises DRAFT + HUs DRAFT + sprints PROPOSED. Demandas/cerimônias/fluxos/bpmn/jira
  // não passam por aprovação humana global — seus badges são pendências de próxima etapa.
  const reviewQueueCount =
    m.analyses.pending + m.stories.pending + m.sprints.pending;

  return (
    <>
      <PageHeader
        title="Painel"
        description="Visão geral do pipeline: contagens por entidade e pendências aguardando revisão."
        actions={
          reviewQueueCount > 0 ? (
            <Link
              href="/revisao"
              className="inline-flex items-center gap-1.5 rounded-md bg-warning px-3 py-1.5 text-xs font-medium text-warning-foreground hover:bg-warning/90"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              {reviewQueueCount} item(ns) para revisão
            </Link>
          ) : (
            <Badge variant="success">Pipeline em dia</Badge>
          )
        }
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Pipeline
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {sections.map((s) => {
            const Icon = s.icon;
            const hasPending = s.data.pending > 0;
            return (
              <Link key={s.href} href={s.href} className="group">
                <Card
                  className={`h-full transition-colors hover:border-primary/40 ${
                    hasPending
                      ? "border-warning/30 bg-warning/5"
                      : ""
                  }`}
                >
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="rounded-md bg-primary/10 p-1.5 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium leading-tight">
                          {s.label}
                        </span>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                    <div className="flex items-baseline justify-between gap-2 pt-1">
                      <span className="text-2xl font-semibold tracking-tight">
                        {s.data.total}
                      </span>
                      {hasPending ? (
                        <Badge variant="warning" className="text-[10px]">
                          {s.data.pending} {s.pendingLabel}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">
                          total
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Ferramentas
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ToolCard
            href="/revisao"
            icon={CheckSquare}
            label="Revisão"
            desc="Fila global de pendências de aprovação"
            highlight={reviewQueueCount > 0}
          />
          <ToolCard
            href="/validador"
            icon={ShieldCheck}
            label="Validador XML"
            desc="Lint determinístico (jPDL + BPMN)"
          />
          <ToolCard
            href="/consultor"
            icon={MessagesSquare}
            label="Consultor de Fluxos"
            desc="Chat RAG nos fluxos PJe indexados"
          />
          <ToolCard
            href="/agentes"
            icon={Bot}
            label="Agentes (jobs)"
            desc="Histórico de execuções e custo LLM"
          />
        </div>
      </section>
    </>
  );
}

function ToolCard({
  href,
  icon: Icon,
  label,
  desc,
  highlight,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  highlight?: boolean;
}) {
  return (
    <Link href={href} className="group">
      <Card
        className={`h-full transition-colors hover:border-primary/40 ${
          highlight ? "border-warning/30 bg-warning/5" : ""
        }`}
      >
        <CardContent className="flex items-start gap-3 p-4">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 space-y-0.5">
            <p className="text-sm font-medium">{label}</p>
            <p className="text-[11px] text-muted-foreground">{desc}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </CardContent>
      </Card>
    </Link>
  );
}
