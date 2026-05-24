@echo off
REM ============================================================
REM  _release.cmd <patch|minor|major> "<commit message>"
REM
REM  Thin wrapper: monta PATH com os 3 portateis de C:\Portatil
REM  e chama _release.ps1 (orquestrador real).
REM
REM  Portateis usados:
REM    - Git         : C:\Portatil\PortableGit\cmd\git.exe
REM    - Node 24     : C:\Portatil\node-v24.14.1-win-x64\(node.exe, npm.cmd)
REM    - PowerShell 7: C:\Portatil\PowerShell-7.6.1-win-x64\pwsh.exe
REM
REM  Uso:
REM    _release.cmd patch "fix: contador do painel"
REM    _release.cmd minor "feat: convites + admin"
REM ============================================================
setlocal EnableDelayedExpansion

set "PORTATIL=C:\Portatil"
set "GIT_DIR=%PORTATIL%\PortableGit\cmd"
set "NODE_DIR=%PORTATIL%\node-v24.14.1-win-x64"
set "PWSH=%PORTATIL%\PowerShell-7.6.1-win-x64\pwsh.exe"

REM Validacao dos portateis ------------------------------------
if not exist "%GIT_DIR%\git.exe" (
    echo [ERRO] Git portatil nao encontrado em %GIT_DIR%\git.exe
    exit /b 1
)
if not exist "%NODE_DIR%\node.exe" (
    echo [ERRO] Node portatil nao encontrado em %NODE_DIR%\node.exe
    exit /b 1
)
if not exist "%PWSH%" (
    echo [ERRO] PowerShell 7 portatil nao encontrado em %PWSH%
    exit /b 1
)

REM PATH: node + git primeiro, depois sistema -------------------
set "PATH=%NODE_DIR%;%GIT_DIR%;%PATH%"

REM Token Cloudflare (se houver) --------------------------------
if exist "%~dp0.cf-token" (
    for /f "usebackq delims=" %%t in ("%~dp0.cf-token") do set "CLOUDFLARE_API_TOKEN=%%t"
)

REM Coleta args -------------------------------------------------
set "BUMP=%~1"
set "MSG=%~2"

echo Args recebidos:
echo   bump = [%BUMP%]
echo   msg  = [%MSG%]
echo.

REM Fallback interativo se nao veio bump --------------------------
if "%BUMP%"=="" (
    echo Nenhum bump informado. Escolha:
    echo   1^) patch   ^(default - fix/ajuste^)
    echo   2^) minor   ^(feature retrocompativel^)
    echo   3^) major   ^(breaking change^)
    set /p ESCOLHA="Digite 1/2/3 (Enter = 1): "
    if "!ESCOLHA!"=="2" set "BUMP=minor"
    if "!ESCOLHA!"=="3" set "BUMP=major"
    if "!BUMP!"=="" set "BUMP=patch"
)

REM Fallback interativo se nao veio msg ---------------------------
REM Se nao tinha bump (modo interativo), forca uma mensagem nao-vazia
REM com default sensato. Pra modo nao-interativo o ps1 segue regra estrita.
if "%MSG%"=="" if "%~1"=="" (
    echo Mensagem de commit. Exemplos:
    echo   feat: nova feature X
    echo   fix: corrige bug Y
    echo   chore: ajustes diversos
    set /p MSG="Mensagem (Enter = 'release: %BUMP% bump'): "
    if "!MSG!"=="" set "MSG=release: %BUMP% bump"
)

echo.
echo Executando release com:
echo   bump = %BUMP%
echo   msg  = %MSG%
echo.

REM Chama orquestrador PowerShell -------------------------------
"%PWSH%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0_release.ps1" -Bump "%BUMP%" -Message "%MSG%"
set "RC=%ERRORLEVEL%"

echo.
if "%RC%"=="0" (
    echo [OK] Release concluido com sucesso.
) else (
    echo [ERRO] Release falhou com exit code %RC%.
)
echo.
pause
endlocal & exit /b %RC%
