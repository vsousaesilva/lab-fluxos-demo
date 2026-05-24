@echo off
setlocal
set "PATH=%~dp0..\..\Portatil\node-v24.14.1-win-x64;%PATH%"
set "WRANGLER=%~dp0node_modules\.bin\wrangler.cmd"

if exist "%~dp0.cf-token" (
    for /f "usebackq delims=" %%t in ("%~dp0.cf-token") do set "CLOUDFLARE_API_TOKEN=%%t"
)

if not exist "%WRANGLER%" (
    echo [ERRO] wrangler nao encontrado em %WRANGLER%
    pause
    exit /b 1
)

echo ============================================================
echo  Definir ADMIN_EMAILS em PRODUCAO
echo ============================================================
echo  Vai pedir o VALOR (entrada interativa).
echo  Cole: vsousaesilva@jfce.jus.br
echo  (varios admins: separar por virgula, ex.: a@x.com,b@y.com)
echo ============================================================
echo.

call "%WRANGLER%" secret put ADMIN_EMAILS

echo.
echo Pronto. Apos cadastrar, rode _deploy.cmd para o Worker recarregar.
endlocal
pause
