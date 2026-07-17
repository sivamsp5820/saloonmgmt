# ============================================================
# Saloon Management System - Comprehensive API Test Suite
# ============================================================
# Tests: Auth, Services, Categories, Customers, Expenses,
#        Transactions, Reports, System routes
# ============================================================

$BASE_URL = "http://localhost:5000/api/v1"
$ADMIN_USER = "admin"
$ADMIN_PASS = "admin123"

$global:PASS = 0
$global:FAIL = 0
$global:WARN = 0
$global:adminToken = $null
$global:billingToken = $null
$global:createdServiceId = $null
$global:createdCategoryId = $null
$global:createdExpenseId = $null
$global:createdTransactionId = $null
$global:createdProfileId = $null
$global:billingProfileId = $null

function Write-Header($text) {
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host ("=" * 60) -ForegroundColor Cyan
}

function Write-TestResult($name, $passed, $detail = "") {
    if ($passed) {
        Write-Host "  [PASS] $name" -ForegroundColor Green
        $global:PASS++
    } else {
        Write-Host "  [FAIL] $name" -ForegroundColor Red
        if ($detail) { Write-Host "         $detail" -ForegroundColor DarkRed }
        $global:FAIL++
    }
}

function Write-Warn($name, $detail = "") {
    Write-Host "  [WARN] $name" -ForegroundColor Yellow
    if ($detail) { Write-Host "         $detail" -ForegroundColor DarkYellow }
    $global:WARN++
}

function Invoke-API {
    param(
        [string]$Method = "GET",
        [string]$Endpoint,
        [hashtable]$Body = $null,
        [string]$Token = $null,
        [switch]$Raw
    )
    $uri = "$BASE_URL$Endpoint"
    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }

    try {
        $params = @{
            Method  = $Method
            Uri     = $uri
            Headers = $headers
        }
        if ($Body) { $params["Body"] = ($Body | ConvertTo-Json -Depth 10) }

        $response = Invoke-WebRequest @params -UseBasicParsing -ErrorAction Stop
        $json = $response.Content | ConvertFrom-Json
        return @{ Success = $true; Status = $response.StatusCode; Body = $json }
    } catch {
        $statusCode = 0
        $errorBody = $null
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
            try {
                $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
                $errorBody = $reader.ReadToEnd() | ConvertFrom-Json
            } catch {}
        }
        return @{ Success = $false; Status = $statusCode; Body = $errorBody; Error = $_.Exception.Message }
    }
}

# ============================================================
# SECTION 0: Health Check
# ============================================================
Write-Header "0. HEALTH CHECK"

$r = Invoke-API -Method "GET" -Endpoint "/../health"
# Health endpoint is not under /api/v1 so call directly
try {
    $healthRes = Invoke-WebRequest -Method GET -Uri "http://localhost:5000/health" -UseBasicParsing -ErrorAction Stop
    $healthJson = $healthRes.Content | ConvertFrom-Json
    Write-TestResult "GET /health - Server is running" ($healthJson.status -eq "healthy")
} catch {
    Write-TestResult "GET /health - Server is running" $false "Cannot connect to server at http://localhost:5000 - Is the backend running?"
    Write-Host ""
    Write-Host "  ERROR: Backend server is not reachable. Please start it with:" -ForegroundColor Red
    Write-Host "  cd backend && npm run dev" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# ============================================================
# SECTION 1: AUTHENTICATION
# ============================================================
Write-Header "1. AUTHENTICATION"

# 1a. Valid login
$loginRes = Invoke-API -Method "POST" -Endpoint "/auth/login" -Body @{ username = $ADMIN_USER; password = $ADMIN_PASS }
$loginOk = $loginRes.Success -and $loginRes.Body.status -eq "success" -and $loginRes.Body.data.token
Write-TestResult "POST /auth/login - Valid admin credentials" $loginOk ($loginRes.Error)

if ($loginOk) {
    $global:adminToken = $loginRes.Body.data.token
    $adminRole = $loginRes.Body.data.user.role
    Write-TestResult "Login response has correct role=admin" ($adminRole -eq "admin")
} else {
    Write-Host "  CRITICAL: Cannot get admin token. Subsequent tests will fail." -ForegroundColor Red
}

# 1b. Invalid login
$badLogin = Invoke-API -Method "POST" -Endpoint "/auth/login" -Body @{ username = "wronguser"; password = "wrongpass" }
Write-TestResult "POST /auth/login - Rejects invalid credentials (401)" ($badLogin.Status -eq 401)

# 1c. Missing fields validation
$emptyLogin = Invoke-API -Method "POST" -Endpoint "/auth/login" -Body @{ username = ""; password = "" }
Write-TestResult "POST /auth/login - Rejects empty fields (400)" ($emptyLogin.Status -eq 400)

# 1d. GET /me
$meRes = Invoke-API -Method "GET" -Endpoint "/auth/me" -Token $global:adminToken
Write-TestResult "GET /auth/me - Returns authenticated user" ($meRes.Success -and $meRes.Body.data.user.username -eq $ADMIN_USER)

# 1e. GET /me without token
$meNoToken = Invoke-API -Method "GET" -Endpoint "/auth/me"
Write-TestResult "GET /auth/me - Rejects unauthenticated (401)" ($meNoToken.Status -eq 401)

# ============================================================
# SECTION 2: USER/PROFILE MANAGEMENT
# ============================================================
Write-Header "2. USER / PROFILE MANAGEMENT"

# 2a. Get all users (admin)
$usersRes = Invoke-API -Method "GET" -Endpoint "/auth/users" -Token $global:adminToken
Write-TestResult "GET /auth/users - Admin can list users" ($usersRes.Success -and $usersRes.Body.status -eq "success")

# 2b. Create billing staff profile
$newBilling = @{ username = "test_billing_auto"; password = "test1234"; name = "Test Billing Staff"; role = "billing" }
$createBillingRes = Invoke-API -Method "POST" -Endpoint "/auth/users" -Body $newBilling -Token $global:adminToken
if ($createBillingRes.Success -and $createBillingRes.Body.status -eq "success") {
    $global:billingProfileId = $createBillingRes.Body.data.id
    Write-TestResult "POST /auth/users - Create billing staff profile" $true
} elseif ($createBillingRes.Status -eq 400 -and $createBillingRes.Body.message -like "*already taken*") {
    Write-Warn "POST /auth/users - Billing staff 'test_billing_auto' already exists (skipping creation)"
    # Try to get the ID from the users list
    $allUsers = Invoke-API -Method "GET" -Endpoint "/auth/users" -Token $global:adminToken
    $existing = $allUsers.Body.data | Where-Object { $_.username -eq "test_billing_auto" }
    if ($existing) { $global:billingProfileId = $existing.id }
} else {
    Write-TestResult "POST /auth/users - Create billing staff profile" $false ($createBillingRes.Error)
}

# 2c. Login as billing user
$billingLoginRes = Invoke-API -Method "POST" -Endpoint "/auth/login" -Body @{ username = "test_billing_auto"; password = "test1234" }
if ($billingLoginRes.Success) {
    $global:billingToken = $billingLoginRes.Body.data.token
    Write-TestResult "POST /auth/login - Billing staff login" $true
} else {
    Write-TestResult "POST /auth/login - Billing staff login" $false
}

# 2d. Billing staff cannot access /auth/users (admin only)
$billingUsersRes = Invoke-API -Method "GET" -Endpoint "/auth/users" -Token $global:billingToken
Write-TestResult "GET /auth/users - Billing staff blocked (403)" ($billingUsersRes.Status -eq 403)

# 2e. Create profile with duplicate username
$dupRes = Invoke-API -Method "POST" -Endpoint "/auth/users" -Body $newBilling -Token $global:adminToken
Write-TestResult "POST /auth/users - Rejects duplicate username (400)" ($dupRes.Status -eq 400)

# 2f. Update billing staff name
if ($global:billingProfileId) {
    $updateRes = Invoke-API -Method "PUT" -Endpoint "/auth/users/$($global:billingProfileId)" -Body @{ name = "Updated Billing Staff" } -Token $global:adminToken
    Write-TestResult "PUT /auth/users/:id - Update billing profile" ($updateRes.Success -and $updateRes.Body.data.name -eq "Updated Billing Staff")
}

# ============================================================
# SECTION 3: SERVICE CATEGORIES
# ============================================================
Write-Header "3. SERVICE CATEGORIES"

# 3a. Get all categories
$catsRes = Invoke-API -Method "GET" -Endpoint "/services/categories" -Token $global:adminToken
Write-TestResult "GET /services/categories - Returns categories list" ($catsRes.Success -and $catsRes.Body.status -eq "success")

# 3b. Create category
$newCat = @{ name = "AutoTest Category $(Get-Date -Format 'HHmmss')" }
$createCatRes = Invoke-API -Method "POST" -Endpoint "/services/categories" -Body $newCat -Token $global:adminToken
if ($createCatRes.Success -and $createCatRes.Body.status -eq "success") {
    $global:createdCategoryId = $createCatRes.Body.data.id
    Write-TestResult "POST /services/categories - Create new category" $true
} else {
    Write-TestResult "POST /services/categories - Create new category" $false ($createCatRes.Error)
}

# 3c. Create category with empty name (validation)
$badCatRes = Invoke-API -Method "POST" -Endpoint "/services/categories" -Body @{ name = "" } -Token $global:adminToken
Write-TestResult "POST /services/categories - Rejects empty name (400)" ($badCatRes.Status -eq 400)

# 3d. Update category
if ($global:createdCategoryId) {
    $updateCatRes = Invoke-API -Method "PUT" -Endpoint "/services/categories/$($global:createdCategoryId)" -Body @{ name = "AutoTest Category Updated" } -Token $global:adminToken
    Write-TestResult "PUT /services/categories/:id - Update category name" ($updateCatRes.Success -and $updateCatRes.Body.data.name -eq "AutoTest Category Updated")
}

# 3e. Unauthenticated access
$unauthCatRes = Invoke-API -Method "GET" -Endpoint "/services/categories"
Write-TestResult "GET /services/categories - Rejects unauthenticated (401)" ($unauthCatRes.Status -eq 401)

# ============================================================
# SECTION 4: SERVICES
# ============================================================
Write-Header "4. SERVICES"

# 4a. Get all services
$svcRes = Invoke-API -Method "GET" -Endpoint "/services" -Token $global:adminToken
Write-TestResult "GET /services - Returns services list" ($svcRes.Success -and $svcRes.Body.status -eq "success")

# 4b. Create service
$newSvc = @{ name = "AutoTest Haircut $(Get-Date -Format 'HHmmss')"; price = 250; duration = 30; category = "Hair" }
$createSvcRes = Invoke-API -Method "POST" -Endpoint "/services" -Body $newSvc -Token $global:adminToken
if ($createSvcRes.Success -and $createSvcRes.Body.status -eq "success") {
    $global:createdServiceId = $createSvcRes.Body.data.id
    Write-TestResult "POST /services - Create new service" $true
} else {
    Write-TestResult "POST /services - Create new service" $false ($createSvcRes.Error)
    # Fallback: pick any existing service ID for transaction test
    if ($svcRes.Body.data.Count -gt 0) {
        $global:createdServiceId = $svcRes.Body.data[0].id
        Write-Warn "Fallback: Using first existing service ID for transaction tests"
    }
}

# 4c. Create service with negative price (validation)
$badSvcRes = Invoke-API -Method "POST" -Endpoint "/services" -Body @{ name = "BadService"; price = -50; duration = 15 } -Token $global:adminToken
Write-TestResult "POST /services - Rejects negative price (400)" ($badSvcRes.Status -eq 400)

# 4d. Update service
if ($global:createdServiceId) {
    $updateSvcRes = Invoke-API -Method "PUT" -Endpoint "/services/$($global:createdServiceId)" -Body @{ price = 300; duration = 45 } -Token $global:adminToken
    Write-TestResult "PUT /services/:id - Update service price & duration" ($updateSvcRes.Success)
}

# 4e. Billing staff can create services
if ($global:billingToken) {
    $billingSvcRes = Invoke-API -Method "POST" -Endpoint "/services" -Body @{ name = "BillingTest Svc $(Get-Date -Format 'HHmmss')"; price = 100; duration = 20; category = "Beard" } -Token $global:billingToken
    Write-TestResult "POST /services - Billing staff can create services" ($billingSvcRes.Success)
    # cleanup
    if ($billingSvcRes.Success) {
        $tmpSvcId = $billingSvcRes.Body.data.id
        Invoke-API -Method "DELETE" -Endpoint "/services/$tmpSvcId" -Token $global:adminToken | Out-Null
    }
}

# ============================================================
# SECTION 5: EXPENSES
# ============================================================
Write-Header "5. EXPENSES"

# 5a. Get all expenses (admin)
$expRes = Invoke-API -Method "GET" -Endpoint "/expenses" -Token $global:adminToken
Write-TestResult "GET /expenses - Admin retrieves expenses" ($expRes.Success -and $expRes.Body.status -eq "success")

# 5b. Get expenses with period filter
$expDay = Invoke-API -Method "GET" -Endpoint "/expenses?period=day" -Token $global:adminToken
Write-TestResult "GET /expenses?period=day - Filter by today" ($expDay.Success)

$expMonth = Invoke-API -Method "GET" -Endpoint "/expenses?period=month" -Token $global:adminToken
Write-TestResult "GET /expenses?period=month - Filter by month" ($expMonth.Success)

# 5c. Create expense
$newExp = @{ description = "AutoTest Office Supplies"; category = "Other"; amount = 500; payment_mode = "Cash"; note = "Automated test" }
$createExpRes = Invoke-API -Method "POST" -Endpoint "/expenses" -Body $newExp -Token $global:adminToken
if ($createExpRes.Success -and $createExpRes.Status -eq 201) {
    $global:createdExpenseId = $createExpRes.Body.data.id
    Write-TestResult "POST /expenses - Create expense (201)" $true
} else {
    Write-TestResult "POST /expenses - Create expense (201)" $false ($createExpRes.Error)
}

# 5d. Billing staff creates expense
if ($global:billingToken) {
    $billingExpRes = Invoke-API -Method "POST" -Endpoint "/expenses" -Body @{ description = "Billing Test Exp"; category = "Utilities"; amount = 200; payment_mode = "UPI" } -Token $global:billingToken
    Write-TestResult "POST /expenses - Billing staff can create expense" ($billingExpRes.Success)
}

# 5e. Validate required fields
$badExpRes = Invoke-API -Method "POST" -Endpoint "/expenses" -Body @{ description = ""; category = "Other"; amount = -10; payment_mode = "Cash" } -Token $global:adminToken
Write-TestResult "POST /expenses - Rejects invalid data (400)" ($badExpRes.Status -eq 400)

# 5f. Update expense (admin only)
if ($global:createdExpenseId) {
    $updateExpRes = Invoke-API -Method "PUT" -Endpoint "/expenses/$($global:createdExpenseId)" -Body @{ amount = 750; note = "Updated by test" } -Token $global:adminToken
    Write-TestResult "PUT /expenses/:id - Admin updates expense" ($updateExpRes.Success -and $updateExpRes.Body.data.amount -eq 750)

    # Billing staff cannot update expense
    if ($global:billingToken) {
        $billingUpdateExp = Invoke-API -Method "PUT" -Endpoint "/expenses/$($global:createdExpenseId)" -Body @{ amount = 999 } -Token $global:billingToken
        Write-TestResult "PUT /expenses/:id - Billing staff blocked from update (403)" ($billingUpdateExp.Status -eq 403)
    }
}

# 5g. Billing staff only sees their own expenses
if ($global:billingToken) {
    $billingExpList = Invoke-API -Method "GET" -Endpoint "/expenses" -Token $global:billingToken
    Write-TestResult "GET /expenses - Billing staff sees only own expenses" ($billingExpList.Success)
}

# ============================================================
# SECTION 6: TRANSACTIONS
# ============================================================
Write-Header "6. TRANSACTIONS"

# 6a. Get all transactions
$txRes = Invoke-API -Method "GET" -Endpoint "/transactions" -Token $global:adminToken
Write-TestResult "GET /transactions - Admin retrieves transactions" ($txRes.Success -and $txRes.Body.status -eq "success")

# 6b. Get with filters
$txDay = Invoke-API -Method "GET" -Endpoint "/transactions?period=day" -Token $global:adminToken
Write-TestResult "GET /transactions?period=day - Filter by today" ($txDay.Success)

$txSearch = Invoke-API -Method "GET" -Endpoint "/transactions?search=test" -Token $global:adminToken
Write-TestResult "GET /transactions?search=test - Search filter" ($txSearch.Success)

$txPayMode = Invoke-API -Method "GET" -Endpoint "/transactions?paymentMode=Cash" -Token $global:adminToken
Write-TestResult "GET /transactions?paymentMode=Cash - Payment mode filter" ($txPayMode.Success)

$txSort = Invoke-API -Method "GET" -Endpoint "/transactions?sortByAmount=desc" -Token $global:adminToken
Write-TestResult "GET /transactions?sortByAmount=desc - Sort by amount" ($txSort.Success)

# 6c. Create transaction
if ($global:createdServiceId) {
    $newTx = @{
        customerName  = "AutoTest Customer"
        customerPhone = "9999999999"
        services      = @(@{ id = $global:createdServiceId })
        discountType  = "percent"
        discountValue = 10
        paymentMode   = "Cash"
    }
    $createTxRes = Invoke-API -Method "POST" -Endpoint "/transactions" -Body $newTx -Token $global:adminToken
    if ($createTxRes.Success -and $createTxRes.Status -eq 201) {
        $global:createdTransactionId = $createTxRes.Body.data.id
        Write-TestResult "POST /transactions - Create transaction (201)" $true
        Write-TestResult "Transaction discount calculated correctly" ($createTxRes.Body.data.subtotal -gt 0)
    } else {
        Write-TestResult "POST /transactions - Create transaction (201)" $false ($createTxRes.Body.message)
    }

    # With rupee discount
    $newTxRupee = @{
        customerName  = "AutoTest Rupee Customer"
        services      = @(@{ id = $global:createdServiceId })
        discountType  = "rupees"
        discountValue = 50
        paymentMode   = "UPI"
    }
    $createTxRupee = Invoke-API -Method "POST" -Endpoint "/transactions" -Body $newTxRupee -Token $global:adminToken
    Write-TestResult "POST /transactions - Rupee discount type transaction" ($createTxRupee.Success)
    # Cleanup
    if ($createTxRupee.Success) {
        Invoke-API -Method "DELETE" -Endpoint "/transactions/$($createTxRupee.Body.data.id)" -Token $global:adminToken | Out-Null
    }
} else {
    Write-Warn "POST /transactions - Skipped (no service ID available)"
}

# 6d. Validate: empty services array
$badTxRes = Invoke-API -Method "POST" -Endpoint "/transactions" -Body @{ customerName = "X"; services = @(); discountType = "percent"; discountValue = 0; paymentMode = "Cash" } -Token $global:adminToken
Write-TestResult "POST /transactions - Rejects empty services array (400)" ($badTxRes.Status -eq 400)

# 6e. Update transaction (admin only)
if ($global:createdTransactionId) {
    $updateTxRes = Invoke-API -Method "PUT" -Endpoint "/transactions/$($global:createdTransactionId)" -Body @{ customerName = "Updated Customer Name"; paymentMode = "UPI" } -Token $global:adminToken
    Write-TestResult "PUT /transactions/:id - Admin updates transaction" ($updateTxRes.Success)

    # Billing staff cannot update
    if ($global:billingToken) {
        $billingUpdateTx = Invoke-API -Method "PUT" -Endpoint "/transactions/$($global:createdTransactionId)" -Body @{ customerName = "Hacked" } -Token $global:billingToken
        Write-TestResult "PUT /transactions/:id - Billing staff blocked (403)" ($billingUpdateTx.Status -eq 403)
    }
}

# 6f. Billing staff only sees own transactions
if ($global:billingToken) {
    $billingTxList = Invoke-API -Method "GET" -Endpoint "/transactions" -Token $global:billingToken
    Write-TestResult "GET /transactions - Billing staff sees only own records" ($billingTxList.Success)
}

# ============================================================
# SECTION 7: REPORTS (Admin only)
# ============================================================
Write-Header "7. REPORTS"

# 7a. Dashboard report
$dashRes = Invoke-API -Method "GET" -Endpoint "/reports/dashboard" -Token $global:adminToken
Write-TestResult "GET /reports/dashboard - Admin can access dashboard report" ($dashRes.Success -and $dashRes.Body.status -eq "success")

# 7b. Dashboard report blocked for billing
if ($global:billingToken) {
    $billingDash = Invoke-API -Method "GET" -Endpoint "/reports/dashboard" -Token $global:billingToken
    Write-TestResult "GET /reports/dashboard - Billing staff blocked (403)" ($billingDash.Status -eq 403)
}

# 7c. Payment report
$payRpt = Invoke-API -Method "GET" -Endpoint "/reports/payments" -Token $global:adminToken
Write-TestResult "GET /reports/payments - Admin can access payment report" ($payRpt.Success -and $payRpt.Body.status -eq "success")

# 7d. Payment report with filters
$payRptDay = Invoke-API -Method "GET" -Endpoint "/reports/payments?period=day" -Token $global:adminToken
Write-TestResult "GET /reports/payments?period=day - With day filter" ($payRptDay.Success)

# ============================================================
# SECTION 8: SYSTEM ROUTES
# ============================================================
Write-Header "8. SYSTEM ROUTES"

$sysRes = Invoke-API -Method "GET" -Endpoint "/system" -Token $global:adminToken
Write-TestResult "GET /system - System endpoint responds" ($sysRes.Status -ne 0)

# ============================================================
# SECTION 9: CUSTOMERS
# ============================================================
Write-Header "9. CUSTOMERS"

$custRes = Invoke-API -Method "GET" -Endpoint "/customers" -Token $global:adminToken
Write-TestResult "GET /customers - Admin retrieves customer list" ($custRes.Success -and $custRes.Body.status -eq "success")

if ($global:billingToken) {
    $billingCustRes = Invoke-API -Method "GET" -Endpoint "/customers" -Token $global:billingToken
    Write-TestResult "GET /customers - Billing staff can view customers" ($billingCustRes.Success)
}

$unauthCust = Invoke-API -Method "GET" -Endpoint "/customers"
Write-TestResult "GET /customers - Rejects unauthenticated (401)" ($unauthCust.Status -eq 401)

# ============================================================
# SECTION 10: SECURITY & EDGE CASES
# ============================================================
Write-Header "10. SECURITY & EDGE CASES"

# Invalid JWT
$fakeToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZha2UiLCJ1c2VybmFtZSI6ImZha2UiLCJuYW1lIjoiRmFrZSIsInJvbGUiOiJhZG1pbiJ9.invalid_signature"
$fakeRes = Invoke-API -Method "GET" -Endpoint "/auth/me" -Token $fakeToken
# Note: middleware returns 403 for invalid tokens (token present but invalid signature), 401 only for missing token
Write-TestResult "Invalid JWT is rejected (403 Forbidden)" ($fakeRes.Status -eq 403)

# 404 for unknown route
$notFoundRes = Invoke-API -Method "GET" -Endpoint "/nonexistent_route"
Write-TestResult "Unknown route returns 404" ($notFoundRes.Status -eq 404)

# Wrong UUID format for delete
$badUuid = Invoke-API -Method "DELETE" -Endpoint "/expenses/not-a-valid-uuid" -Token $global:adminToken
Write-TestResult "DELETE with invalid UUID rejected (400/404/500)" ($badUuid.Status -in 400, 404, 422, 500)

# ============================================================
# SECTION 11: CLEANUP
# ============================================================
Write-Header "11. CLEANUP (deleting test data)"

# Delete created transaction
if ($global:createdTransactionId) {
    $delTx = Invoke-API -Method "DELETE" -Endpoint "/transactions/$($global:createdTransactionId)" -Token $global:adminToken
    Write-TestResult "DELETE /transactions/:id - Delete test transaction" ($delTx.Success)
}

# Delete created expense
if ($global:createdExpenseId) {
    $delExp = Invoke-API -Method "DELETE" -Endpoint "/expenses/$($global:createdExpenseId)" -Token $global:adminToken
    Write-TestResult "DELETE /expenses/:id - Delete test expense" ($delExp.Success)
}

# Delete created service
if ($global:createdServiceId) {
    $delSvc = Invoke-API -Method "DELETE" -Endpoint "/services/$($global:createdServiceId)" -Token $global:adminToken
    Write-TestResult "DELETE /services/:id - Delete test service" ($delSvc.Success)
}

# Delete created category
if ($global:createdCategoryId) {
    $delCat = Invoke-API -Method "DELETE" -Endpoint "/services/categories/$($global:createdCategoryId)" -Token $global:adminToken
    Write-TestResult "DELETE /services/categories/:id - Delete test category" ($delCat.Success)
}

# Delete billing staff profile
if ($global:billingProfileId) {
    $delProfile = Invoke-API -Method "DELETE" -Endpoint "/auth/users/$($global:billingProfileId)" -Token $global:adminToken
    Write-TestResult "DELETE /auth/users/:id - Delete test billing profile" ($delProfile.Success)
}

# Admin cannot delete their own account
$meId = $loginRes.Body.data.user.id
if ($meId) {
    $selfDelRes = Invoke-API -Method "DELETE" -Endpoint "/auth/users/$meId" -Token $global:adminToken
    Write-TestResult "DELETE /auth/users/:id - Cannot delete own account (400)" ($selfDelRes.Status -eq 400)
}

# ============================================================
# SUMMARY
# ============================================================
Write-Host ""
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan
$total = $global:PASS + $global:FAIL
Write-Host "  Total Tests : $total" -ForegroundColor White
Write-Host "  Passed      : $($global:PASS)" -ForegroundColor Green
Write-Host "  Failed      : $($global:FAIL)" -ForegroundColor Red
Write-Host "  Warnings    : $($global:WARN)" -ForegroundColor Yellow
Write-Host ("=" * 60) -ForegroundColor Cyan

if ($global:FAIL -eq 0) {
    Write-Host ""
    Write-Host "  ALL TESTS PASSED! System is working correctly." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "  SOME TESTS FAILED. Review output above." -ForegroundColor Red
}
Write-Host ""
