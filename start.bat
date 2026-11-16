@echo off
title Deadlock Overlay Studio
cd /d "%~dp0"
start "" "http://127.0.0.1:4747/"
node server.mjs
pause
