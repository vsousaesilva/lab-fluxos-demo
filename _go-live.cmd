@echo off
REM ============================================================
REM  _go-live.cmd
REM
REM  Prepara a aplicacao para INICIO DE OPERACAO REAL.
REM
REM   1) Backup completo do D1 remoto em _backup-YYYYMMDD-HHMM.sql
REM   2) Limpa o bucket R2 lab-fluxos-demand-attachments (arquivos teste)
REM   3) Executa reset_pipeline.sql no D1 remoto:
REM        - apaga demandas/anexos/analises/HUs/sprints/cerimonias/
REM          fluxos gerados/BPMNs/jira/chats
REM        - preserva users/invites/agent_jobs/flow_source/ELs
REM   4) Mostra contagens pos-reset pra confirmar
REM
REM  Acao IRREVERSIVEL (mas tem backup local).
REM ============================================================
setlocal EnableDelayedExpansion

set "PORTATIL=C:\Portatil"
set "PATH=%PORTATIL%\node-v24.14.1-win-x64;%PATH%"
set "WRANGLER=%~dp0node_modules\.bin\wrangler.cmd"
set "SQL=%~dp0drizzle\queries\reset_pipeline.sql"

if exist "%~dp0.cf-token" (
    for /f "usebackq delims=" %%t in ("%~dp0.cf-token") do set "CLOUDFLARE_API_TOKEN=%%t"
)

if not exist "%WRANGLER%" (
    echo [ERRO] wrangler nao encontrado em %WRANGLER%
    pause
    exit /b 1
)
if not exist "%SQL%" (
    echo [ERRO] SQL nao encontrado em %SQL%
    pause
    exit /b 1
)

REM Timestamp pra backup
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set "DT=%%I"
set "STAMP=%DT:~0,8%-%DT:~8,4%"
set "BACKUP=%~dp0_backup-%STAMP%.sql"

echo ============================================================
echo  GO-LIVE - reset pra inicio de operacao
echo ============================================================
echo.
echo  Vai executar (NESTA ORDEM):
echo    1) Backup D1 remoto      -^> %BACKUP%
echo    2) Limpar bucket R2 demand-attachments
echo    3) reset_pipeline.sql no D1 remoto
echo    4) Contagens pos-reset
echo.
echo  PRESERVA: users, invites, agent_jobs, flow_source/chunk,
echo            expression_language(_occurrence), Vectorize, R2 xmls.
echo.
echo  APAGA: demand, demand_attachment, demand_analysis,
echo         user_story, sprint, ceremony_record,
echo         generated_flow, bpmn_diagram, jira_*,
echo         chat_session, chat_message,
echo         + arquivos no R2 demand-attachments
echo.
echo  ATENCAO: AcAo IRREVERSIVEL (mas o backup local cobre o D1).
echo ============================================================
echo.
set /p CONFIRM="Digite GO-LIVE (em maiusculo) para prosseguir: "
if /i NOT "%CONFIRM%"=="GO-LIVE" (
    echo Cancelado.
    pause
    exit /b 0
)

echo.
echo === 1/4 Backup D1 remoto ===
call "%WRANGLER%" d1 export lab-fluxos --remote --output="%BACKUP%"
if errorlevel 1 (
    echo [ERRO] Backup falhou. Abortando.
    pause
    exit /b 1
)
echo [OK] Backup salvo em %BACKUP%
echo.

echo === 2/4 Limpar bucket R2 demand-attachments ===
echo Listando objetos...
set "TMPLIST=%TEMP%\r2-list-%STAMP%.txt"
call "%WRANGLER%" r2 object list lab-fluxos-demand-attachments > "%TMPLIST%" 2>&1
if errorlevel 1 (
    echo [AVISO] Falha ao listar R2. Pulando limpeza R2 ^(bucket pode estar vazio^).
    echo.
    goto :SKIP_R2
)

set "DELETED=0"
for /f "skip=1 tokens=1" %%K in (%TMPLIST%) do (
    if not "%%K"=="" (
        call "%WRANGLER%" r2 object delete lab-fluxos-demand-attachments/%%K >nul 2>&1
        set /a DELETED+=1
        if !DELETED! LSS 10 echo  - removido: %%K
    )
)
echo [OK] !DELETED! objeto(s) removido(s) do R2.
del "%TMPLIST%" >nul 2>&1

:SKIP_R2
echo.

echo === 3/4 reset_pipeline.sql no D1 remoto ===
call "%WRANGLER%" d1 execute lab-fluxos --remote --file="%SQL%"
if errorlevel 1 (
    echo [ERRO] Reset SQL falhou.
    pause
    exit /b 1
)
echo [OK] Reset executado.
echo.

echo === 4/4 Contagens pos-reset ===
echo (D1 limita UNION ALL a ~7 terms; usamos batches menores)
echo.
echo --- Tabelas zeradas (parte 1) ---
call "%WRANGLER%" d1 execute lab-fluxos --remote --command="SELECT 'demand' AS tabela, COUNT(*) AS n FROM demand UNION ALL SELECT 'demand_analysis', COUNT(*) FROM demand_analysis UNION ALL SELECT 'user_story', COUNT(*) FROM user_story UNION ALL SELECT 'sprint', COUNT(*) FROM sprint UNION ALL SELECT 'ceremony_record', COUNT(*) FROM ceremony_record;"

echo --- Tabelas zeradas (parte 2) ---
call "%WRANGLER%" d1 execute lab-fluxos --remote --command="SELECT 'generated_flow' AS tabela, COUNT(*) AS n FROM generated_flow UNION ALL SELECT 'bpmn_diagram', COUNT(*) FROM bpmn_diagram UNION ALL SELECT 'jira_card', COUNT(*) FROM jira_card UNION ALL SELECT 'demand_attachment', COUNT(*) FROM demand_attachment UNION ALL SELECT 'chat_session', COUNT(*) FROM chat_session;"

echo.
echo --- Tabelas preservadas (parte 1) ---
call "%WRANGLER%" d1 execute lab-fluxos --remote --command="SELECT 'user' AS tabela, COUNT(*) AS n FROM user UNION ALL SELECT 'invite', COUNT(*) FROM invite UNION ALL SELECT 'agent_job', COUNT(*) FROM agent_job;"

echo --- Tabelas preservadas (parte 2) ---
call "%WRANGLER%" d1 execute lab-fluxos --remote --command="SELECT 'flow_source' AS tabela, COUNT(*) AS n FROM flow_source UNION ALL SELECT 'flow_chunk', COUNT(*) FROM flow_chunk UNION ALL SELECT 'expression_language', COUNT(*) FROM expression_language UNION ALL SELECT 'expression_language_occurrence', COUNT(*) FROM expression_language_occurrence;"

echo.
echo ============================================================
echo  GO-LIVE CONCLUIDO
echo ============================================================
echo  Backup       : %BACKUP%
echo  Producao     : https://labdefluxos.com.br
echo  Proximo passo: criar a primeira demanda real no painel.
echo ============================================================
endlocal
pause
