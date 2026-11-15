param(
    [switch]$SkipInstall,
    [switch]$DeployVercel
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $RepoRoot

try {
    if (-not $SkipInstall) {
        Write-Host "=== [1/4] Install Dependencies ===" -ForegroundColor Cyan
        npm ci
        if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
    } else {
        Write-Host "=== [1/4] Install Dependencies (Skipped) ===" -ForegroundColor Yellow
    }

    Write-Host "=== [2/4] ESLint ===" -ForegroundColor Cyan
    npm run lint
    if ($LASTEXITCODE -ne 0) { throw "npm run lint failed" }

    Write-Host "=== [3/4] Vitest ===" -ForegroundColor Cyan
    npm test
    if ($LASTEXITCODE -ne 0) { throw "npm test failed" }

    Write-Host "=== [4/4] Production Build ===" -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }

    if ($DeployVercel) {
        Write-Host "=== [Deploy] Vercel Production ===" -ForegroundColor Cyan
        $vercel = Get-Command vercel -ErrorAction SilentlyContinue
        if (-not $vercel) {
            throw "Vercel CLI is not installed. Run 'npm i -g vercel' and 'vercel login' first."
        }
        vercel --prod
        if ($LASTEXITCODE -ne 0) { throw "vercel --prod failed" }
    }

    Write-Host "Web local CI/CD completed successfully!" -ForegroundColor Green
} finally {
    Pop-Location
}
