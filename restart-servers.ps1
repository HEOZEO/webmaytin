# Restart-Servers.ps1 - Kill all ports then start backend + frontend
# Usage: powershell -ExecutionPolicy Bypass -File .\restart-servers.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  RESTART SERVERS - LAPTOP STORE" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill all processes on dev ports
Write-Host "==> Step 1: Killing processes on ports 5000, 5173-5176..." -ForegroundColor Yellow
$ports = @(5000, 5173, 5174, 5175, 5176)
$killedCount = 0

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        $procId = $conn.OwningProcess
        if ($procId -gt 0) {
            try {
                $proc = Get-Process -Id $procId -ErrorAction Stop
                Stop-Process -Id $procId -Force -ErrorAction Stop
                Write-Host "    [KILLED] Port $port - PID $procId ($($proc.ProcessName))" -ForegroundColor Red
                $killedCount++
            } catch {
                Write-Host "    [SKIP] Port $port - PID $procId (already exited)" -ForegroundColor Gray
            }
        }
    }
}

if ($killedCount -eq 0) {
    Write-Host "    No processes to kill - ports are free" -ForegroundColor Green
}

# Wait for OS to release ports
Write-Host ""
Write-Host "==> Waiting 3 seconds for ports to be released..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

# Step 2: Verify ports are free
Write-Host ""
Write-Host "==> Step 2: Verifying ports are free..." -ForegroundColor Yellow
$stillBusy = $false
foreach ($port in $ports) {
    $check = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($check) {
        Write-Host "    [BUSY] Port $port is still in use!" -ForegroundColor Red
        $stillBusy = $true
    } else {
        Write-Host "    [FREE] Port $port" -ForegroundColor Green
    }
}

if ($stillBusy) {
    Write-Host ""
    Write-Host "WARNING: Some ports are still busy. Try waiting longer or restart manually." -ForegroundColor Red
    Read-Host "Press Enter to continue anyway (or Ctrl+C to abort)"
}

# Step 3: Start backend
Write-Host ""
Write-Host "==> Step 3: Starting backend (port 5000)..." -ForegroundColor Yellow
$serverPath = Join-Path $PSScriptRoot "server"
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$serverPath'; Write-Host 'BACKEND SERVER' -ForegroundColor Cyan; npm start"
)

# Wait for backend to be ready
Write-Host "==> Waiting 5 seconds for backend to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

# Step 4: Start frontend
Write-Host ""
Write-Host "==> Step 4: Starting frontend (port 5173)..." -ForegroundColor Yellow
$clientPath = Join-Path $PSScriptRoot "client"
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$clientPath'; Write-Host 'FRONTEND CLIENT' -ForegroundColor Cyan; npm run dev"
)

# Wait for frontend to be ready
Write-Host "==> Waiting 5 seconds for frontend to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

# Final summary
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  SERVERS STARTED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  Backend:  http://localhost:5000" -ForegroundColor White
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  Admin:    admin@gmail.com / Admin@123" -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Test the servers:" -ForegroundColor Cyan
Write-Host "  - Open browser: http://localhost:5173" -ForegroundColor White
Write-Host "  - API health:   http://localhost:5000/api/health" -ForegroundColor White
Write-Host ""