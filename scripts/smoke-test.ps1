# Smoke test cho các flow critical sau khi áp dụng các fix audit.
#
# Script này KHÔNG thay thế unit/integration test, chỉ dùng để:
#   1. Đảm bảo server không crash ngay khi start.
#   2. Verify các endpoint critical vẫn hoạt động.
#   3. Có dấu hiệu sớm nếu thiếu migration / env var.
#
# Yêu cầu: server đã start (mặc định http://localhost:5000), DB đã seed.
#
# Cách chạy:
#   powershell -ExecutionPolicy Bypass -File scripts/smoke-test.ps1

param(
    [string]$BaseUrl = "http://localhost:5000/api",
    [string]$AdminEmail = "admin@laptopstore.com",
    [string]$AdminPassword = "Admin123@"
)

$ErrorActionPreference = "Stop"
$pass = 0
$fail = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method = "GET",
        [string]$Path,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [int]$ExpectedStatus = 200
    )
    try {
        $params = @{
            Uri = "$BaseUrl$Path"
            Method = $Method
            Headers = $Headers
            ContentType = "application/json"
            TimeoutSec = 10
        }
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress)
        }
        $resp = Invoke-WebRequest @params -UseBasicParsing
        $status = [int]$resp.StatusCode
        if ($status -eq $ExpectedStatus) {
            Write-Host "PASS  [$status]  $Method $Path  ($Name)" -ForegroundColor Green
            $script:pass++
        } else {
            Write-Host "FAIL  [$status]  $Method $Path  ($Name)  expected $ExpectedStatus" -ForegroundColor Red
            $script:fail++
        }
    } catch {
        $code = 0
        if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
        if ($code -eq $ExpectedStatus) {
            Write-Host "PASS  [$code]  $Method $Path  ($Name)" -ForegroundColor Green
            $script:pass++
        } else {
            Write-Host "FAIL  [$code]  $Method $Path  ($Name)  expected $ExpectedStatus  $_" -ForegroundColor Red
            $script:fail++
        }
    }
}

Write-Host "=== Smoke test Laptop Store API ===" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl"
Write-Host ""

# 1. Health check
Test-Endpoint -Name "Health check" -Path "/health"
Test-Endpoint -Name "DB test" -Path "/test-db"

# 2. Public endpoints
Test-Endpoint -Name "List products (public)" -Path "/products?limit=1"
Test-Endpoint -Name "List categories" -Path "/categories"
Test-Endpoint -Name "List brands" -Path "/brands"

# 3. Validation: empty register
Test-Endpoint -Name "Register empty body should fail 400" -Method POST -Path "/auth/register" -Body @{} -ExpectedStatus 400

# 4. Validation: invalid email
Test-Endpoint -Name "Register invalid email should fail 400" -Method POST -Path "/auth/register" -Body @{
    email = "not-an-email"
    password = "Test1234@"
    full_name = "Test"
} -ExpectedStatus 400

# 5. Login wrong password should not 500
Test-Endpoint -Name "Login wrong password" -Method POST -Path "/auth/login" -Body @{
    email = "noone@example.com"
    password = "wrong"
} -ExpectedStatus 401

# 6. Login as admin (need seeded admin)
try {
    $loginResp = Invoke-WebRequest -Uri "$BaseUrl/auth/login" -Method POST -ContentType "application/json" -Body (@{
        email = $AdminEmail
        password = $AdminPassword
    } | ConvertTo-Json -Compress) -UseBasicParsing -TimeoutSec 10
    $token = ($loginResp.Content | ConvertFrom-Json).data.token
    if ($token) {
        Write-Host "PASS  Admin login → token obtained" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "FAIL  Admin login → no token" -ForegroundColor Red
        $script:fail++
        $token = $null
    }
} catch {
    Write-Host "SKIP  Admin login → cannot test protected routes: $_" -ForegroundColor Yellow
    $token = $null
}

if ($token) {
    $authHeaders = @{ Authorization = "Bearer $token" }

    # 7. Get current user
    Test-Endpoint -Name "GET /auth/me" -Path "/auth/me" -Headers $authHeaders

    # 8. Cart endpoints
    Test-Endpoint -Name "GET /cart" -Path "/cart" -Headers $authHeaders

    # 9. Wishlist endpoints
    Test-Endpoint -Name "GET /wishlist" -Path "/wishlist" -Headers $authHeaders

    # 10. Orders list
    Test-Endpoint -Name "GET /orders" -Path "/orders" -Headers $authHeaders

    # 11. Admin: list users (should 200 since admin)
    Test-Endpoint -Name "Admin: GET /admin/users" -Path "/admin/users?limit=1" -Headers $authHeaders

    # 12. Admin: stats
    Test-Endpoint -Name "Admin: GET /admin/stats/dashboard" -Path "/admin/stats/dashboard" -Headers $authHeaders

    # 13. Admin: list coupons
    Test-Endpoint -Name "Admin: GET /admin/coupons" -Path "/admin/coupons?limit=1" -Headers $authHeaders

    # 14. Admin: bulkUpdateStock validation (negative qty)
    Test-Endpoint -Name "Admin: bulk stock with negative qty should fail" -Method POST -Path "/admin/products/bulk-stock" -Headers $authHeaders -Body @{
        items = @( @{ id = 1; quantity = -1 } )
    } -ExpectedStatus 400
}

Write-Host ""
Write-Host "=== Result ===" -ForegroundColor Cyan
Write-Host "PASS: $pass"
Write-Host "FAIL: $fail"
if ($fail -gt 0) { exit 1 } else { exit 0 }
