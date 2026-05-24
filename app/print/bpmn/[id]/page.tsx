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

export default async function PrintBpmnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getDb();
  const diagram = await db.query.bpmnDiagram.findFirst({
    where: eq(schema.bpmnDiagram.id, id),
  });
  if (!diagram) notFound();

  return (
    <>
      <AutoPrintBar />

      <PrintHeader
        title="Diagrama BPMN 2.0"
        subtitle={diagram.processName}
        meta={[
          { label: "Status", value: STATUS_LABEL[diagram.status] },
          {
            label: "Validação",
            value:
              diagram.validationResult === "PASSED" ? "Aprovada" : "Falhou",
          },
          { label: "Gerado em", value: formatDate(diagram.createdAt) },
        ]}
      />

      <article className="space-y-6">
        <section className="print-section">
          <h2 className="mb-2 text-base font-semibold text-primary">
            Resultado do Lint
          </h2>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={
                diagram.validationResult === "PASSED"
                  ? "success"
                  : "destructive"
              }
            >
              {diagram.validationResult ?? "?"}
            </Badge>
            <Badge variant="destructive">{diagram.errorCount} erro(s)</Badge>
            <Badge variant="warning">{diagram.warningCount} aviso(s)</Badge>
            <Badge variant="secondary">{diagram.infoCount} info</Badge>
          </div>
        </section>

        {diagram.findings.length > 0 ? (
          <section className="print-section">
            <h2 className="mb-2 text-base font-semibold text-primary">
              Findings
            </h2>
            <ul className="space-y-2 text-sm">
              {diagram.findings.map((f, i) => (
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
            {diagram.specification}
          </pre>
        </section>

        <section className="print-section">
          <h2 className="mb-2 text-base font-semibold text-primary">
            XML BPMN 2.0
          </h2>
          <p className="mb-2 text-xs text-muted-foreground">
            Para visualizar interativamente, abra o XML em qualquer ferramenta
            BPMN 2.0:{" "}
            <a href="https://demo.bpmn.io/new" className="text-primary underline">
              bpmn.io
            </a>{" "}
            (web),{" "}
            <a
              href="https://www.bizagi.com/en/platform/modeler"
              className="text-primary underline"
            >
              Bizagi Modeler
            </a>{" "}
            ou{" "}
            <a
              href="https://camunda.com/download/modeler/"
              className="text-primary underline"
            >
              Camunda Modeler
            </a>
            .
          </p>
          <pre className="whitespace-pre-wrap rounded border bg-secondary/30 p-3 font-mono text-[9px] leading-relaxed">
            {diagram.bpmnXml}
          </pre>
        </section>
      </article>

      <PrintFooter />
    </>
  );
}
