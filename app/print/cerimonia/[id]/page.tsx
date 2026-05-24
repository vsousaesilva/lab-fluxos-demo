import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, schema } from "@/lib/db/client";
import { PrintHeader, PrintFooter } from "@/components/print/print-header";
import { AutoPrintBar } from "@/components/print/print-trigger";
import { formatDate, formatDateOnly } from "@/components/print/print-utils";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL = {
  DRAFT: "Rascunho",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
} as const;

const TYPE_LABEL: Record<string, string> = {
  STANDUP: "Daily / Standup",
  PLANNING: "Planning",
  REVIEW: "Review",
  RETRO: "Retrospectiva",
};

export default async function PrintCerimoniaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getDb();
  const ceremony = await db.query.ceremonyRecord.findFirst({
    where: eq(schema.ceremonyRecord.id, id),
  });
  if (!ceremony) notFound();

  return (
    <>
      <AutoPrintBar />

      <PrintHeader
        title="Ata de Cerimônia Scrum"
        subtitle={ceremony.title}
        meta={[
          { label: "Tipo", value: TYPE_LABEL[ceremony.ceremonyType] ?? ceremony.ceremonyType },
          { label: "Status", value: STATUS_LABEL[ceremony.status] },
          { label: "Realizada em", value: formatDateOnly(ceremony.occurredOn) },
          { label: "Gerada em", value: formatDate(ceremony.createdAt) },
        ]}
      />

      <article className="space-y-6">
        <section className="print-section">
          <h2 className="mb-2 text-base font-semibold text-primary">Resumo</h2>
          <p className="text-sm leading-relaxed">{ceremony.summary}</p>
        </section>

        {ceremony.participants.length > 0 ? (
          <section className="print-section">
            <h2 className="mb-2 text-base font-semibold text-primary">
              Participantes
            </h2>
            <div className="flex flex-wrap gap-1">
              {ceremony.participants.map((p, i) => (
                <Badge key={i} variant="outline">
                  {p}
                </Badge>
              ))}
            </div>
          </section>
        ) : null}

        <section className="print-section">
          <h2 className="mb-2 text-base font-semibold text-primary">
            Seções
          </h2>
          <div className="space-y-3 text-sm">
            {ceremony.sections.map((s, i) => (
              <div key={i} className="rounded border p-3">
                <p className="mb-1 font-semibold">{s.title}</p>
                {s.items.length > 0 ? (
                  <ul className="ml-4 list-disc space-y-0.5">
                    {s.items.map((it, j) => (
                      <li key={j}>{it}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {ceremony.actionItems.length > 0 ? (
          <section className="print-section">
            <h2 className="mb-2 text-base font-semibold text-primary">
              Itens de ação ({ceremony.actionItems.length})
            </h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-1 pr-2 text-xs font-semibold">Ação</th>
                  <th className="py-1 pr-2 text-xs font-semibold">Responsável</th>
                  <th className="py-1 text-xs font-semibold">Prazo</th>
                </tr>
              </thead>
              <tbody>
                {ceremony.actionItems.map((a, i) => (
                  <tr key={i} className="border-b align-top">
                    <td className="py-1 pr-2">{a.description}</td>
                    <td className="py-1 pr-2">{a.owner}</td>
                    <td className="py-1 whitespace-nowrap">{a.dueDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}
      </article>

      <PrintFooter />
    </>
  );
}
