import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Cliente mínimo da REST API do Jira Cloud (v3).
 * Autenticação: Basic Auth com `JIRA_EMAIL:JIRA_API_TOKEN` em base64.
 *
 * Credenciais em `env`:
 *  - JIRA_BASE_URL       ex.: https://acme.atlassian.net
 *  - JIRA_EMAIL          email da conta Atlassian
 *  - JIRA_API_TOKEN      gerado em https://id.atlassian.com/manage-profile/security/api-tokens
 *  - JIRA_PROJECT_KEY    ex.: LAB (chave do projeto onde criar issues)
 */

export type JiraConfig = {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
};

export type CreateIssueInput = {
  summary: string;
  description: string;
  issueType: string; // "Epic" | "Story" | "Task" | "Bug" | "Subtask"
};

export type CreateIssueResult = {
  id: string;
  key: string; // ex.: "LAB-123"
  self: string; // URL canônica
};

export async function getJiraConfig(): Promise<JiraConfig> {
  const { env } = await getCloudflareContext({ async: true });
  const baseUrl = (env.JIRA_BASE_URL ?? "").replace(/\/+$/, "");
  const email = env.JIRA_EMAIL ?? "";
  const apiToken = env.JIRA_API_TOKEN ?? "";
  const projectKey = env.JIRA_PROJECT_KEY ?? "";

  const missing: string[] = [];
  if (!baseUrl) missing.push("JIRA_BASE_URL");
  if (!email) missing.push("JIRA_EMAIL");
  if (!apiToken) missing.push("JIRA_API_TOKEN");
  if (!projectKey) missing.push("JIRA_PROJECT_KEY");
  if (missing.length > 0) {
    throw new Error(
      `Credenciais Jira ausentes em .dev.vars: ${missing.join(", ")}`
    );
  }

  return { baseUrl, email, apiToken, projectKey };
}

function basicAuthHeader(cfg: JiraConfig): string {
  const token = `${cfg.email}:${cfg.apiToken}`;
  // btoa funciona em Workers; Buffer também via nodejs_compat.
  const encoded =
    typeof btoa === "function"
      ? btoa(token)
      : Buffer.from(token).toString("base64");
  return `Basic ${encoded}`;
}

/**
 * Converte texto plano em Atlassian Document Format (ADF v1).
 * Jira Cloud v3 exige description como ADF (não aceita string).
 */
function textToAdf(text: string) {
  const lines = (text ?? "").split("\n");
  return {
    type: "doc",
    version: 1,
    content: lines.map((line) => ({
      type: "paragraph",
      content:
        line.trim().length > 0
          ? [{ type: "text", text: line }]
          : [{ type: "text", text: " " }],
    })),
  };
}

export async function createJiraIssue(
  input: CreateIssueInput
): Promise<CreateIssueResult> {
  const cfg = await getJiraConfig();
  const url = `${cfg.baseUrl}/rest/api/3/issue`;
  const body = {
    fields: {
      project: { key: cfg.projectKey },
      summary: input.summary.slice(0, 255),
      description: textToAdf(input.description),
      issuetype: { name: input.issueType },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(cfg),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jira POST /issue ${res.status}: ${text.slice(0, 400)}`);
  }
  return (await res.json()) as CreateIssueResult;
}

/** Monta URL do browser do Jira a partir do issueKey. */
export async function jiraBrowseUrl(issueKey: string): Promise<string> {
  const cfg = await getJiraConfig();
  return `${cfg.baseUrl}/browse/${issueKey}`;
}
