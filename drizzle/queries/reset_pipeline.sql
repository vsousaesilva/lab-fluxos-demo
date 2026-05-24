-- Reset de dados de pipeline.
-- Apaga: jira_sync_operation, jira_card, bpmn_diagram, generated_flow,
--        ceremony_record, sprint, user_story, demand_analysis,
--        demand_attachment, demand, chat_message, chat_session
-- Preserva: user, session, account, verification (better-auth)
--           invite (códigos já gerados)
--           agent_job (histórico de uso de IA e custo)
--           flow_source, flow_chunk (RAG dos 212 XMLs)
--           expression_language, expression_language_occurrence (2.7k ELs)
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
DELETE FROM demand_attachment;
DELETE FROM demand;
DELETE FROM chat_message;
DELETE FROM chat_session;
