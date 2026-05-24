import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { listApprovedUserStories, listGeneratedFlows } from "./actions";
import { GeneratorRunner } from "./generator-runner";
import { GeneratedFlowCard } from "./generated-flow-card";

export default async function GeradorXmlPage() {
  const [flows, stories] = await Promise.all([
    listGeneratedFlows(),
    listApprovedUserStories(),
  ]);

  return (
    <>
      <PageHeader
        title="Gerador XML jPDL"
        description="O agente PJe XML Generator transforma uma HU aprovada em XML jPDL 3.2: busca fluxos PJe similares (RAG), gera spec estruturado, renderiza XML deterministicamente e roda o Validador (6 LintRules)."
      />

      <GeneratorRunner stories={stories} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">
          Fluxos gerados ({flows.length})
        </h2>
        {flows.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhum fluxo gerado ainda. Gere o primeiro acima.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {flows.map((f) => (
              <GeneratedFlowCard key={f.id} flow={f} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
