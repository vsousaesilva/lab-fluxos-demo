@echo off
REM ============================================================
REM  _git-sync.cmd "<mensagem de commit>"
REM
REM  Commita e empurra mudancas pendentes pro GitHub SEM bump de
REM  versao e SEM deploy. Use pra atualizacoes de docs/scripts
REM  que nao afetam o app em producao.
REM
REM  Se quiser bumpar versao e deployar, use _release.cmd.
REM
REM  Exemplo:
REM    _git-sync.cmd "docs: atualizar README com scripts novos"
REM ============================================================
setlocal EnableDelayedExpansion

set "GIT=C:\Portatil\PortableGit\cmd\git.exe"

if not exist "%GIT%" (
    echo [ERRO] Git portatil nao encontrado em %GIT%
    pause
    exit /b 1
)

REM Limpar env vars que confundem git
set "GIT_DIR="
set "GIT_WORK_TREE="

cd /d "%~dp0"

set "MSG=%~1"
if "%MSG%"=="" (
    set /p MSG="Mensagem do commit: "
)
if "%MSG%"=="" (
    echo [ERRO] Mensagem vazia. Abortando.
    pause
    exit /b 1
)

echo === git status ===
"%GIT%" status --short
echo.

echo === git add . ===
"%GIT%" add .
if errorlevel 1 (
    echo [ERRO] git add falhou.
    pause
    exit /b 1
)

echo.
echo === git commit ===
"%GIT%" commit -m "%MSG%"
if errorlevel 1 (
    echo [AVISO] git commit nao gerou commit ^(nada a commitar?^).
)

echo.
echo === git push origin main ===
"%GIT%" push origin main
if errorlevel 1 (
    echo [ERRO] git push falhou. Verifique PAT / conflito remoto.
    pause
    exit /b 1
)

echo.
echo [OK] Sync concluída.
echo Veja em https://github.com/vsousaesilva/lab-fluxos-demo
endlocal
pause
