@echo off
title UNO Online
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo.
 echo لم يتم العثور على Node.js.
 echo ثبّت Node.js ثم شغّل هذا الملف مرة أخرى.
 pause
 exit /b
)
if not exist node_modules\ws (
 echo تثبيت المتطلبات...
 call npm install
)
echo.
echo =========================================
echo UNO Online يعمل الآن
echo افتح: http://localhost:3000
echo =========================================
start "" "http://localhost:3000"
node server.js
pause
