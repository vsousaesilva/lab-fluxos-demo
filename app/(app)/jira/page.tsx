import { inArray } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb, schema } from "@/lib/db/client";
import {
  listApprovedAnalyses,
  listApprovedSprints,
  listJiraCards,
} from "./actions";
import { JiraRunner } from "./jira-runner";
import { JiraCardsTable } from "./jira-cards-table";

export default async function JiraPage() {
  const [analyses, sprints, cards] = await Promise.all([
    listApprovedAnalyses(),
    listApprovedSprints(),
    listJiraCards(),
  ]);

  // Mapa demandId → título pra mostrar nome amigável nas análises
  const analysisTitleById: Record<string, string> = {};
  if (analyses.length > 0) {
    const db = await getDb();
    const demandIds = Array.from(new Set(analyses.map((a) => a.demandId)));
    const demands = await db
      .select({ id: schema.demand.id, title: schema.demand.title })
      .from(schema.demand)
      .where(inArray(schema.demand.id, demandIds));
    const titleByDemand = new Map(demands.map((d) => [d.id, d.title]));
    for (const a of analyses) {
      analysisTitleById[a.demandId] = titleByDemand.get(a.demandId) ?? "";
    }
  }

  // Pega base URL do Jira pra montar links pros issues
  const { env } = await getCloudflareContext({ async: true });
  const jiraBaseUrl = env.JIRA_BASE_URL
    ? env.JIRA_BASE_URL.replace(/\/+$/, "")
    : null;

  return (
    <>
      <PageHeader
        title="Jira"
        description="Sincronização determinística de análises e sprints APROVADAS com cards no Jira Cloud. Idempotente — itens já enviados não são duplicados."
      />

      {!jiraBaseUrl ? (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="space-y-1 p-5 text-sm">
            <p className="font-medium">Credenciais Jira não configuradas</p>
            <p className="text-muted-foreground">
              Configure as variáveis <code>JIRA_BASE_URL</code>,{" "}
              <code>JIRA_EMAIL</code>, <code>JIRA_API_TOKEN</code> e{" "}
              <code>JIRA_PROJECT_KEY</code> em <code>.dev.vars</code> (dev) ou
              via <code>_secrets.cmd</code> (prod). Sem isso o agente vai
              falhar na primeira tentativa.
            </p>
            <p className="text-xs text-muted-foreground">
              API token:{" "}
              <a
                href="https://id.atlassian.com/manage-profile/security/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                id.atlassian.com/manage-profile/security/api-tokens
              </a>
            </p>
          </CardContent>
        </Card>
      ) : null}

      <JiraRunner
        analyses={analyses}
        sprints={sprints}
        analysisTitleById={analysisTitleById}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Cards Jira ({cards.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <JiraCardsTable cards={cards} jiraBaseUrl={jiraBaseUrl} />
        </CardContent>
      </Card>
    </>
  );
}
