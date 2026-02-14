@echo off
setlocal

set "ROOT=%~dp0"
set "NOTES=%ROOT%SESSION_NOTES.md"

if not exist "%NOTES%" (
  > "%NOTES%" (
    echo # TGX Session Notes
    echo.
    echo - Date: %DATE% %TIME%
    echo - Status: add your latest progress here.
    echo.
    echo ## Next Step
    echo - Define the first task to continue tomorrow.
  )
)

echo ============================================================
echo TGX resume helper
echo ============================================================
echo Notes file: "%NOTES%"
echo.
echo 1^) Keep this chat to preserve full context.
echo 2^) If you open a new chat, paste:
echo    "Read SESSION_NOTES.md and continue from last task."
echo.

start "" notepad "%NOTES%"

choice /C YN /N /M "Start local server now (dev-local.bat)? [Y/N]: "
if errorlevel 2 goto :done
if errorlevel 1 (
  call "%ROOT%dev-local.bat"
)

:done
endlocal
