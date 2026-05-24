@echo off
setlocal
set "PORTABLE_SRC=C:\Users\vsousaesilva\OneDrive - Justica Federal no Ceara\Área de Trabalho\Portatil"
set "PORTABLE_DEST=C:\Portatil"

echo ============================================================
echo  Copiar Node portatil pra C:\Portatil (sem acento)
echo ============================================================
echo  Origem:  %PORTABLE_SRC%
echo  Destino: %PORTABLE_DEST%
echo.
echo  Depois reescreve os scripts .cmd locais para apontar pra
echo  C:\Portatil\ em vez do path com "Área de Trabalho".
echo.
pause

if not exist "%PORTABLE_DEST%" mkdir "%PORTABLE_DEST%"

echo.
echo === Copiando (robocopy lida bem com acento) ===
robocopy "%PORTABLE_SRC%" "%PORTABLE_DEST%" /E /NFL /NDL /NJH /NJS /NP
if errorlevel 8 (
    echo  ERRO na copia. Aborta.
    pause
    exit /b 1
)

echo.
echo === Verificando node.exe ===
if exist "%PORTABLE_DEST%\node-v24.14.1-win-x64\node.exe" (
    echo  OK: node.exe encontrado em %PORTABLE_DEST%\node-v24.14.1-win-x64\
) else (
    echo  ERRO: node.exe nao encontrado no destino
    pause
    exit /b 1
)

echo.
echo === Reescrevendo scripts .cmd locais ===

set "NODE=C:\Portatil\node-v24.14.1-win-x64"

REM _setup.cmd
(
    echo @echo off
    echo setlocal
    echo set "NPM=%NODE%\npm.cmd"
    echo set "PATH=%NODE%;%%PATH%%"
    echo echo === Limpando instalacoes parciais ===
    echo if exist "%%~dp0node_modules" rmdir /s /q "%%~dp0node_modules"
    echo if exist "%%~dp0package-lock.json" del /q "%%~dp0package-lock.json"
    echo echo.
    echo echo === Instalando dependencias ^(npm install^) ===
    echo call "%%NPM%%" install
    echo if errorlevel 1 call "%%NPM%%" install --legacy-peer-deps
    echo echo.
    echo echo === Setup concluido ===
    echo endlocal
    echo pause
) > "%~dp0_setup.cmd"

REM _npm-install.cmd
(
    echo @echo off
    echo setlocal
    echo set "NPM=%NODE%\npm.cmd"
    echo set "PATH=%NODE%;%%PATH%%"
    echo echo === npm install ^(sem reset^) ===
    echo call "%%NPM%%" install
    echo if errorlevel 1 call "%%NPM%%" install --legacy-peer-deps
    echo endlocal
    echo pause
) > "%~dp0_npm-install.cmd"

REM _dev.cmd
(
    echo @echo off
    echo setlocal
    echo set "NPM=%NODE%\npm.cmd"
    echo set "PATH=%NODE%;%%PATH%%"
    echo if exist "%%~dp0.cf-token" ^(
    echo     for /f "usebackq delims=" %%%%t in ^("%%~dp0.cf-token"^) do set "CLOUDFLARE_API_TOKEN=%%%%t"
    echo ^)
    echo echo === Iniciando Next.js em modo dev ^(http://localhost:3000^) ===
    echo call "%%NPM%%" run dev
    echo echo.
    echo echo === Encerrado ^(exit %%ERRORLEVEL%%^) ===
    echo pause
    echo endlocal
) > "%~dp0_dev.cmd"

REM _deploy.cmd
(
    echo @echo off
    echo setlocal
    echo set "NPM=%NODE%\npm.cmd"
    echo set "PATH=%NODE%;%%PATH%%"
    echo if exist "%%~dp0.cf-token" ^(
    echo     for /f "usebackq delims=" %%%%t in ^("%%~dp0.cf-token"^) do set "CLOUDFLARE_API_TOKEN=%%%%t"
    echo ^)
    echo echo === Build + Deploy para Cloudflare Workers ===
    echo call "%%NPM%%" run deploy
    echo endlocal
    echo pause
) > "%~dp0_deploy.cmd"

REM _db-migrate-remote.cmd
(
    echo @echo off
    echo setlocal
    echo set "PATH=%NODE%;%%PATH%%"
    echo set "WRANGLER=%%~dp0node_modules\.bin\wrangler.cmd"
    echo if exist "%%~dp0.cf-token" ^(
    echo     for /f "usebackq delims=" %%%%t in ^("%%~dp0.cf-token"^) do set "CLOUDFLARE_API_TOKEN=%%%%t"
    echo ^)
    echo echo === Aplicando migrations no D1 REMOTO ===
    echo call "%%WRANGLER%%" d1 migrations apply lab-fluxos --remote
    echo endlocal
    echo pause
) > "%~dp0_db-migrate-remote.cmd"

echo  OK: _setup.cmd, _npm-install.cmd, _dev.cmd, _deploy.cmd, _db-migrate-remote.cmd

echo.
echo ============================================================
echo  Pronto. Agora rode:
echo    _setup.cmd
echo    _deploy.cmd
echo ============================================================
endlocal
pause
