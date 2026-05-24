@echo off
REM Limpa tags v0.5.0, v0.5.1, v0.6.0, v0.6.1, v0.7.0 — todas criadas por bumps
REM do _release.ps1 antigo (versao bump ANTES do deploy) cujos deploys falharam.
REM A v0.4.0 e a ultima realmente em producao.

setlocal
set "GIT=C:\Portatil\PortableGit\cmd\git.exe"

if not exist "%GIT%" (
    echo [ERRO] Git portatil nao encontrado em %GIT%
    pause
    exit /b 1
)

cd /d "%~dp0"

echo ============================================================
echo  Limpar tags orfas no GitHub
echo ============================================================
echo  Vai deletar localmente e no remoto:
echo    v0.5.0, v0.5.1, v0.6.0, v0.6.1, v0.7.0
echo  Mantem: v0.4.0 (ultimo deploy real)
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
"%GIT%" tag -d v0.5.0 2>nul
"%GIT%" tag -d v0.5.1 2>nul
"%GIT%" tag -d v0.6.0 2>nul
"%GIT%" tag -d v0.6.1 2>nul
"%GIT%" tag -d v0.7.0 2>nul

echo.
echo --- Apagando tags remotas ---
"%GIT%" push --delete origin v0.5.0 v0.5.1 v0.6.0 v0.6.1 v0.7.0

echo.
echo Pronto. Tags orfas removidas. Proximo release subira v0.5.0 limpo.
endlocal
pause
