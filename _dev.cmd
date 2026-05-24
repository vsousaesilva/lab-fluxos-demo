@echo off
setlocal
set "NPM=C:\Portatil\node-v24.14.1-win-x64\npm.cmd"
set "PATH=C:\Portatil\node-v24.14.1-win-x64;%PATH%"
if exist "%~dp0.cf-token" (
    for /f "usebackq delims=" %%t in ("%~dp0.cf-token") do set "CLOUDFLARE_API_TOKEN=%%t"
)
echo === Iniciando Next.js em modo dev (http://localhost:3000) ===
call "%NPM%" run dev
echo.
echo === Encerrado (exit %ERRORLEVEL%) ===
pause
endlocal
