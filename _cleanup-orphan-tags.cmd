@echo off
REM ============================================================
REM Apaga tags v0.5.0..v0.7.0 (locais e no GitHub).
REM
REM Contexto: essas 5 tags foram criadas pelo _release.ps1 antigo,
REM que bumpava versao ANTES do deploy. Quando o build falhava, a
REM tag ficava orfa no GitHub sem codigo correspondente em prod.
REM A partir de v0.8.0 o fluxo deploy-first garante que cada tag = 1
REM deploy real, entao essas 5 podem ser removidas com seguranca.
REM
REM Mantemos: v0.4.0 (deploy real do fluxo antigo) + v0.8.0+ (todas
REM dos releases atuais).
REM ============================================================
setlocal
set "GIT=C:\Portatil\PortableGit\cmd\git.exe"

if not exist "%GIT%" (
    echo [ERRO] Git portatil nao encontrado em %GIT%
    pause
    exit /b 1
)

REM Limpa env vars que confundem git
set "GIT_DIR="
set "GIT_WORK_TREE="

cd /d "%~dp0"

echo ============================================================
echo  Limpar tags orfas (do fluxo bump-first antigo)
echo ============================================================
echo  Vai deletar locais + GitHub:
echo    v0.5.0  v0.5.1  v0.6.0  v0.6.1  v0.7.0
echo  Preserva: v0.4.0 e v0.8.0+ (deploys reais)
echo ============================================================
echo.

set /p CONFIRMA="Confirma? Digite SIM: "
if /I not "%CONFIRMA%"=="SIM" (
    echo Cancelado.
    pause
    exit /b 0
)

echo.
echo --- Apagando tags locais ---
for %%T in (v0.5.0 v0.5.1 v0.6.0 v0.6.1 v0.7.0) do (
    "%GIT%" tag -d %%T 2>nul
    if errorlevel 1 (
        echo  [skip] %%T n^ao existia localmente
    ) else (
        echo  [ok]   %%T apagada localmente
    )
)

echo.
echo --- Apagando tags remotas (uma por vez, tolerante) ---
for %%T in (v0.5.0 v0.5.1 v0.6.0 v0.6.1 v0.7.0) do (
    "%GIT%" push --delete origin %%T 2>nul
    if errorlevel 1 (
        echo  [skip] %%T n^ao existia no remoto
    ) else (
        echo  [ok]   %%T apagada no remoto
    )
)

echo.
echo Pronto. Veja em:
echo   https://github.com/vsousaesilva/lab-fluxos-demo/tags
endlocal
pause
