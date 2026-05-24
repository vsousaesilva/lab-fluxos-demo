@echo off
setlocal
set "NPM=%~dp0..\..\Portatil\node-v24.14.1-win-x64\npm.cmd"
set "PATH=%~dp0..\..\Portatil\node-v24.14.1-win-x64;%PATH%"

echo ============================================================
echo  Ingestao dos XMLs do PJe para Cloudflare (D1 + R2 + Vectorize)
echo ============================================================
echo  Le .cf-token e .dev.vars automaticamente.
echo  Pode demorar 10-15 min para 100+ arquivos.
echo ============================================================
echo.

call "%NPM%" run ingest:flows
echo.
echo === Exit code: %ERRORLEVEL% ===
endlocal
pause
