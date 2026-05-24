import { inArray } from "drizzle-orm";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getDb, schema } from "@/lib/db/client";
import { listApprovedAnalysesWithBacklog, listSprints } from "./actions";
import { SprintRunner } from "./sprint-runner";
import { SprintCard } from "./sprint-card";

export default async function SprintsPage() {
  const [sprints, approvedAnalyses] = await Promise.all([
    listSprints(),
    listApprovedAnalysesWithBacklog(),
  ]);

  const demandTitleById: Record<string, string> = {};
  if (approvedAnalyses.length > 0) {
    const db = await getDb();
    const demandIds = Array.from(new Set(approvedAnalyses.map((a) => a.demandId)));
    const demands = await db
      .select({ id: schema.demand.id, title: schema.demand.title })
      .from(schema.demand)
      .where(inArray(schema.demand.id, demandIds));
    for (const d of demands) demandTitleById[d.id] = d.title;
  }

  return (
    <>
      <PageHeader
        title="Sprints"
        description="O agente Sprint Manager seleciona itens das análises aprovadas e propõe uma sprint coerente respeitando a capacidade."
      />

      <SprintRunner
        analyses={approvedAnalyses}
        demandTitleById={demandTitleById}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">
          Sprints propostas ({sprints.length})
        </h2>
        {sprints.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma sprint ainda. Proponha a primeira acima.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sprints.map((s) => (
              <SprintCard key={s.id} sprint={s} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
