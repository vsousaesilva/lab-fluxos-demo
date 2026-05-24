@echo off
setlocal
set "PATH=C:\Portatil\node-v24.14.1-win-x64;%PATH%"
set "WRANGLER=%~dp0node_modules\.bin\wrangler.cmd"

if exist "%~dp0.cf-token" (
    for /f "usebackq delims=" %%t in ("%~dp0.cf-token") do set "CLOUDFLARE_API_TOKEN=%%t"
)

if not exist "%WRANGLER%" (
    echo [ERRO] wrangler nao encontrado. Rode _npm-install.cmd primeiro.
    pause
    exit /b 1
)

echo === Criando bucket R2 lab-fluxos-demand-attachments ===
call "%WRANGLER%" r2 bucket create lab-fluxos-demand-attachments

echo.
echo Pronto. Bucket criado (ou ja existia).
echo.
pause
endlocal
