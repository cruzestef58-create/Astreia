@echo off
rem Reconstruit le site depuis src\ puis lance les 10 verifications.
setlocal
cd /d "%~dp0src" || exit /b 1

python campagne.py || goto :echec
python build.py    || goto :echec
node verif.js      || goto :echec

echo.
echo Site reconstruit et verifie.
exit /b 0

:echec
echo.
echo ECHEC : rien n a ete publie. Montre le message ci-dessus a Claude.
exit /b 1
