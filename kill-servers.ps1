# Kill-Servers.ps1 - Kill all processes on dev ports
# Usage: powershell -ExecutionPolicy Bypass -File .\kill-servers.ps1

Write-Host "==========================================" -ForegroundColor Yellow
Write-Host "  KILLING ALL PROCESSES ON DEV PORTS" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Yellow

$ports = @(5000, 5173, 5174, 5175, 5176, 3000, 8080)
$totalKilled = 0

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue

    if ($connections) {
        foreach ($conn in $connections) {
            $procId = $conn.OwningProcess
            if ($procId -gt 0) {
                try {
                    $proc = Get-Process -Id $procId -ErrorAction Stop
                    $procName = $proc.ProcessName
                    Stop-Process -Id $procId -Force -ErrorAction Stop
                    Write-Host "  [KILLED] Port $port - PID $procId ($procName)" -ForegroundColor Red
                    $totalKilled++
                } catch {
                    Write-Host "  [SKIP] Port $port - PID $procId (already exited)" -ForegroundColor Gray
                }
            }
        }
    } else {
        Write-Host "  [FREE] Port $port - No process listening" -ForegroundColor Green
    }
}

# Kill any leftover node.exe processes that are running our servers
Write-Host ""
Write-Host "Checking for leftover node.exe processes..." -ForegroundColor Cyan
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*laptop-store*" -or
    $_.MainWindowTitle -like "*Laptop*" -or
    $_.Path -like "*laptop-store*"
}

if ($nodeProcesses) {
    foreach ($np in $nodeProcesses) {
        try {
            Write-Host "  [KILLED] Node PID $($np.Id) - $($np.Path)" -ForegroundColor Red
            Stop-Process -Id $np.Id -Force -ErrorAction Stop
            $totalKilled++
        } catch {
            Write-Host "  [SKIP] Node PID $($np.Id) (access denied)" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "  No leftover node processes found" -ForegroundColor Green
}

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  DONE! Killed $totalKilled process(es)" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Now you can safely run: npm run dev" -ForegroundColor Cyan
Write-Host "Or use: .\restart-servers.ps1" -ForegroundColor Cyan