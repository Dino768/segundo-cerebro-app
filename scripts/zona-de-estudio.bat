@echo off
rem Zona de estudio de Diego.
rem   Doble clic (acceso directo del escritorio): cierra la que siguiera abierta, la arranca y abre el navegador.
rem   "/inicio" (al encender Windows, sin ventana): la arranca sin abrir el navegador.
rem Cuando el codigo se actualiza, el programa sale con el codigo 75 y aqui se vuelve a arrancar con lo nuevo.
chcp 65001 >nul
title Zona de estudio - no cierres esta ventana mientras estudias
cd /d "%~dp0.."
set "PATH=%PATH%;C:\Program Files\nodejs"
set ZONA_AUTOMATICA=1
set "REGISTRO=%TEMP%\zona-de-estudio.log"
if /i "%~1"=="/inicio" goto bucle

for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":5174 .*LISTENING"') do (
  echo Cerrando la zona de estudio que seguia abierta...
  taskkill /PID %%p /F >nul 2>&1
)
set ABRIR_NAVEGADOR=1

:bucle
if /i "%~1"=="/inicio" (
  call :arrancar >>"%REGISTRO%" 2>&1
) else (
  call :arrancar
)
set ABRIR_NAVEGADOR=
if "%SALIDA%"=="75" goto bucle
rem Sin ventana, si algo falla (por ejemplo, el puerto aun ocupado) se reintenta en un minuto.
if /i "%~1"=="/inicio" (
  timeout /t 60 /nobreak >nul
  goto bucle
)
echo.
echo La zona de estudio se ha cerrado. Pulsa una tecla para cerrar esta ventana.
pause >nul
exit /b

:arrancar
echo [%date% %time%] Arrancando la zona de estudio
node scripts\iconos.ts
call node_modules\.bin\vite.cmd build --logLevel warn
node local\principal.ts
set SALIDA=%errorlevel%
exit /b
