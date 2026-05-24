import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, schema } from "@/lib/db/client";
import { PrintHeader, PrintFooter } from "@/components/print/print-header";
import { AutoPrintBar } from "@/components/print/print-trigger";
import { formatDate } from "@/components/print/print-utils";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL = {
  DRAFT: "Rascunho",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
} as const;

export default async function PrintFluxoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getDb();
  const flow = await db.query.generatedFlow.findFirst({
    where: eq(schema.generatedFlow.id, id),
  });
  if (!flow) notFound();

  return (
    <>
      <AutoPrintBar />

      <PrintHeader
        title="Fluxo PJe gerado (jPDL 3.2)"
        subtitle={flow.processName}
        meta={[
          { label: "Status", value: STATUS_LABEL[flow.status] },
          {
            label: "Validação",
            value:
              flow.validationResult === "PASSED" ? "Aprovada" : "Falhou",
          },
          { label: "Gerado em", value: formatDate(flow.createdAt) },
        ]}
      />

      <article className="space-y-6">
        <section className="print-section">
          <h2 className="mb-2 text-base font-semibold text-primary">
            Resultado do Lint
          </h2>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={flow.validationResult === "PASSED" ? "success" : "destructive"}
            >
              {flow.validationResult ?? "?"}
            </Badge>
            <Badge variant="destructive">{flow.errorCount} erro(s)</Badge>
            <Badge variant="warning">{flow.warningCount} aviso(s)</Badge>
            <Badge variant="secondary">{flow.infoCount} info</Badge>
          </div>
        </section>

        {flow.findings.length > 0 ? (
          <section className="print-section">
            <h2 className="mb-2 text-base font-semibold text-primary">
              Findings
            </h2>
            <ul className="space-y-2 text-sm">
              {flow.findings.map((f, i) => (
                <li key={i} className="rounded border p-2 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="rounded bg-muted px-1 font-mono text-[10px]">
                      {f.code}
                    </span>
                    <span className="font-medium uppercase text-[10px] text-muted-foreground">
                      {f.severity}
                    </span>
                    <span>{f.message}</span>
                  </div>
                  {f.nodeKey ? (
                    <p className="ml-2 mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {f.nodeKey}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="print-section">
          <h2 className="mb-2 text-base font-semibold text-primary">
            Especificação (HU)
          </h2>
          <pre className="whitespace-pre-wrap rounded border bg-secondary/30 p-3 font-mono text-[10px] leading-relaxed">
            {flow.specification}
          </pre>
        </section>

        <section className="print-section">
          <h2 className="mb-2 text-base font-semibold text-primary">
            XML jPDL 3.2 gerado
          </h2>
          <pre className="whitespace-pre-wrap rounded border bg-secondary/30 p-3 font-mono text-[9px] leading-relaxed">
            {flow.xml}
          </pre>
        </section>
      </article>

      <PrintFooter />
    </>
  );
}
