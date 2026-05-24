import { count } from "drizzle-orm";
import { Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { getDb, schema } from "@/lib/db/client";
import { demandStatusSchema } from "@/lib/validators/demand";
import type { DemandStatus } from "@/lib/db/schema";
import { listDemands } from "./actions";
import { DemandCard } from "./demand-card";
import { DemandForm } from "./demand-form";
import { StatusFilter } from "./status-filter";

type Counts = Record<DemandStatus | "all", number>;

async function getCounts(): Promise<Counts> {
  const db = await getDb();
  const rows = await db
    .select({ status: schema.demand.status, total: count() })
    .from(schema.demand)
    .groupBy(schema.demand.status);
  const counts: Counts = { all: 0, REGISTERED: 0, APPROVED: 0, REJECTED: 0 };
  for (const row of rows) {
    const status = row.status as DemandStatus;
    counts[status] = row.total;
    counts.all += row.total;
  }
  return counts;
}

export default async function DemandasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const parsedStatus = demandStatusSchema.safeParse(params.status);
  const filter = parsedStatus.success ? parsedStatus.data : undefined;

  const [demands, counts] = await Promise.all([
    listDemands(filter ? { status: filter } : undefined),
    getCounts(),
  ]);

  return (
    <>
      <PageHeader
        title="Demandas"
        description="Ponto de entrada do pipeline. Toda demanda registrada gera análise, HU, sprint e fluxos."
        actions={<DemandForm />}
      />

      <StatusFilter counts={counts} />

      {demands.length === 0 ? (
        <EmptyState filtered={Boolean(filter)} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {demands.map((d) => (
            <DemandCard key={d.id} demand={d} />
          ))}
        </div>
      )}
    </>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="rounded-full bg-muted p-3 text-muted-foreground">
          <Inbox className="h-6 w-6" />
        </div>
        <h3 className="font-medium">
          {filtered ? "Nenhuma demanda neste filtro" : "Nenhuma demanda registrada"}
        </h3>
        <p className="max-w-md text-sm text-muted-foreground">
          {filtered
            ? "Tente outro filtro ou registre uma nova demanda."
            : "Comece registrando a primeira demanda para alimentar o pipeline."}
        </p>
      </CardContent>
    </Card>
  );
}
