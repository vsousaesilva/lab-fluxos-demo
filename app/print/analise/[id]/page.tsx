import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, schema } from "@/lib/db/client";
import { PrintHeader, PrintFooter } from "@/components/print/print-header";
import { AutoPrintBar } from "@/components/print/print-trigger";
import { formatDate } from "@/components/print/print-utils";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL = {
  DRAFT: "Rascunho",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
} as const;

export default async function PrintAnalisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getDb();
  const analysis = await db.query.demandAnalysis.findFirst({
    where: eq(schema.demandAnalysis.id, id),
  });
  if (!analysis) notFound();

  const demand = await db.query.demand.findFirst({
    where: eq(schema.demand.id, analysis.demandId),
  });

  return (
    <>
      <AutoPrintBar />

      <PrintHeader
        title="Análise de Demanda"
        subtitle={demand?.title ?? `Análise ${analysis.id.slice(0, 8)}`}
        meta={[
          { label: "Status", value: STATUS_LABEL[analysis.status] },
          { label: "Gerada em", value: formatDate(analysis.createdAt) },
          ...(demand
            ? [{ label: "Solicitante", value: demand.requesterName }]
            : []),
        ]}
      />

      <article className="space-y-6">
        <section className="print-section">
          <h2 className="mb-2 text-base font-semibold text-primary">
            1. Resumo
          </h2>
          <p className="text-sm leading-relaxed">{analysis.summary}</p>
        </section>

        <section className="print-section">
          <h2 className="mb-2 text-base font-semibold text-primary">
            2. Objetivos
          </h2>
          <ul className="ml-4 list-decimal space-y-1 text-sm">
            {analysis.objectives.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </section>

        <section className="print-section">
          <h2 className="mb-2 text-base font-semibold text-primary">
            3. Times impactados
          </h2>
          <div className="flex flex-wrap gap-2">
            {analysis.impactedTeams.map((t) => (
              <Badge key={t} variant="outline">
                {t}
              </Badge>
            ))}
          </div>
        </section>

        {analysis.assumptions.length > 0 ? (
          <section className="print-section">
            <h2 className="mb-2 text-base font-semibold text-primary">
              4. Premissas
            </h2>
            <ul className="ml-4 list-disc space-y-1 text-sm">
              {analysis.assumptions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {analysis.risks.length > 0 ? (
          <section className="print-section">
            <h2 className="mb-2 text-base font-semibold text-primary">
              5. Riscos
            </h2>
            <ul className="ml-4 list-disc space-y-1 text-sm">
              {analysis.risks.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {analysis.openQuestions.length > 0 ? (
          <section className="print-section">
            <h2 className="mb-2 text-base font-semibold text-primary">
              6. Dúvidas em aberto
            </h2>
            <ul className="ml-4 list-disc space-y-1 text-sm">
              {analysis.openQuestions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="print-section">
          <h2 className="mb-2 text-base font-semibold text-primary">
            7. Backlog candidato ({analysis.backlogItems.length})
          </h2>
          <ul className="space-y-3">
            {analysis.backlogItems.map((item, i) => (
              <li key={i} className="rounded border border-primary/20 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{item.type}</Badge>
                  <span className="font-medium">{item.title}</span>
                  <Badge variant="secondary">{item.priority}</Badge>
                  <Badge>{item.team}</Badge>
                  <span className="text-xs text-muted-foreground">
                    · {item.estimate}
                  </span>
                </div>
                <p className="mt-1 text-xs">{item.description}</p>
                {item.acceptanceCriteria.length > 0 ? (
                  <div className="mt-2">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                      Critérios de aceite
                    </p>
                    <ul className="ml-4 list-disc text-xs">
                      {item.acceptanceCriteria.map((c, j) => (
                        <li key={j}>{c}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </article>

      <PrintFooter />
    </>
  );
}
