@echo off
setlocal
set "PATH=C:\Portatil\node-v24.14.1-win-x64;%PATH%"
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

echo ============================================================
echo  RESET PIPELINE (D1 REMOTO - producao)
echo ============================================================
echo.
echo  Vai APAGAR (no D1 remoto, em https://labdefluxos.com.br):
echo    - demand
echo    - demand_analysis
echo    - user_story
echo    - sprint
echo    - ceremony_record
echo    - generated_flow
echo    - bpmn_diagram
echo    - jira_card
echo    - jira_sync_operation
echo.
echo  Preserva:
echo    - user / session / account / verification (better-auth)
echo    - agent_job (historico de IA)
echo    - flow_source / flow_chunk (RAG)
echo.
echo  ATENCAO: AcAo IRREVERSIVEL.
echo  Pressione Ctrl+C para cancelar, ou tecla para continuar.
echo.
pause

REM Confirmacao dupla
set /p CONFIRM="Digite RESET para confirmar: "
if /i NOT "%CONFIRM%"=="RESET" (
    echo Cancelado.
    pause
    exit /b 0
)

echo.
echo === Executando reset no D1 remoto ===
call "%WRANGLER%" d1 execute lab-fluxos --remote --file="%SQL%"

echo.
echo === Concluido (exit code: %ERRORLEVEL%) ===
endlocal
pause
