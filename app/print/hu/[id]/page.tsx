import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, schema } from "@/lib/db/client";
import { PrintHeader, PrintFooter } from "@/components/print/print-header";
import { AutoPrintBar } from "@/components/print/print-trigger";
import { formatDate } from "@/components/print/print-utils";

const STATUS_LABEL = {
  DRAFT: "Rascunho",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
} as const;

export default async function PrintHuPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getDb();
  const hu = await db.query.userStory.findFirst({
    where: eq(schema.userStory.id, id),
  });
  if (!hu) notFound();

  return (
    <>
      <AutoPrintBar />

      <PrintHeader
        title="História de Usuário"
        subtitle={hu.title}
        meta={[
          { label: "Status", value: STATUS_LABEL[hu.status] },
          { label: "Gerada em", value: formatDate(hu.createdAt) },
        ]}
      />

      <article className="space-y-6">
        <section className="print-section">
          <h2 className="mb-2 text-base font-semibold text-primary">
            1. Visão de Usuário
          </h2>
          <div className="space-y-2 rounded-md border border-primary/20 bg-secondary/40 p-4 text-sm">
            <p>
              <strong>Como</strong> {hu.asA}
            </p>
            <p>
              <strong>Quero (solução)</strong> {hu.iWant}
            </p>
            <p>
              <strong>Para (problema)</strong> {hu.soThat}
            </p>
          </div>
        </section>

        <section className="print-section">
          <h2 className="mb-2 text-base font-semibold text-primary">
            2. Cenários ({hu.scenarios.length})
          </h2>
          <ol className="space-y-3 text-sm">
            {hu.scenarios.map((s, i) => (
              <li key={i} className="rounded border p-3">
                <p className="mb-1 font-semibold">
                  Cenário {i + 1} — {s.name}
                </p>
                <p>
                  <strong>Dado</strong> {s.given}
                </p>
                <p>
                  <strong>Quando</strong> {s.when}
                </p>
                <p>
                  <strong>Então</strong> {s.then}
                </p>
                {s.and && s.and.length > 0 ? (
                  <ul className="ml-4 mt-1 list-none space-y-0.5">
                    {s.and.map((a, j) => (
                      <li key={j}>
                        <strong>E</strong> {a}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        </section>

        <section className="print-section">
          <h2 className="mb-2 text-base font-semibold text-primary">
            3. Regras de Negócio ({hu.businessRules.length})
          </h2>
          {hu.businessRules.length === 0 ? (
            <p className="text-sm text-muted-foreground">N/a</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {hu.businessRules.map((rn) => (
                <li key={rn.code} className="rounded border p-3">
                  <p className="font-semibold">
                    {rn.code} — {rn.title}
                  </p>
                  <p className="text-xs">{rn.description}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="print-section">
          <h2 className="mb-2 text-base font-semibold text-primary">4. Fluxo</h2>
          <p className="text-sm italic text-muted-foreground">
            A modelar pelo agente Designer de Fluxo BPMN.
          </p>
        </section>

        <section className="print-section">
          <h2 className="mb-2 text-base font-semibold text-primary">
            5. Referências
          </h2>
          <p className="text-sm">
            {hu.references && hu.references.trim() ? hu.references : "N/a"}
          </p>
        </section>
      </article>

      <PrintFooter />
    </>
  );
}
