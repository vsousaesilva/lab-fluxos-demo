@echo off
setlocal
set "NPM=%~dp0..\..\Portatil\node-v24.14.1-win-x64\npm.cmd"
set "PATH=%~dp0..\..\Portatil\node-v24.14.1-win-x64;%PATH%"
set "NODE_MODULES_TARGET=C:\dev-caches\lab-fluxos-demo\node_modules"
set "NEXT_TARGET=C:\dev-caches\lab-fluxos-demo\.next"

echo ============================================================
echo  Reset completo: apaga node_modules + .next + package-lock
echo ============================================================
echo.
echo  Apague tudo e reinstale. Demora 2-4 min.
echo  Use quando: build está quebrando por estado inconsistente.
echo.
echo  IMPORTANTE: feche _dev.cmd antes.
echo.
pause

echo === Apagando conteudo de node_modules (target da junction) ===
if exist "%NODE_MODULES_TARGET%" (
    rmdir /s /q "%NODE_MODULES_TARGET%"
    mkdir "%NODE_MODULES_TARGET%"
    echo  OK
) else (
    echo  Target nao existe, criando...
    mkdir "%NODE_MODULES_TARGET%"
)
echo.

echo === Apagando conteudo de .next (target da junction) ===
if exist "%NEXT_TARGET%" (
    rmdir /s /q "%NEXT_TARGET%"
    mkdir "%NEXT_TARGET%"
    echo  OK
) else (
    echo  Target nao existe, criando...
    mkdir "%NEXT_TARGET%"
)
echo.

echo === Apagando package-lock.json ===
if exist "%~dp0package-lock.json" (
    del /q "%~dp0package-lock.json"
    echo  OK
) else (
    echo  Nao existia
)
echo.

echo === npm install (limpo) ===
call "%NPM%" install
if errorlevel 1 (
    echo.
    echo *** Falhou. Tentando --legacy-peer-deps ***
    call "%NPM%" install --legacy-peer-deps
)
echo.

echo === Verificando bin shims ===
if exist "%~dp0node_modules\.bin\next.cmd" (
    echo  OK: next.cmd encontrado
) else (
    echo  AVISO: next.cmd NAO encontrado
)

echo.
echo === Concluido. Exit code: %ERRORLEVEL% ===
endlocal
pause
