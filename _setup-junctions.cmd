@echo off
pushd "%~dp0"

echo ============================================================
echo Diretorio atual: %CD%
echo Cache: C:\dev-caches\lab-fluxos-demo
echo ============================================================
echo.
echo Antes de continuar:
echo   1. _dev.cmd fechado
echo   2. OneDrive pausado (bandeja - engrenagem - Pausar 2h)
echo.
pause

echo.
echo === [1/5] Garantindo pasta de cache ===
if not exist "C:\dev-caches" mkdir "C:\dev-caches"
if not exist "C:\dev-caches\lab-fluxos-demo" mkdir "C:\dev-caches\lab-fluxos-demo"
echo OK
pause

echo.
echo === [2/5] Apagando .next corrompido ===
if exist ".next" (
    rmdir /s /q ".next"
)
if exist ".next" (
    echo FALHA: .next ainda existe. _dev.cmd ainda esta rodando?
) else (
    echo OK: .next apagado ou nao existia
)
pause

echo.
echo === [3/5] Movendo node_modules para o cache ===
if exist "node_modules" (
    if exist "C:\dev-caches\lab-fluxos-demo\node_modules" (
        echo Limpando cache anterior...
        rmdir /s /q "C:\dev-caches\lab-fluxos-demo\node_modules"
    )
    echo Movendo... pode demorar 1-2 min
    move "node_modules" "C:\dev-caches\lab-fluxos-demo\node_modules"
) else (
    echo node_modules nao existe no projeto, pulando
)
pause

echo.
echo === [4/5] Movendo .wrangler para o cache ===
if exist ".wrangler" (
    if exist "C:\dev-caches\lab-fluxos-demo\.wrangler" (
        echo Limpando cache anterior...
        rmdir /s /q "C:\dev-caches\lab-fluxos-demo\.wrangler"
    )
    echo Movendo .wrangler...
    move ".wrangler" "C:\dev-caches\lab-fluxos-demo\.wrangler"
) else (
    echo .wrangler nao existe no projeto, pulando
)
pause

echo.
echo === [5/5] Criando junctions ===
if not exist "C:\dev-caches\lab-fluxos-demo\.next" mkdir "C:\dev-caches\lab-fluxos-demo\.next"
if not exist "C:\dev-caches\lab-fluxos-demo\node_modules" mkdir "C:\dev-caches\lab-fluxos-demo\node_modules"
if not exist "C:\dev-caches\lab-fluxos-demo\.wrangler" mkdir "C:\dev-caches\lab-fluxos-demo\.wrangler"

mklink /J ".next" "C:\dev-caches\lab-fluxos-demo\.next"
mklink /J "node_modules" "C:\dev-caches\lab-fluxos-demo\node_modules"
mklink /J ".wrangler" "C:\dev-caches\lab-fluxos-demo\.wrangler"
pause

echo.
echo === Resumo: listando junctions do projeto ===
dir /A 2>nul | findstr "<JUNCTION>"
echo.
echo Se as 3 linhas <JUNCTION> apareceram acima, deu certo.
echo Retome o OneDrive e rode _dev.cmd.

popd
pause
