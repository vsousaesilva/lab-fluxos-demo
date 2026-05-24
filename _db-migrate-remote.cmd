@echo off
setlocal
set "PATH=C:\Portatil\node-v24.14.1-win-x64;%PATH%"
set "WRANGLER=%~dp0node_modules\.bin\wrangler.cmd"
if exist "%~dp0.cf-token" (
    for /f "usebackq delims=" %%t in ("%~dp0.cf-token") do set "CLOUDFLARE_API_TOKEN=%%t"
)
echo === Aplicando migrations no D1 REMOTO ===
call "%WRANGLER%" d1 migrations apply lab-fluxos --remote
endlocal
pause
