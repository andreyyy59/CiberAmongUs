@echo off
chcp 65001 >nul
title Red Segura - Servidor
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  No tienes Node.js instalado.
  echo  Descargalo de https://nodejs.org  ^(version LTS^) y vuelve a abrir este archivo.
  echo.
  pause
  exit /b
)

if not exist node_modules (
  echo Instalando dependencias por primera vez...
  call npm install
)

start "" http://localhost:3000
node server.js
pause
