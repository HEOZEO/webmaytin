@echo off
chcp 65001 >nul
echo ========================================
echo  RESTART SERVERS - LAPTOP STORE
echo ========================================
echo.

echo [Step 1] Killing all processes on dev ports (5000, 5173-5176)...
for %%P in (5000 5173 5174 5175 5176) do (
    for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%%P " ^| findstr LISTENING') do (
        echo   [KILLED] Port %%P - PID %%A
        taskkill /F /PID %%A >nul 2>&1
    )
)

echo.
echo [Step 2] Killing leftover node.exe processes...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Backend*" >nul 2>&1
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Frontend*" >nul 2>&1

echo.
echo Waiting 3 seconds for ports to be released...
timeout /t 3 /nobreak >nul

echo.
echo [Step 3] Verifying ports are free...
set BUSY=0
for %%P in (5000 5173 5174) do (
    netstat -ano | findstr ":%%P " | findstr LISTENING >nul 2>&1
    if not errorlevel 1 (
        echo   [BUSY] Port %%P still in use
        set BUSY=1
    ) else (
        echo   [FREE] Port %%P
    )
)

if "%BUSY%"=="1" (
    echo.
    echo WARNING: Some ports are still busy!
    pause
)

echo.
echo ========================================
echo [Step 4] Starting servers...
echo ========================================

start "Backend Server - Port 5000" cmd /k "cd /d D:\shopmaytinh\laptop-store\server && npm start"
timeout /t 5 /nobreak >nul

start "Frontend Client - Port 5173" cmd /k "cd /d D:\shopmaytinh\laptop-store\client && npm run dev"
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo  BOTH SERVERS STARTED!
echo ========================================
echo  Backend:  http://localhost:5000
echo  Frontend: http://localhost:5173
echo  Admin:    admin@laptopstore.com / Admin123@
echo ========================================
echo.
pause