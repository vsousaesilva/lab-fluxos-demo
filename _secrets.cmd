@echo off
setlocal
set "PATH=%~dp0..\..\Portatil\node-v24.14.1-win-x64;%PATH%"
set "WRANGLER=%~dp0node_modules\.bin\wrangler.cmd"

if exist "%~dp0.cf-token" (
    for /f "usebackq delims=" %%t in ("%~dp0.cf-token") do set "CLOUDFLARE_API_TOKEN=%%t"
)

if not exist "%WRANGLER%" (
    echo [ERRO] wrangler nao encontrado em %WRANGLER%
    echo Rode _npm-install.cmd primeiro.
    pause
    exit /b 1
)

echo ============================================================
echo  Definir secrets em PRODUCAO (Cloudflare Workers)
echo ============================================================
echo  Cada comando vai pedir o VALOR do secret (entrada interativa).
echo  Pressione Ctrl+C para cancelar a qualquer momento.
echo ============================================================
echo.

echo --- 1/3 BETTER_AUTH_SECRET ---
echo  Gere com: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
call "%WRANGLER%" secret put BETTER_AUTH_SECRET
echo.

echo --- 2/3 BETTER_AUTH_URL ---
echo  Cole: https://labdefluxos.com.br
call "%WRANGLER%" secret put BETTER_AUTH_URL
echo.

echo --- 3/3 GOOGLE_GENERATIVE_AI_API_KEY ---
echo  De https://aistudio.google.com/app/apikey
call "%WRANGLER%" secret put GOOGLE_GENERATIVE_AI_API_KEY
echo.

echo ============================================================
echo  Secrets Jira (opcional - pule com Ctrl+C se nao usa Jira)
echo ============================================================
echo.

echo --- JIRA_BASE_URL (ex.: https://acme.atlassian.net) ---
call "%WRANGLER%" secret put JIRA_BASE_URL
echo.

echo --- JIRA_EMAIL ---
call "%WRANGLER%" secret put JIRA_EMAIL
echo.

echo --- JIRA_API_TOKEN (de https://id.atlassian.com/manage-profile/security/api-tokens) ---
call "%WRANGLER%" secret put JIRA_API_TOKEN
echo.

echo --- JIRA_PROJECT_KEY (ex.: LAB) ---
call "%WRANGLER%" secret put JIRA_PROJECT_KEY
echo.

echo ============================================================
echo  Pronto. Confira em: https://dash.cloudflare.com/^?to=/:account/workers/services
echo ============================================================
endlocal
pause
