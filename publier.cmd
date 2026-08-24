@echo off
rem Reconstruit, verifie, puis pousse sur GitHub : Cloudflare deploie tout seul.
rem Usage : publier.cmd "ce que tu as change"
setlocal

if "%~1"=="" (
  echo Usage : publier.cmd "ce que tu as change"
  exit /b 1
)

call "%~dp0construire.cmd" || exit /b 1
cd /d "%~dp0" || exit /b 1

git add -A || exit /b 1
git diff --cached --quiet
if not errorlevel 1 (
  echo.
  echo Rien de nouveau a publier.
  exit /b 0
)

git commit -m "%~1" || exit /b 1
git push              || exit /b 1

echo.
echo Pousse. Cloudflare deploie dans une minute environ.
exit /b 0
