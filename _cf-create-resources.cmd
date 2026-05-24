@echo off
setlocal enabledelayedexpansion
set "NPM=%~dp0..\..\Portatil\node-v24.14.1-win-x64\npm.cmd"
set "PATH=%~dp0..\..\Portatil\node-v24.14.1-win-x64;%PATH%"
set "LOG=%~dp0_cf-create-resources.log"

if exist "%~dp0.cf-token" (
    for /f "usebackq delims=" %%t in ("%~dp0.cf-token") do set "CLOUDFLARE_API_TOKEN=%%t"
    echo Usando API token de .cf-token.
) else (
    echo [ERRO] .cf-token nao encontrado.
    pause
    exit /b 1
)

echo ============================================================
echo  Criando recursos Cloudflare para lab-fluxos-demo
echo  Log completo: %LOG%
echo ============================================================
echo.

REM apaga log anterior
if exist "%LOG%" del "%LOG%"

echo === 1/5 D1 'lab-fluxos' ===
call "%NPM%" exec wrangler d1 create lab-fluxos > "%LOG%" 2>&1
type "%LOG%"
echo.
pause

echo === 2/5 KV namespace 'SESSIONS' ===
call "%NPM%" exec wrangler kv namespace create SESSIONS > "%LOG%" 2>&1
type "%LOG%"
echo.
pause

echo === 3/5 R2 bucket 'lab-fluxos-xmls' ===
call "%NPM%" exec wrangler r2 bucket create lab-fluxos-xmls > "%LOG%" 2>&1
type "%LOG%"
echo.
pause

echo === 4/5 Vectorize 'lab-fluxos-flows' (768d, cosine) ===
call "%~dp0node_modules\.bin\wrangler.cmd" vectorize create lab-fluxos-flows --dimensions=768 --metric=cosine > "%LOG%" 2>&1
type "%LOG%"
echo.
pause

echo === 5/5 Queue 'lab-fluxos-ingest' ===
call "%NPM%" exec wrangler queues create lab-fluxos-ingest > "%LOG%" 2>&1
type "%LOG%"
echo.
pause

if exist "%LOG%" del "%LOG%"

echo ============================================================
echo  Concluido. Anote no wrangler.toml:
echo    - database_id (D1)
echo    - id (KV namespace SESSIONS)
echo ============================================================
endlocal
pause
