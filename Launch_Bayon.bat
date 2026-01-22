@echo off
TITLE Bayon Finance Launcher
cd /d "%~dp0"

echo [1/2] Checking for dependencies...
if not exist "node_modules" (
    echo [!] node_modules not found. Running npm install...
    call npm install
)

echo [2/2] Launching Clinical Ledger System...
echo [i] Server is starting in the background.
echo [i] Please wait 5 seconds for the interface to load...

:: Start the Next.js dev server minimized or hidden
start /min cmd /c "npm run dev"

:: Wait for the server to spin up
timeout /t 5 /nobreak > nul

:: Open the app in the default browser at the local address
start http://localhost:3000

echo.
echo [SUCCESS] Bayon Finance is now running! 
echo [!] Do not close the small minimized terminal window or the app will stop.
echo.
pause
