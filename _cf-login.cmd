@echo off
setlocal
set "NPM=%~dp0..\..\Portatil\node-v24.14.1-win-x64\npm.cmd"
set "PATH=%~dp0..\..\Portatil\node-v24.14.1-win-x64;%PATH%"
echo === Login na Cloudflare (abre o navegador) ===
call "%NPM%" exec wrangler login
endlocal
pause
