@echo off
REM Nexus Desktop Build Script for Windows
REM Usage: build.bat

echo ========================================
echo   Nexus ERP Desktop App Builder
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

echo.
echo ========================================
echo   Building Windows Installer...
echo ========================================
echo.

REM Build for Windows
call npm run build

echo.
echo ========================================
echo   Build Complete!
echo ========================================
echo.

if exist "release\Klypso-ERP-setup.exe" (
    echo Installer Location: release\Klypso-ERP-setup.exe
    echo App Folder: release\win-unpacked\Klypso ERP.exe
    echo.
    pause
) else (
    echo Build failed. Check errors above.
    pause
)
