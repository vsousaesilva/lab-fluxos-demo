@echo off
setlocal enabledelayedexpansion

echo === Procurando processo na porta 3000 ===
set "FOUND=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    set "PID=%%a"
    set "FOUND=1"
)

if "%FOUND%"=="0" (
    echo  Nada escutando na porta 3000. Tudo livre.
    goto :end
)

echo  PID encontrado: %PID%
echo.
echo  Detalhes do processo:
tasklist /FI "PID eq %PID%" /FO LIST | findstr /V /R "^$"
echo.
echo === Matando PID %PID% ===
taskkill /PID %PID% /F

:end
echo.
echo === Conferindo se a 3000 ficou livre ===
netstat -ano | findstr ":3000" | findstr "LISTENING"
if errorlevel 1 (
    echo  Porta 3000 livre.
) else (
    echo  AVISO: ainda tem algo na 3000.
)

echo.
endlocal
pause
