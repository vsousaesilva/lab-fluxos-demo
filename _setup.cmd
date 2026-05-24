@echo off
setlocal
set "NPM=C:\Portatil\node-v24.14.1-win-x64\npm.cmd"
set "PATH=C:\Portatil\node-v24.14.1-win-x64;%PATH%"
echo === Limpando instalacoes parciais ===
if exist "%~dp0node_modules" rmdir /s /q "%~dp0node_modules"
if exist "%~dp0package-lock.json" del /q "%~dp0package-lock.json"
echo.
echo === Instalando dependencias (npm install) ===
call "%NPM%" install
if errorlevel 1 call "%NPM%" install --legacy-peer-deps
echo.
echo === Setup concluido ===
endlocal
pause
