@echo off
setlocal
set "PATH=C:\Portatil\node-v24.14.1-win-x64;%PATH%"
set "WRANGLER=%~dp0node_modules\.bin\wrangler.cmd"

if exist "%~dp0.cf-token" (
    for /f "usebackq delims=" %%t in ("%~dp0.cf-token") do set "CLOUDFLARE_API_TOKEN=%%t"
)

echo === Tail dos logs do Worker em producao ===
echo  Acesse https://labdefluxos.com.br em outra aba pra gerar logs.
echo  Ctrl+C pra parar.
echo.
call "%WRANGLER%" tail lab-fluxos-demo --format pretty
endlocal
pause
