import { inArray } from "drizzle-orm";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getDb, schema } from "@/lib/db/client";
import { listAnalyses, listApprovedDemands } from "./actions";
import { AnalysisRunner } from "./analysis-runner";
import { AnalysisCard } from "./analysis-card";

export default async function AnalisesPage() {
  const [analyses, approvedDemands] = await Promise.all([
    listAnalyses(),
    listApprovedDemands(),
  ]);

  const titleById = new Map<string, string>();
  if (analyses.length > 0) {
    const db = await getDb();
    const demandIds = Array.from(new Set(analyses.map((a) => a.demandId)));
    const demands = await db
      .select({ id: schema.demand.id, title: schema.demand.title })
      .from(schema.demand)
      .where(inArray(schema.demand.id, demandIds));
    for (const d of demands) titleById.set(d.id, d.title);
  }

  return (
    <>
      <PageHeader
        title="Análise de Demanda"
        description="O agente Demand Analyst transforma uma demanda aprovada em análise técnica e backlog candidato."
      />

      <AnalysisRunner demands={approvedDemands} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">
          Análises geradas ({analyses.length})
        </h2>
        {analyses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma análise ainda. Gere a primeira acima.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {analyses.map((a) => (
              <AnalysisCard
                key={a.id}
                analysis={a}
                demandTitle={titleById.get(a.demandId)}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
