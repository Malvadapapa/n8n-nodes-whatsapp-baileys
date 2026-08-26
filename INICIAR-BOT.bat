@echo off
cd /d "%~dp0"
title WhatsApp Gateway - Modo Local
cls

echo =======================================================
echo    WhatsApp Gateway (Baileys) - Modo Nativo Local
echo =======================================================
echo.

REM 1. Comprobar Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado o no esta en el PATH.
    echo Por favor instala Node.js desde https://nodejs.org/
    echo.
    pause
    exit /b
)

REM 2. Detener cualquier instancia previa en el puerto 3100
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3100" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo [1/2] Iniciando servidor WhatsApp en tiempo real (Puerto 3100)...
start "WhatsApp Bridge Server (Puerto 3100)" cmd /k "cd /d "%~dp0bridge" && node dist/server.js"

echo [2/2] Abriendo el Panel de Control en tu navegador...
timeout /t 2 /nobreak > nul
start http://localhost:3100/qr/page

echo.
echo =======================================================
echo    CONECTOR DE WHATSAPP ACTIVO EN MODO LOCAL!
echo =======================================================
echo  - Panel Web (QR / Monitor): http://localhost:3100/qr/page
echo  - Sin Docker: 100%% ligero y respuesta instantanea.
echo.
echo  Para cerrar el bot cuando termines, ejecuta "DETENER-BOT.bat"
echo.
pause
