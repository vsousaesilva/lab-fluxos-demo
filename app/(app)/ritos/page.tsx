import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { listApprovedSprints, listCeremonies } from "./actions";
import { RitesRunner } from "./rites-runner";
import { CeremonyCard } from "./ceremony-card";

export default async function RitosPage() {
  const [ceremonies, sprints] = await Promise.all([
    listCeremonies(),
    listApprovedSprints(),
  ]);

  return (
    <>
      <PageHeader
        title="Ritos Scrum"
        description="O agente Rites Scribe transforma anotações brutas de Planning, Review, Retro ou Daily em atas estruturadas (participantes, seções, action items)."
      />

      <RitesRunner sprints={sprints} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">
          Atas geradas ({ceremonies.length})
        </h2>
        {ceremonies.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma ata ainda. Cole anotações de uma cerimônia acima.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {ceremonies.map((c) => (
              <CeremonyCard key={c.id} ceremony={c} sprints={sprints} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
