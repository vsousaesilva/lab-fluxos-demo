import { desc, eq, inArray } from "drizzle-orm";
import { ClipboardList, FileText, ListTodo } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getDb, schema } from "@/lib/db/client";
import { AnalysisCard } from "../analises/analysis-card";
import { HuCard } from "../hu/hu-card";
import { SprintCard } from "../sprints/sprint-card";

export default async function RevisaoPage() {
  const db = await getDb();

  const [pendingAnalyses, pendingStories, pendingSprints] = await Promise.all([
    db
      .select()
      .from(schema.demandAnalysis)
      .where(eq(schema.demandAnalysis.status, "DRAFT"))
      .orderBy(desc(schema.demandAnalysis.createdAt)),
    db
      .select()
      .from(schema.userStory)
      .where(eq(schema.userStory.status, "DRAFT"))
      .orderBy(desc(schema.userStory.createdAt)),
    db
      .select()
      .from(schema.sprint)
      .where(eq(schema.sprint.status, "PROPOSED"))
      .orderBy(desc(schema.sprint.createdAt)),
  ]);

  const demandIds = Array.from(
    new Set([
      ...pendingAnalyses.map((a) => a.demandId),
      ...pendingStories.map((s) => s.demandId),
    ])
  );
  const demandTitleById = new Map<string, string>();
  if (demandIds.length > 0) {
    const demands = await db
      .select({ id: schema.demand.id, title: schema.demand.title })
      .from(schema.demand)
      .where(inArray(schema.demand.id, demandIds));
    for (const d of demands) demandTitleById.set(d.id, d.title);
  }

  const total =
    pendingAnalyses.length + pendingStories.length + pendingSprints.length;

  return (
    <>
      <PageHeader
        title="Revisão"
        description="Fila global de itens aguardando aprovação. Aprove ou rejeite direto desta tela para destravar o pipeline."
        actions={<Badge variant={total > 0 ? "warning" : "secondary"}>{total} pendente(s)</Badge>}
      />

      {total === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <p>Nada pendente. Pipeline em dia.</p>
          </CardContent>
        </Card>
      ) : null}

      <ReviewSection
        icon={<ClipboardList className="h-4 w-4" />}
        title="Análises de demanda"
        count={pendingAnalyses.length}
      >
        {pendingAnalyses.length === 0 ? (
          <EmptyRow label="Nenhuma análise em rascunho." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pendingAnalyses.map((a) => (
              <AnalysisCard
                key={a.id}
                analysis={a}
                demandTitle={demandTitleById.get(a.demandId)}
              />
            ))}
          </div>
        )}
      </ReviewSection>

      <ReviewSection
        icon={<FileText className="h-4 w-4" />}
        title="Histórias de usuário"
        count={pendingStories.length}
      >
        {pendingStories.length === 0 ? (
          <EmptyRow label="Nenhuma HU em rascunho." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pendingStories.map((s) => (
              <HuCard
                key={s.id}
                story={s}
                demandTitle={demandTitleById.get(s.demandId)}
              />
            ))}
          </div>
        )}
      </ReviewSection>

      <ReviewSection
        icon={<ListTodo className="h-4 w-4" />}
        title="Sprints propostas"
        count={pendingSprints.length}
      >
        {pendingSprints.length === 0 ? (
          <EmptyRow label="Nenhuma sprint aguardando." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pendingSprints.map((sp) => (
              <SprintCard key={sp.id} sprint={sp} />
            ))}
          </div>
        )}
      </ReviewSection>
    </>
  );
}

function ReviewSection({
  icon,
  title,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase text-muted-foreground">
        <span className="text-foreground">{icon}</span>
        {title}
        <Badge variant="outline" className="ml-1 text-[10px]">
          {count}
        </Badge>
      </h2>
      {children}
    </section>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-6 text-center text-xs text-muted-foreground">
        {label}
      </CardContent>
    </Card>
  );
}
