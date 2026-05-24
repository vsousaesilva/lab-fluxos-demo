@echo off
setlocal
if exist "%~dp0.next" rmdir /s /q "%~dp0.next"
echo .next apagado.
endlocal
pause
