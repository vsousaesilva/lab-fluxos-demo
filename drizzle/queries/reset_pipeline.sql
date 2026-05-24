-- Reset de dados de pipeline.
-- Apaga: jira_sync_operation, jira_card, bpmn_diagram, generated_flow,
--        ceremony_record, sprint, user_story, demand_analysis, demand
-- Preserva: user, session, account, verification (better-auth)
--           agent_job (histórico de uso de IA)
--           flow_source, flow_chunk (RAG dos 212 XMLs)
--
-- A ordem respeita FKs (filhos antes de pais).

DELETE FROM jira_sync_operation;
DELETE FROM jira_card;
DELETE FROM bpmn_diagram;
DELETE FROM generated_flow;
DELETE FROM ceremony_record;
DELETE FROM sprint;
DELETE FROM user_story;
DELETE FROM demand_analysis;
DELETE FROM demand;
