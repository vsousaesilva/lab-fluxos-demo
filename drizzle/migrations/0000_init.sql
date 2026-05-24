-- ============================================================
-- Laboratório de Fluxos — schema inicial (D1 / SQLite)
-- Port das migrations V1..V12 do projeto Spring Boot original.
-- Embeddings vivem em Cloudflare Vectorize (não em D1).
-- ============================================================

-- ============================================================
-- better-auth
-- ============================================================
CREATE TABLE `user` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `name` TEXT NOT NULL,
    `email` TEXT NOT NULL UNIQUE,
    `email_verified` INTEGER NOT NULL DEFAULT 0,
    `image` TEXT,
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL
);

CREATE TABLE `session` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `expires_at` INTEGER NOT NULL,
    `token` TEXT NOT NULL UNIQUE,
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL,
    `ip_address` TEXT,
    `user_agent` TEXT,
    `user_id` TEXT NOT NULL,
    FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);

CREATE TABLE `account` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `account_id` TEXT NOT NULL,
    `provider_id` TEXT NOT NULL,
    `user_id` TEXT NOT NULL,
    `access_token` TEXT,
    `refresh_token` TEXT,
    `id_token` TEXT,
    `access_token_expires_at` INTEGER,
    `refresh_token_expires_at` INTEGER,
    `scope` TEXT,
    `password` TEXT,
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL,
    FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);

CREATE TABLE `verification` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `identifier` TEXT NOT NULL,
    `value` TEXT NOT NULL,
    `expires_at` INTEGER NOT NULL,
    `created_at` INTEGER,
    `updated_at` INTEGER
);

-- ============================================================
-- 1. demand
-- ============================================================
CREATE TABLE `demand` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `title` TEXT NOT NULL,
    `description` TEXT NOT NULL,
    `requester_name` TEXT NOT NULL,
    `status` TEXT NOT NULL DEFAULT 'REGISTERED',
    `created_by` TEXT,
    `updated_by` TEXT,
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL
);
CREATE INDEX `idx_demand_status` ON `demand` (`status`);

-- ============================================================
-- 2. agent_job
-- ============================================================
CREATE TABLE `agent_job` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `agent_type` TEXT NOT NULL,
    `status` TEXT NOT NULL DEFAULT 'PENDING',
    `input_summary` TEXT,
    `output_summary` TEXT,
    `llm_provider` TEXT,
    `llm_model` TEXT,
    `prompt_tokens` INTEGER NOT NULL DEFAULT 0,
    `completion_tokens` INTEGER NOT NULL DEFAULT 0,
    `started_at` INTEGER,
    `finished_at` INTEGER,
    `error_message` TEXT,
    `created_by` TEXT,
    `updated_by` TEXT,
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL
);
CREATE INDEX `idx_agent_job_type` ON `agent_job` (`agent_type`);
CREATE INDEX `idx_agent_job_status` ON `agent_job` (`status`);

-- ============================================================
-- 3. user_story
-- ============================================================
CREATE TABLE `user_story` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `demand_id` TEXT NOT NULL,
    `agent_job_id` TEXT,
    `title` TEXT NOT NULL,
    `as_a` TEXT NOT NULL,
    `i_want` TEXT NOT NULL,
    `so_that` TEXT NOT NULL,
    `scenarios` TEXT NOT NULL,
    `business_rules` TEXT NOT NULL,
    `references` TEXT,
    `status` TEXT NOT NULL DEFAULT 'DRAFT',
    `created_by` TEXT,
    `updated_by` TEXT,
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL,
    FOREIGN KEY (`demand_id`) REFERENCES `demand`(`id`),
    FOREIGN KEY (`agent_job_id`) REFERENCES `agent_job`(`id`)
);
CREATE INDEX `idx_user_story_demand` ON `user_story` (`demand_id`);
CREATE INDEX `idx_user_story_status` ON `user_story` (`status`);

-- ============================================================
-- 4. demand_analysis
-- ============================================================
CREATE TABLE `demand_analysis` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `demand_id` TEXT NOT NULL,
    `agent_job_id` TEXT,
    `summary` TEXT NOT NULL,
    `objectives` TEXT NOT NULL,
    `impacted_teams` TEXT NOT NULL,
    `assumptions` TEXT NOT NULL,
    `risks` TEXT NOT NULL,
    `open_questions` TEXT NOT NULL,
    `backlog_items` TEXT NOT NULL,
    `status` TEXT NOT NULL DEFAULT 'DRAFT',
    `created_by` TEXT,
    `updated_by` TEXT,
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL,
    FOREIGN KEY (`demand_id`) REFERENCES `demand`(`id`),
    FOREIGN KEY (`agent_job_id`) REFERENCES `agent_job`(`id`)
);
CREATE INDEX `idx_demand_analysis_demand` ON `demand_analysis` (`demand_id`);
CREATE INDEX `idx_demand_analysis_status` ON `demand_analysis` (`status`);

-- ============================================================
-- 5. sprint
-- ============================================================
CREATE TABLE `sprint` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `agent_job_id` TEXT,
    `name` TEXT NOT NULL,
    `goal` TEXT NOT NULL,
    `weeks` INTEGER NOT NULL,
    `capacity_notes` TEXT,
    `items` TEXT NOT NULL,
    `out_of_scope` TEXT NOT NULL,
    `risks` TEXT NOT NULL,
    `definition_of_done` TEXT NOT NULL,
    `status` TEXT NOT NULL DEFAULT 'PROPOSED',
    `created_by` TEXT,
    `updated_by` TEXT,
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL,
    FOREIGN KEY (`agent_job_id`) REFERENCES `agent_job`(`id`)
);
CREATE INDEX `idx_sprint_status` ON `sprint` (`status`);

-- ============================================================
-- 6. ceremony_record
-- ============================================================
CREATE TABLE `ceremony_record` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `agent_job_id` TEXT,
    `sprint_id` TEXT,
    `ceremony_type` TEXT NOT NULL,
    `title` TEXT NOT NULL,
    `occurred_on` TEXT NOT NULL,
    `summary` TEXT NOT NULL,
    `participants` TEXT NOT NULL,
    `sections` TEXT NOT NULL,
    `action_items` TEXT NOT NULL,
    `status` TEXT NOT NULL DEFAULT 'DRAFT',
    `created_by` TEXT,
    `updated_by` TEXT,
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL,
    FOREIGN KEY (`agent_job_id`) REFERENCES `agent_job`(`id`),
    FOREIGN KEY (`sprint_id`) REFERENCES `sprint`(`id`)
);
CREATE INDEX `idx_ceremony_type` ON `ceremony_record` (`ceremony_type`);
CREATE INDEX `idx_ceremony_status` ON `ceremony_record` (`status`);

-- ============================================================
-- 7. flow_source
-- ============================================================
CREATE TABLE `flow_source` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `file_path` TEXT NOT NULL UNIQUE,
    `file_name` TEXT NOT NULL,
    `content_hash` TEXT NOT NULL,
    `process_name` TEXT NOT NULL,
    `dialect` TEXT NOT NULL,
    `chunk_count` INTEGER NOT NULL DEFAULT 0,
    `status` TEXT NOT NULL,
    `error_message` TEXT,
    `indexed_at` INTEGER,
    `r2_key` TEXT,
    `created_by` TEXT,
    `updated_by` TEXT,
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL
);
CREATE INDEX `idx_flow_source_status` ON `flow_source` (`status`);
CREATE INDEX `idx_flow_source_name` ON `flow_source` (`process_name`);

-- ============================================================
-- 8. flow_chunk (embeddings em Vectorize)
-- ============================================================
CREATE TABLE `flow_chunk` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `flow_source_id` TEXT NOT NULL,
    `ordinal` INTEGER NOT NULL,
    `content` TEXT NOT NULL,
    `created_at` INTEGER NOT NULL,
    FOREIGN KEY (`flow_source_id`) REFERENCES `flow_source`(`id`) ON DELETE CASCADE
);
CREATE INDEX `idx_flow_chunk_source` ON `flow_chunk` (`flow_source_id`);
CREATE UNIQUE INDEX `uq_flow_chunk_source_ordinal` ON `flow_chunk` (`flow_source_id`, `ordinal`);

-- ============================================================
-- 9. chat_session
-- ============================================================
CREATE TABLE `chat_session` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `title` TEXT NOT NULL,
    `user_id` TEXT,
    `created_by` TEXT,
    `updated_by` TEXT,
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL,
    FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
);

-- ============================================================
-- 10. chat_message
-- ============================================================
CREATE TABLE `chat_message` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `session_id` TEXT NOT NULL,
    `role` TEXT NOT NULL,
    `content` TEXT NOT NULL,
    `citations` TEXT,
    `agent_job_id` TEXT,
    `created_at` INTEGER NOT NULL,
    FOREIGN KEY (`session_id`) REFERENCES `chat_session`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`agent_job_id`) REFERENCES `agent_job`(`id`)
);
CREATE INDEX `idx_chat_message_session` ON `chat_message` (`session_id`);

-- ============================================================
-- 11. generated_flow (jPDL 3.2)
-- ============================================================
CREATE TABLE `generated_flow` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `agent_job_id` TEXT,
    `user_story_id` TEXT,
    `process_name` TEXT NOT NULL,
    `specification` TEXT NOT NULL,
    `xml` TEXT NOT NULL,
    `validation_result` TEXT,
    `error_count` INTEGER NOT NULL DEFAULT 0,
    `warning_count` INTEGER NOT NULL DEFAULT 0,
    `info_count` INTEGER NOT NULL DEFAULT 0,
    `findings` TEXT NOT NULL,
    `status` TEXT NOT NULL DEFAULT 'DRAFT',
    `created_by` TEXT,
    `updated_by` TEXT,
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL,
    FOREIGN KEY (`agent_job_id`) REFERENCES `agent_job`(`id`),
    FOREIGN KEY (`user_story_id`) REFERENCES `user_story`(`id`)
);
CREATE INDEX `idx_generated_flow_status` ON `generated_flow` (`status`);
CREATE INDEX `idx_generated_flow_result` ON `generated_flow` (`validation_result`);

-- ============================================================
-- 12. bpmn_diagram (BPMN 2.0)
-- ============================================================
CREATE TABLE `bpmn_diagram` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `agent_job_id` TEXT,
    `user_story_id` TEXT,
    `process_name` TEXT NOT NULL,
    `specification` TEXT NOT NULL,
    `bpmn_xml` TEXT NOT NULL,
    `validation_result` TEXT,
    `error_count` INTEGER NOT NULL DEFAULT 0,
    `warning_count` INTEGER NOT NULL DEFAULT 0,
    `info_count` INTEGER NOT NULL DEFAULT 0,
    `findings` TEXT NOT NULL,
    `status` TEXT NOT NULL DEFAULT 'DRAFT',
    `created_by` TEXT,
    `updated_by` TEXT,
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL,
    FOREIGN KEY (`agent_job_id`) REFERENCES `agent_job`(`id`),
    FOREIGN KEY (`user_story_id`) REFERENCES `user_story`(`id`)
);
CREATE INDEX `idx_bpmn_diagram_status` ON `bpmn_diagram` (`status`);

-- ============================================================
-- 13. jira_card (outbox)
-- ============================================================
CREATE TABLE `jira_card` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `source_type` TEXT NOT NULL,
    `source_id` TEXT NOT NULL,
    `source_ref` TEXT NOT NULL,
    `issue_type` TEXT NOT NULL,
    `summary` TEXT NOT NULL,
    `description` TEXT NOT NULL,
    `issue_key` TEXT,
    `sync_status` TEXT NOT NULL DEFAULT 'NOT_SYNCED',
    `agent_job_id` TEXT,
    `created_by` TEXT,
    `updated_by` TEXT,
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL,
    FOREIGN KEY (`agent_job_id`) REFERENCES `agent_job`(`id`)
);
CREATE UNIQUE INDEX `uq_jira_card_source` ON `jira_card` (`source_type`, `source_id`, `source_ref`);
CREATE INDEX `idx_jira_card_status` ON `jira_card` (`sync_status`);

-- ============================================================
-- 14. jira_sync_operation
-- ============================================================
CREATE TABLE `jira_sync_operation` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `jira_card_id` TEXT NOT NULL,
    `operation_type` TEXT NOT NULL,
    `target_transition` TEXT,
    `status` TEXT NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `error_message` TEXT,
    `created_by` TEXT,
    `updated_by` TEXT,
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL,
    FOREIGN KEY (`jira_card_id`) REFERENCES `jira_card`(`id`) ON DELETE CASCADE
);
CREATE INDEX `idx_jira_sync_card` ON `jira_sync_operation` (`jira_card_id`);
CREATE INDEX `idx_jira_sync_status` ON `jira_sync_operation` (`status`);
