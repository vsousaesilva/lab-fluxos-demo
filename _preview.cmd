@echo off
setlocal
set "NPM=%~dp0..\..\Portatil\node-v24.14.1-win-x64\npm.cmd"
set "PATH=%~dp0..\..\Portatil\node-v24.14.1-win-x64;%PATH%"
echo === Build + Preview local no runtime real do Workers ===
call "%NPM%" run preview
endlocal
