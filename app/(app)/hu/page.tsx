import { inArray } from "drizzle-orm";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getDb, schema } from "@/lib/db/client";
import { listApprovedDemands, listUserStories } from "./actions";
import { HuRunner } from "./hu-runner";
import { HuCard } from "./hu-card";

export default async function HuPage() {
  const [stories, approvedDemands] = await Promise.all([
    listUserStories(),
    listApprovedDemands(),
  ]);

  const titleById = new Map<string, string>();
  if (stories.length > 0) {
    const db = await getDb();
    const demandIds = Array.from(new Set(stories.map((s) => s.demandId)));
    const demands = await db
      .select({ id: schema.demand.id, title: schema.demand.title })
      .from(schema.demand)
      .where(inArray(schema.demand.id, demandIds));
    for (const d of demands) titleById.set(d.id, d.title);
  }

  return (
    <>
      <PageHeader
        title="Histórias de Usuário"
        description="O agente User Story Writer transforma uma demanda aprovada em HU no template oficial: Como/Quero/Para + cenários BDD + regras de negócio."
      />

      <HuRunner demands={approvedDemands} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">
          HUs geradas ({stories.length})
        </h2>
        {stories.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma HU ainda. Gere a primeira acima.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {stories.map((s) => (
              <HuCard
                key={s.id}
                story={s}
                demandTitle={titleById.get(s.demandId)}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
