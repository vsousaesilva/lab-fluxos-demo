@echo off
setlocal
set "PATH=%~dp0..\..\Portatil\node-v24.14.1-win-x64;%PATH%"
set "WRANGLER=%~dp0node_modules\.bin\wrangler.cmd"
set "LOG=%~dp0_cf-create-remaining.log"

if exist "%~dp0.cf-token" (
    for /f "usebackq delims=" %%t in ("%~dp0.cf-token") do set "CLOUDFLARE_API_TOKEN=%%t"
) else (
    echo [ERRO] .cf-token nao encontrado.
    pause
    exit /b 1
)

if not exist "%WRANGLER%" (
    echo [ERRO] wrangler nao encontrado em %WRANGLER%
    echo Rode _npm-install.cmd primeiro.
    pause
    exit /b 1
)

if exist "%LOG%" del "%LOG%"

echo === Vectorize 'lab-fluxos-flows' (768d, cosine) ===
call "%WRANGLER%" vectorize create lab-fluxos-flows --dimensions=768 --metric=cosine > "%LOG%" 2>&1
type "%LOG%"
echo.
pause

echo === Queue 'lab-fluxos-ingest' ===
call "%WRANGLER%" queues create lab-fluxos-ingest > "%LOG%" 2>&1
type "%LOG%"
echo.
pause

if exist "%LOG%" del "%LOG%"
endlocal
pause
