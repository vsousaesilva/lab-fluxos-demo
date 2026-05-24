@echo off
setlocal
if not exist "%~dp0public" mkdir "%~dp0public"
if exist "%~dp0logo.png" (
    copy /Y "%~dp0logo.png" "%~dp0public\logo.png" >nul
    if exist "%~dp0public\logo.png" (
        echo OK: logo copiada para public\logo.png
    ) else (
        echo ERRO: nao consegui copiar.
    )
) else (
    echo AVISO: logo.png nao encontrado na raiz do projeto.
)
endlocal
pause
