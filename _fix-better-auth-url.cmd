@echo off
setlocal
set "PATH=C:\Portatil\node-v24.14.1-win-x64;%PATH%"
set "WRANGLER=%~dp0node_modules\.bin\wrangler.cmd"

if exist "%~dp0.cf-token" (
    for /f "usebackq delims=" %%t in ("%~dp0.cf-token") do set "CLOUDFLARE_API_TOKEN=%%t"
)

echo === Recadastrando BETTER_AUTH_URL ===
echo.
echo  Quando pedir o valor, COLE EXATAMENTE:
echo.
echo    https://labdefluxos.com.br
echo.
echo  (sem espacos, sem aspas, sem barra no final)
echo.
pause

call "%WRANGLER%" secret put BETTER_AUTH_URL

echo.
echo === Secret atualizado. Worker vai recarregar automaticamente. ===
echo Teste novamente em https://labdefluxos.com.br
endlocal
pause
