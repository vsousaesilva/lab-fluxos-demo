@echo off
setlocal
set "GIT=C:\Portatil\PortableGit\cmd\git.exe"
set "REPO_URL=https://github.com/vsousaesilva/lab-fluxos-demo.git"

if not exist "%GIT%" (
    echo [ERRO] Git portatil nao encontrado em:
    echo   %GIT%
    pause
    exit /b 1
)

cd /d "%~dp0"

echo ============================================================
echo  Init + primeiro commit + push para GitHub
echo  Repo: %REPO_URL%
echo ============================================================
echo.

if exist ".git" (
    echo [OK] Repo ja inicializado, pulando 'git init'.
) else (
    echo --- git init ---
    "%GIT%" init
    if errorlevel 1 goto :erro
    echo.
)

echo --- git config user ---
"%GIT%" config user.name "vsousaesilva"
"%GIT%" config user.email "vsousaesilva@jfce.jus.br"
echo.

echo --- branch main ---
"%GIT%" branch -M main
echo.

echo --- git add . ---
"%GIT%" add .
if errorlevel 1 goto :erro
echo.

echo --- status (preview do que vai entrar) ---
"%GIT%" status --short
echo.

echo --- git commit ---
"%GIT%" commit -m "feat: lab-fluxos-demo - pipeline multi-agente PJe completo" -m "Reescrita do lab-fluxos JFCE em stack Cloudflare-native:" -m "- Next.js 15 + Workers + D1 + Vectorize + R2 + Queues" -m "- better-auth (signup com codigo de convite, admin whitelist)" -m "- 9 agentes IA (Gemini 3): Demand Analyst, User Story Writer, Sprint Manager, jPDL Generator, BPMN Designer, Flow Consultant, Rites Scribe, Jira Sync, XML Validator" -m "- RAG: 212 XMLs PJe indexados em Vectorize (768d, cosine)" -m "- Auditoria de custo LLM em R$ (cambio configuravel)" -m "- Painel com fila de revisao + reset de pipeline preservando RAG/jobs" -m "- Edicao completa de 7 entidades + regeneracao com IA" -m "- BPMN exporter compativel com Bizagi"
if errorlevel 1 (
    echo.
    echo [AVISO] Commit falhou - pode ja existir commit identico ou nada a commitar.
    echo Vou tentar continuar mesmo assim.
    echo.
)

echo --- git remote ---
"%GIT%" remote remove origin 2^>nul
"%GIT%" remote add origin "%REPO_URL%"
echo Remote 'origin' = %REPO_URL%
echo.

echo ============================================================
echo  Push para GitHub
echo ============================================================
echo  Se pedir credenciais: usuario = vsousaesilva
echo                       senha   = Personal Access Token (PAT)
echo  Crie um PAT em: https://github.com/settings/tokens
echo  Permissoes minimas: 'repo' (full control)
echo ============================================================
echo.

"%GIT%" push -u origin main
if errorlevel 1 goto :erro

echo.
echo ============================================================
echo  PRONTO! Repo em: %REPO_URL%
echo ============================================================
goto :fim

:erro
echo.
echo [ERRO] Algo falhou. Veja a mensagem acima.
echo.

:fim
endlocal
pause
