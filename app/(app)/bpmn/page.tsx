import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { listApprovedUserStories, listBpmnDiagrams } from "./actions";
import { BpmnRunner } from "./bpmn-runner";
import { BpmnCard } from "./bpmn-card";

export default async function BpmnPage() {
  const [diagrams, stories] = await Promise.all([
    listBpmnDiagrams(),
    listApprovedUserStories(),
  ]);

  return (
    <>
      <PageHeader
        title="Designer BPMN"
        description="O agente BPMN Designer gera diagramas BPMN 2.0 com layout DI a partir de uma HU aprovada. O XML é renderizado deterministicamente e validado pelas mesmas 6 LintRules. Pode ser aberto no bpmn.io para visualização interativa."
      />

      <BpmnRunner stories={stories} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">
          Diagramas BPMN ({diagrams.length})
        </h2>
        {diagrams.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhum diagrama ainda. Gere o primeiro acima.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {diagrams.map((d) => (
              <BpmnCard key={d.id} diagram={d} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
