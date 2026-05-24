@echo off
setlocal
set "NODE=C:\Portatil\node-v24.14.1-win-x64"

if not exist "%NODE%\node.exe" (
    echo [ERRO] %NODE%\node.exe nao encontrado.
    echo Copie a pasta Portatil do OneDrive para C:\Portatil primeiro.
    pause
    exit /b 1
)

echo === Regenerando scripts .cmd apontando para C:\Portatil ===

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

REM _db-migrate-local.cmd
(
    echo @echo off
    echo setlocal
    echo set "PATH=%NODE%;%%PATH%%"
    echo set "WRANGLER=%%~dp0node_modules\.bin\wrangler.cmd"
    echo echo === Aplicando migrations no D1 LOCAL ===
    echo call "%%WRANGLER%%" d1 migrations apply lab-fluxos --local
    echo endlocal
    echo pause
) > "%~dp0_db-migrate-local.cmd"

echo OK: scripts regenerados (_setup, _npm-install, _dev, _deploy, _db-migrate-remote, _db-migrate-local)
echo.
echo Agora rode:
echo    _setup.cmd
echo    _deploy.cmd
endlocal
pause
