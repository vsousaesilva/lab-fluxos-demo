@echo off
REM Mostra contagens das tabelas no D1 remoto (em batches que respeitam
REM o limite ~7 UNION ALL do D1).
setlocal
set "PATH=C:\Portatil\node-v24.14.1-win-x64;%PATH%"
set "WRANGLER=%~dp0node_modules\.bin\wrangler.cmd"
if exist "%~dp0.cf-token" (
    for /f "usebackq delims=" %%t in ("%~dp0.cf-token") do set "CLOUDFLARE_API_TOKEN=%%t"
)

echo === Pipeline (deve estar zerado pos go-live) ===
echo.
call "%WRANGLER%" d1 execute lab-fluxos --remote --command="SELECT 'demand' AS tabela, COUNT(*) AS n FROM demand UNION ALL SELECT 'demand_analysis', COUNT(*) FROM demand_analysis UNION ALL SELECT 'user_story', COUNT(*) FROM user_story UNION ALL SELECT 'sprint', COUNT(*) FROM sprint UNION ALL SELECT 'ceremony_record', COUNT(*) FROM ceremony_record;"
echo.
call "%WRANGLER%" d1 execute lab-fluxos --remote --command="SELECT 'generated_flow' AS tabela, COUNT(*) AS n FROM generated_flow UNION ALL SELECT 'bpmn_diagram', COUNT(*) FROM bpmn_diagram UNION ALL SELECT 'jira_card', COUNT(*) FROM jira_card UNION ALL SELECT 'demand_attachment', COUNT(*) FROM demand_attachment UNION ALL SELECT 'chat_session', COUNT(*) FROM chat_session;"

echo.
echo === Preservados (devem ter dados) ===
echo.
call "%WRANGLER%" d1 execute lab-fluxos --remote --command="SELECT 'user' AS tabela, COUNT(*) AS n FROM user UNION ALL SELECT 'invite', COUNT(*) FROM invite UNION ALL SELECT 'agent_job', COUNT(*) FROM agent_job;"
echo.
call "%WRANGLER%" d1 execute lab-fluxos --remote --command="SELECT 'flow_source' AS tabela, COUNT(*) AS n FROM flow_source UNION ALL SELECT 'flow_chunk', COUNT(*) FROM flow_chunk UNION ALL SELECT 'expression_language', COUNT(*) FROM expression_language UNION ALL SELECT 'expression_language_occurrence', COUNT(*) FROM expression_language_occurrence;"

echo.
pause
endlocal
