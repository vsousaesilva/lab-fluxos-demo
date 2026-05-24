@echo off
setlocal
set "NPM=C:\Portatil\node-v24.14.1-win-x64\npm.cmd"
set "PATH=C:\Portatil\node-v24.14.1-win-x64;%PATH%"
echo === npm install (sem reset) ===
call "%NPM%" install
if errorlevel 1 call "%NPM%" install --legacy-peer-deps
endlocal
pause
