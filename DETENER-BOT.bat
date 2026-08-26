@echo off
cd /d "%~dp0"
title WhatsApp Gateway - Deteniendo...
cls

echo =======================================================
echo    Deteniendo WhatsApp Gateway y liberando puertos...
echo =======================================================
echo.

REM 1. Cerrar procesos de Node en puerto 3100
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3100" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo =======================================================
echo    TODOS LOS SERVICIOS HAN SIDO APAGADOS!
echo =======================================================
echo  - El puerto 3100 ha sido liberado.
echo  - No queda ningun proceso de WhatsApp activo en segundo plano.
echo.
pause
