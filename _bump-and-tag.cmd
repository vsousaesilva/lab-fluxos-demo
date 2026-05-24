@echo off
REM ============================================================
REM  _bump-and-tag.cmd <patch|minor|major>
REM
REM  Executa SO o passo 4/4 do _release.ps1:
REM    1) npm version <bump> -m "release: v%%s"  (bump + commit + tag)
REM    2) git push origin main --follow-tags
REM
REM  Loga tudo em _bump-and-tag.log e SEMPRE pausa no fim.
REM ============================================================
setlocal

set "LOG=%~dp0_bump-and-tag.log"
echo. > "%LOG%"

set "PORTATIL=C:\Portatil"
set "GIT_EXE=%PORTATIL%\PortableGit\cmd\git.exe"
set "NPM_CMD=%PORTATIL%\node-v24.14.1-win-x64\npm.cmd"
set "PATH=%PORTATIL%\node-v24.14.1-win-x64;%PORTATIL%\PortableGit\cmd;%PATH%"

set "BUMP=%~1"
if "%BUMP%"=="" set "BUMP=patch"

set "RC=0"

echo === Iniciando bump-and-tag ===                          >> "%LOG%"
echo Bump : %BUMP%                                            >> "%LOG%"
echo CWD  : %~dp0                                             >> "%LOG%"
echo Git  : %GIT_EXE%                                         >> "%LOG%"
echo Npm  : %NPM_CMD%                                         >> "%LOG%"
echo.                                                          >> "%LOG%"

echo === Iniciando bump-and-tag ===
echo Bump = %BUMP%
echo.

if not exist "%GIT_EXE%" (
    echo [ERRO] Git nao encontrado em %GIT_EXE%
    echo [ERRO] Git nao encontrado em %GIT_EXE%               >> "%LOG%"
    set "RC=1"
    goto :fim
)
if not exist "%NPM_CMD%" (
    echo [ERRO] npm nao encontrado em %NPM_CMD%
    echo [ERRO] npm nao encontrado em %NPM_CMD%               >> "%LOG%"
    set "RC=1"
    goto :fim
)

if /I not "%BUMP%"=="patch" if /I not "%BUMP%"=="minor" if /I not "%BUMP%"=="major" (
    echo [ERRO] BUMP invalido: %BUMP%. Use patch^|minor^|major.
    echo [ERRO] BUMP invalido: %BUMP%                          >> "%LOG%"
    set "RC=1"
    goto :fim
)

cd /d "%~dp0"

echo --- npm version %BUMP% ---                                >> "%LOG%"
echo --- npm version %BUMP% ---
call "%NPM_CMD%" version %BUMP% -m "release: v%%s"             1>> "%LOG%" 2>&1
set "STEP1_RC=%ERRORLEVEL%"
type "%LOG%"
echo (exit code: %STEP1_RC%)
if not "%STEP1_RC%"=="0" (
    echo [ERRO] npm version falhou. Veja o log acima.
    set "RC=%STEP1_RC%"
    goto :fim
)
echo.

echo --- git push origin main --follow-tags ---                >> "%LOG%"
echo --- git push origin main --follow-tags ---
"%GIT_EXE%" push origin main --follow-tags                     1>> "%LOG%" 2>&1
set "STEP2_RC=%ERRORLEVEL%"
type "%LOG%"
echo (exit code: %STEP2_RC%)
if not "%STEP2_RC%"=="0" (
    echo [ERRO] git push falhou. Veja o log acima.
    set "RC=%STEP2_RC%"
    goto :fim
)

echo.
echo [OK] Bump + tag enviados ao GitHub.

:fim
echo.
echo Log completo em: %LOG%
echo.
pause
endlocal & exit /b %RC%
