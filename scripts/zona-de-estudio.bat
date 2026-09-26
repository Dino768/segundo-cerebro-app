@echo off
rem Abre la zona de estudio con un doble clic: cierra la que siguiera abierta (por ejemplo, de antes de una actualizacion),
rem prepara la app y la abre en el navegador. Mientras estudias, deja esta ventana abierta (puedes minimizarla).
chcp 65001 >nul
title Zona de estudio - no cierres esta ventana mientras estudias
cd /d "%~dp0.."
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":5174 .*LISTENING"') do (
  echo Cerrando la zona de estudio que seguia abierta...
  taskkill /PID %%p /F >nul 2>&1
)
set "PATH=%PATH%;C:\Program Files\nodejs"
set ABRIR_NAVEGADOR=1
call npm run local
echo.
echo La zona de estudio se ha cerrado. Pulsa una tecla para cerrar esta ventana.
pause >nul
