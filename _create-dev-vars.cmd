@echo off
setlocal
set "NODE=%~dp0..\..\Portatil\node-v24.14.1-win-x64\node.exe"
set "TMPSECRET=%TEMP%\labfluxos-authsecret.txt"

if not exist "%NODE%" (
    echo [ERRO] Node portatil nao encontrado em:
    echo   %NODE%
    pause
    exit /b 1
)

if exist "%~dp0.dev.vars" (
    echo .dev.vars ja existe. Para regerar, apague primeiro.
    pause
    exit /b 0
)

echo === Gerando BETTER_AUTH_SECRET (32 bytes random, base64) ===
"%NODE%" -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64'))" > "%TMPSECRET%"
if errorlevel 1 (
    echo [ERRO] Falha ao executar Node para gerar o secret.
    if exist "%TMPSECRET%" del "%TMPSECRET%"
    pause
    exit /b 1
)
set /p AUTH_SECRET=<"%TMPSECRET%"
del "%TMPSECRET%"

if "%AUTH_SECRET%"=="" (
    echo [ERRO] Secret veio vazio. Abortando.
    pause
    exit /b 1
)

echo === Criando .dev.vars ===
(
  echo # Variaveis para `wrangler dev` / Next dev local.
  echo # NAO faca commit deste arquivo.
  echo.
  echo BETTER_AUTH_SECRET="%AUTH_SECRET%"
  echo BETTER_AUTH_URL="http://localhost:3000"
  echo.
  echo # Cole sua chave do Gemini abaixo
  echo # https://aistudio.google.com/app/apikey
  echo GOOGLE_GENERATIVE_AI_API_KEY=""
  echo.
  echo # Jira ^(Fase 5 - opcional^)
  echo JIRA_BASE_URL=""
  echo JIRA_EMAIL=""
  echo JIRA_API_TOKEN=""
  echo JIRA_PROJECT_KEY=""
) > "%~dp0.dev.vars"

echo.
echo === .dev.vars criado ===
echo  BETTER_AUTH_SECRET gerado.
echo  Edite manualmente .dev.vars e cole sua GOOGLE_GENERATIVE_AI_API_KEY.
echo.
endlocal
pause
