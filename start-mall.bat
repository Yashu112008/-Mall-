@echo off
title Mall Manager Server
cd /d "%~dp0backend"
start "" cmd /c "timeout /t 4 >nul & start http://localhost:5000/login.html"
echo Starting Mall Manager... keep this window open while you use the app.
npm start
pause
