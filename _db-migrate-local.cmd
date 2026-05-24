@echo off
setlocal
set "PATH=C:\Portatil\node-v24.14.1-win-x64;%PATH%"
set "WRANGLER=%~dp0node_modules\.bin\wrangler.cmd"
echo === Aplicando migrations no D1 LOCAL ===
call "%WRANGLER%" d1 migrations apply lab-fluxos --local
endlocal
pause
