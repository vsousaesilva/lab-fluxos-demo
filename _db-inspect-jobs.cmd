@echo off
setlocal
set "PATH=%~dp0..\..\Portatil\node-v24.14.1-win-x64;%PATH%"
set "WRANGLER=%~dp0node_modules\.bin\wrangler.cmd"
set "SQLFILE=%TEMP%\labfluxos-inspect.sql"

if not exist "%WRANGLER%" (
    echo [ERRO] wrangler nao encontrado em:
    echo   %WRANGLER%
    echo Rode _npm-install.cmd primeiro.
    pause
    exit /b 1
)

echo === Ultimos 5 agent_job (D1 local) ===
> "%SQLFILE%" echo SELECT id, agent_type, status, llm_model, prompt_tokens, completion_tokens, output_summary, substr(error_message, 1, 200) as error, started_at, finished_at FROM agent_job ORDER BY started_at DESC LIMIT 5;
call "%WRANGLER%" d1 execute lab-fluxos --local --file="%SQLFILE%"

echo.
echo === Ultimas 3 demand_analysis (D1 local) ===
> "%SQLFILE%" echo SELECT id, demand_id, status, substr(summary, 1, 100) as summary, json_array_length(backlog_items) as backlog_count, created_at FROM demand_analysis ORDER BY created_at DESC LIMIT 3;
call "%WRANGLER%" d1 execute lab-fluxos --local --file="%SQLFILE%"

del "%SQLFILE%" 2>nul
endlocal
pause
