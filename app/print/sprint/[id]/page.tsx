import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, schema } from "@/lib/db/client";
import { PrintHeader, PrintFooter } from "@/components/print/print-header";
import { AutoPrintBar } from "@/components/print/print-trigger";
import { formatDate } from "@/components/print/print-utils";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL = {
  PROPOSED: "Proposta",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
} as const;

export default async function PrintSprintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getDb();
  const sprint = await db.query.sprint.findFirst({
    where: eq(schema.sprint.id, id),
  });
  if (!sprint) notFound();

  return (
    <>
      <AutoPrintBar />

      <PrintHeader
        title="Proposta de Sprint"
        subtitle={sprint.name}
        meta={[
          { label: "Status", value: STATUS_LABEL[sprint.status] },
          { label: "Duração", value: `${sprint.weeks} semana(s)` },
          { label: "Gerada em", value: formatDate(sprint.createdAt) },
        ]}
      />

      <article className="space-y-6">
        <section className="print-section">
          <h2 className="mb-2 text-base font-semibold text-primary">
            Sprint Goal
          </h2>
          <p className="rounded-md border border-primary/20 bg-secondary/40 p-4 text-sm leading-relaxed">
            {sprint.goal}
          </p>
        </section>

        {sprint.capacityNotes ? (
          <section className="print-section">
            <h2 className="mb-2 text-base font-semibold text-primary">
              Capacidade x Escopo
            </h2>
            <p className="text-sm">{sprint.capacityNotes}</p>
          </section>
        ) : null}

        <section className="print-section">
          <h2 className="mb-2 text-base font-semibold text-primary">
            Itens selecionados ({sprint.items.length})
          </h2>
          <ol className="space-y-3 text-sm">
            {sprint.items.map((it, i) => (
              <li key={i} className="rounded border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{it.type}</Badge>
                  <span className="font-medium">{it.title}</span>
                  <Badge variant="secondary">{it.priority}</Badge>
                  <Badge>{it.team}</Badge>
                  <span className="text-xs text-muted-foreground">
                    · {it.estimate}
                  </span>
                </div>
                {it.rationale ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {it.rationale}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </section>

        {sprint.outOfScope.length > 0 ? (
          <section className="print-section">
            <h2 className="mb-2 text-base font-semibold text-primary">
              Fora do escopo
            </h2>
            <ul className="ml-4 list-disc space-y-1 text-sm">
              {sprint.outOfScope.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {sprint.risks.length > 0 ? (
          <section className="print-section">
            <h2 className="mb-2 text-base font-semibold text-primary">
              Riscos
            </h2>
            <ul className="ml-4 list-disc space-y-1 text-sm">
              {sprint.risks.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="print-section">
          <h2 className="mb-2 text-base font-semibold text-primary">
            Definition of Done
          </h2>
          <ul className="ml-4 list-disc space-y-1 text-sm">
            {sprint.definitionOfDone.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </section>
      </article>

      <PrintFooter />
    </>
  );
}
