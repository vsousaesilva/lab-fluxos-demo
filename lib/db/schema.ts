import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ============================================================
// Helpers
// ============================================================
const uuid = (name: string) =>
  text(name).$defaultFn(() => crypto.randomUUID());

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
};

// ============================================================
// better-auth — user, session, account, verification
// ============================================================
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp_ms",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp_ms",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
});

// ============================================================
// Invite — controle de acesso por convite
// O signup só aceita usuários que apresentem um `code` válido.
// `email` opcional bloqueia o convite a um destinatário específico.
// ============================================================
export const invite = sqliteTable(
  "invite",
  {
    id: uuid("id").primaryKey(),
    code: text("code").notNull().unique(),
    email: text("email"),
    note: text("note"),
    createdBy: text("created_by").references(() => user.id),
    usedBy: text("used_by").references(() => user.id),
    usedAt: integer("used_at", { mode: "timestamp_ms" }),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    codeIdx: index("idx_invite_code").on(t.code),
    usedByIdx: index("idx_invite_used_by").on(t.usedBy),
  })
);

export type Invite = typeof invite.$inferSelect;
export type NewInvite = typeof invite.$inferInsert;

// ============================================================
// 1. Demand — ponto de entrada do pipeline
// ============================================================
export type DemandStatus = "REGISTERED" | "APPROVED" | "REJECTED";

export const demand = sqliteTable(
  "demand",
  {
    id: uuid("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    requesterName: text("requester_name").notNull(),
    status: text("status").$type<DemandStatus>().notNull().default("REGISTERED"),
    ...timestamps,
  },
  (t) => ({
    statusIdx: index("idx_demand_status").on(t.status),
  })
);

// ============================================================
// 2. AgentJob — auditoria e governança de custo LLM
// ============================================================
export type AgentJobStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
export type AgentType =
  | "DEMAND_ANALYST"
  | "USER_STORY_WRITER"
  | "SPRINT_MANAGER"
  | "BPMN_DESIGNER"
  | "PJE_XML_GENERATOR"
  | "FLOW_CONSULTANT"
  | "RITES_SCRIBE"
  | "JIRA_SYNCHRONIZER"
  | "XML_VALIDATOR";

export const agentJob = sqliteTable(
  "agent_job",
  {
    id: uuid("id").primaryKey(),
    agentType: text("agent_type").$type<AgentType>().notNull(),
    status: text("status").$type<AgentJobStatus>().notNull().default("PENDING"),
    inputSummary: text("input_summary"),
    outputSummary: text("output_summary"),
    llmProvider: text("llm_provider"),
    llmModel: text("llm_model"),
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
    errorMessage: text("error_message"),
    ...timestamps,
  },
  (t) => ({
    typeIdx: index("idx_agent_job_type").on(t.agentType),
    statusIdx: index("idx_agent_job_status").on(t.status),
  })
);

// ============================================================
// 3. UserStory — História de Usuário gerada (template JFCE)
// ============================================================
export type UserStoryStatus = "DRAFT" | "APPROVED" | "REJECTED";

export type Scenario = {
  name: string;
  given: string;
  when: string;
  then: string;
  and?: string[];
};

export type BusinessRule = {
  code: string;
  title: string;
  description: string;
};

export const userStory = sqliteTable(
  "user_story",
  {
    id: uuid("id").primaryKey(),
    demandId: text("demand_id")
      .notNull()
      .references(() => demand.id, { onDelete: "restrict" }),
    agentJobId: text("agent_job_id").references(() => agentJob.id),
    title: text("title").notNull(),
    asA: text("as_a").notNull(),
    iWant: text("i_want").notNull(),
    soThat: text("so_that").notNull(),
    scenarios: text("scenarios", { mode: "json" })
      .$type<Scenario[]>()
      .notNull(),
    businessRules: text("business_rules", { mode: "json" })
      .$type<BusinessRule[]>()
      .notNull(),
    references: text("references"),
    status: text("status").$type<UserStoryStatus>().notNull().default("DRAFT"),
    ...timestamps,
  },
  (t) => ({
    demandIdx: index("idx_user_story_demand").on(t.demandId),
    statusIdx: index("idx_user_story_status").on(t.status),
  })
);

// ============================================================
// 4. DemandAnalysis — análise técnica + backlog candidato
// ============================================================
export type AnalysisStatus = "DRAFT" | "APPROVED" | "REJECTED";
export type ImpactedTeam = "DEV" | "BUSINESS" | "QA" | "DESIGN";
export type BacklogItemType = "EPIC" | "STORY" | "TASK" | "SPIKE" | "BUG";
export type Priority = "HIGHEST" | "HIGH" | "MEDIUM" | "LOW";

export type BacklogItem = {
  type: BacklogItemType;
  title: string;
  description: string;
  team: ImpactedTeam;
  priority: Priority;
  estimate: string;
  acceptanceCriteria: string[];
};

export const demandAnalysis = sqliteTable(
  "demand_analysis",
  {
    id: uuid("id").primaryKey(),
    demandId: text("demand_id")
      .notNull()
      .references(() => demand.id, { onDelete: "restrict" }),
    agentJobId: text("agent_job_id").references(() => agentJob.id),
    summary: text("summary").notNull(),
    objectives: text("objectives", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    impactedTeams: text("impacted_teams", { mode: "json" })
      .$type<ImpactedTeam[]>()
      .notNull(),
    assumptions: text("assumptions", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    risks: text("risks", { mode: "json" }).$type<string[]>().notNull(),
    openQuestions: text("open_questions", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    backlogItems: text("backlog_items", { mode: "json" })
      .$type<BacklogItem[]>()
      .notNull(),
    status: text("status").$type<AnalysisStatus>().notNull().default("DRAFT"),
    ...timestamps,
  },
  (t) => ({
    demandIdx: index("idx_demand_analysis_demand").on(t.demandId),
    statusIdx: index("idx_demand_analysis_status").on(t.status),
  })
);

// ============================================================
// 5. Sprint — proposta de sprint gerada pelo Sprint Manager
// ============================================================
export type SprintStatus = "PROPOSED" | "APPROVED" | "REJECTED";

export type SprintItem = {
  sourceAnalysisId: string | null;
  type: BacklogItemType;
  title: string;
  team: ImpactedTeam;
  priority: Priority;
  estimate: string;
  rationale: string;
};

export const sprint = sqliteTable(
  "sprint",
  {
    id: uuid("id").primaryKey(),
    agentJobId: text("agent_job_id").references(() => agentJob.id),
    name: text("name").notNull(),
    goal: text("goal").notNull(),
    weeks: integer("weeks").notNull(),
    capacityNotes: text("capacity_notes"),
    capacityDescription: text("capacity_description"),
    goalHint: text("goal_hint"),
    items: text("items", { mode: "json" }).$type<SprintItem[]>().notNull(),
    outOfScope: text("out_of_scope", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    risks: text("risks", { mode: "json" }).$type<string[]>().notNull(),
    definitionOfDone: text("definition_of_done", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    status: text("status").$type<SprintStatus>().notNull().default("PROPOSED"),
    ...timestamps,
  },
  (t) => ({
    statusIdx: index("idx_sprint_status").on(t.status),
  })
);

// ============================================================
// 6. CeremonyRecord — ata de cerimônia Scrum
// ============================================================
export type CeremonyType = "PLANNING" | "REVIEW" | "RETRO" | "STANDUP";
export type CeremonyStatus = "DRAFT" | "APPROVED" | "REJECTED";

export type CeremonySection = {
  title: string;
  items: string[];
};

export type ActionItem = {
  description: string;
  owner: string;
  dueDate: string;
};

export const ceremonyRecord = sqliteTable(
  "ceremony_record",
  {
    id: uuid("id").primaryKey(),
    agentJobId: text("agent_job_id").references(() => agentJob.id),
    sprintId: text("sprint_id").references(() => sprint.id),
    ceremonyType: text("ceremony_type").$type<CeremonyType>().notNull(),
    title: text("title").notNull(),
    occurredOn: text("occurred_on").notNull(),
    summary: text("summary").notNull(),
    participants: text("participants", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    sections: text("sections", { mode: "json" })
      .$type<CeremonySection[]>()
      .notNull(),
    actionItems: text("action_items", { mode: "json" })
      .$type<ActionItem[]>()
      .notNull(),
    rawNotes: text("raw_notes").notNull().default(""),
    additionalContext: text("additional_context"),
    status: text("status").$type<CeremonyStatus>().notNull().default("DRAFT"),
    ...timestamps,
  },
  (t) => ({
    typeIdx: index("idx_ceremony_type").on(t.ceremonyType),
    statusIdx: index("idx_ceremony_status").on(t.status),
  })
);

// ============================================================
// 7. FlowSource — XML jPDL/BPMN indexado para RAG
//    (embeddings vivem em Cloudflare Vectorize)
// ============================================================
export type FlowDialect = "jPDL" | "BPMN";
export type FlowSourceStatus = "INDEXED" | "ERROR";

export const flowSource = sqliteTable(
  "flow_source",
  {
    id: uuid("id").primaryKey(),
    filePath: text("file_path").notNull().unique(),
    fileName: text("file_name").notNull(),
    contentHash: text("content_hash").notNull(),
    processName: text("process_name").notNull(),
    dialect: text("dialect").$type<FlowDialect>().notNull(),
    chunkCount: integer("chunk_count").notNull().default(0),
    status: text("status").$type<FlowSourceStatus>().notNull(),
    errorMessage: text("error_message"),
    indexedAt: integer("indexed_at", { mode: "timestamp_ms" }),
    r2Key: text("r2_key"),
    ...timestamps,
  },
  (t) => ({
    statusIdx: index("idx_flow_source_status").on(t.status),
    nameIdx: index("idx_flow_source_name").on(t.processName),
  })
);

// ============================================================
// 8. FlowChunk — pedaço do XML indexado
//    embedding fica em Vectorize com vectorId = chunkId
// ============================================================
export const flowChunk = sqliteTable(
  "flow_chunk",
  {
    id: uuid("id").primaryKey(),
    flowSourceId: text("flow_source_id")
      .notNull()
      .references(() => flowSource.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    content: text("content").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    sourceIdx: index("idx_flow_chunk_source").on(t.flowSourceId),
    sourceOrdIdx: uniqueIndex("uq_flow_chunk_source_ordinal").on(
      t.flowSourceId,
      t.ordinal
    ),
  })
);

// ============================================================
// 9. ChatSession — Consultor de Fluxos (RAG)
// ============================================================
export const chatSession = sqliteTable("chat_session", {
  id: uuid("id").primaryKey(),
  title: text("title").notNull(),
  userId: text("user_id").references(() => user.id),
  ...timestamps,
});

// ============================================================
// 10. ChatMessage — turno do chat com citações
// ============================================================
export type ChatRole = "user" | "assistant";
export type Citation = {
  flowSourceId: string;
  fileName: string;
  processName: string;
  score: number;
};

export const chatMessage = sqliteTable(
  "chat_message",
  {
    id: uuid("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => chatSession.id, { onDelete: "cascade" }),
    role: text("role").$type<ChatRole>().notNull(),
    content: text("content").notNull(),
    citations: text("citations", { mode: "json" }).$type<Citation[]>(),
    agentJobId: text("agent_job_id").references(() => agentJob.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    sessionIdx: index("idx_chat_message_session").on(t.sessionId),
  })
);

// ============================================================
// 11. GeneratedFlow — XML jPDL 3.2 gerado + lint
// ============================================================
export type ValidationResult = "PASSED" | "FAILED";
export type GeneratedFlowStatus = "DRAFT" | "APPROVED" | "REJECTED";

export type LintFinding = {
  code: string;
  severity: "ERROR" | "WARNING" | "INFO";
  message: string;
  nodeKey?: string;
};

export const generatedFlow = sqliteTable(
  "generated_flow",
  {
    id: uuid("id").primaryKey(),
    agentJobId: text("agent_job_id").references(() => agentJob.id),
    userStoryId: text("user_story_id").references(() => userStory.id),
    processName: text("process_name").notNull(),
    specification: text("specification").notNull(),
    xml: text("xml").notNull(),
    validationResult: text("validation_result").$type<ValidationResult>(),
    errorCount: integer("error_count").notNull().default(0),
    warningCount: integer("warning_count").notNull().default(0),
    infoCount: integer("info_count").notNull().default(0),
    findings: text("findings", { mode: "json" })
      .$type<LintFinding[]>()
      .notNull(),
    status: text("status")
      .$type<GeneratedFlowStatus>()
      .notNull()
      .default("DRAFT"),
    ...timestamps,
  },
  (t) => ({
    statusIdx: index("idx_generated_flow_status").on(t.status),
    resultIdx: index("idx_generated_flow_result").on(t.validationResult),
  })
);

// ============================================================
// 12. BpmnDiagram — diagrama BPMN 2.0 gerado + lint
// ============================================================
export const bpmnDiagram = sqliteTable(
  "bpmn_diagram",
  {
    id: uuid("id").primaryKey(),
    agentJobId: text("agent_job_id").references(() => agentJob.id),
    userStoryId: text("user_story_id").references(() => userStory.id),
    processName: text("process_name").notNull(),
    specification: text("specification").notNull(),
    bpmnXml: text("bpmn_xml").notNull(),
    validationResult: text("validation_result").$type<ValidationResult>(),
    errorCount: integer("error_count").notNull().default(0),
    warningCount: integer("warning_count").notNull().default(0),
    infoCount: integer("info_count").notNull().default(0),
    findings: text("findings", { mode: "json" })
      .$type<LintFinding[]>()
      .notNull(),
    status: text("status")
      .$type<GeneratedFlowStatus>()
      .notNull()
      .default("DRAFT"),
    ...timestamps,
  },
  (t) => ({
    statusIdx: index("idx_bpmn_diagram_status").on(t.status),
  })
);

// ============================================================
// 13. JiraCard — outbox para integração Jira
// ============================================================
export type JiraSourceType = "DEMAND_ANALYSIS" | "SPRINT";
export type JiraSyncStatus = "NOT_SYNCED" | "SYNCING" | "SYNCED" | "FAILED";

export const jiraCard = sqliteTable(
  "jira_card",
  {
    id: uuid("id").primaryKey(),
    sourceType: text("source_type").$type<JiraSourceType>().notNull(),
    sourceId: text("source_id").notNull(),
    sourceRef: text("source_ref").notNull(),
    issueType: text("issue_type").notNull(),
    summary: text("summary").notNull(),
    description: text("description").notNull(),
    issueKey: text("issue_key"),
    syncStatus: text("sync_status")
      .$type<JiraSyncStatus>()
      .notNull()
      .default("NOT_SYNCED"),
    agentJobId: text("agent_job_id").references(() => agentJob.id),
    ...timestamps,
  },
  (t) => ({
    uniqSource: uniqueIndex("uq_jira_card_source").on(
      t.sourceType,
      t.sourceId,
      t.sourceRef
    ),
    statusIdx: index("idx_jira_card_status").on(t.syncStatus),
  })
);

// ============================================================
// 14. JiraSyncOperation — histórico de sincronização
// ============================================================
export type JiraOperationType = "CREATE" | "TRANSITION" | "UPDATE";
export type JiraOperationStatus = "PENDING" | "COMPLETED" | "FAILED";

export const jiraSyncOperation = sqliteTable(
  "jira_sync_operation",
  {
    id: uuid("id").primaryKey(),
    jiraCardId: text("jira_card_id")
      .notNull()
      .references(() => jiraCard.id, { onDelete: "cascade" }),
    operationType: text("operation_type").$type<JiraOperationType>().notNull(),
    targetTransition: text("target_transition"),
    status: text("status")
      .$type<JiraOperationStatus>()
      .notNull()
      .default("PENDING"),
    attempts: integer("attempts").notNull().default(0),
    errorMessage: text("error_message"),
    ...timestamps,
  },
  (t) => ({
    cardIdx: index("idx_jira_sync_card").on(t.jiraCardId),
    statusIdx: index("idx_jira_sync_status").on(t.status),
  })
);

// ============================================================
// Helpers de tipo (exports nomeados)
// ============================================================
export type Demand = typeof demand.$inferSelect;
export type NewDemand = typeof demand.$inferInsert;
export type AgentJob = typeof agentJob.$inferSelect;
export type UserStory = typeof userStory.$inferSelect;
export type DemandAnalysis = typeof demandAnalysis.$inferSelect;
export type Sprint = typeof sprint.$inferSelect;
export type CeremonyRecord = typeof ceremonyRecord.$inferSelect;
export type FlowSource = typeof flowSource.$inferSelect;
export type FlowChunk = typeof flowChunk.$inferSelect;
export type ChatSession = typeof chatSession.$inferSelect;
export type ChatMessage = typeof chatMessage.$inferSelect;
export type GeneratedFlow = typeof generatedFlow.$inferSelect;
export type BpmnDiagram = typeof bpmnDiagram.$inferSelect;
export type JiraCard = typeof jiraCard.$inferSelect;
export type JiraSyncOperation = typeof jiraSyncOperation.$inferSelect;
