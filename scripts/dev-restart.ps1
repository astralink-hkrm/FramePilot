$ErrorActionPreference = "Stop"

$project = Split-Path -Parent $PSScriptRoot
Write-Host "Restarting S2C dev server in $project"

$escapedProject = $project.Replace("\", "\\")
$processes = Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -and
  $_.CommandLine -like "*$project*" -and
  ($_.CommandLine -like "*next*" -or $_.CommandLine -like "*node_modules*next*")
}

foreach ($proc in $processes) {
  try {
    Write-Host "Stopping PID $($proc.ProcessId): $($proc.Name)"
    Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
  } catch {}
}

Start-Sleep -Seconds 1

$nextPath = Join-Path $project ".next"
$resolvedProject = (Resolve-Path -LiteralPath $project).Path
$resolvedNext = Resolve-Path -LiteralPath $nextPath -ErrorAction SilentlyContinue
if ($resolvedNext -and $resolvedNext.Path.StartsWith($resolvedProject, [StringComparison]::OrdinalIgnoreCase)) {
  Write-Host "Clearing stale .next cache"
  Remove-Item -LiteralPath $resolvedNext.Path -Recurse -Force
}

$out = Join-Path $project "next-dev.out.log"
$err = Join-Path $project "next-dev.err.log"
if (Test-Path -LiteralPath $out) { Remove-Item -LiteralPath $out -Force }
if (Test-Path -LiteralPath $err) { Remove-Item -LiteralPath $err -Force }

$server = Start-Process -WindowStyle Hidden -FilePath "npm.cmd" -ArgumentList @("run", "dev") -WorkingDirectory $project -RedirectStandardOutput $out -RedirectStandardError $err -PassThru
Write-Host "Started npm run dev as PID $($server.Id)"
Start-Sleep -Seconds 8

try {
  $response = Invoke-WebRequest -UseBasicParsing "http://localhost:3000/sign-in" -TimeoutSec 20
  Write-Host "Ready: http://localhost:3000/sign-in returned $($response.StatusCode)"
} catch {
  Write-Host "Dev server is starting, but did not answer yet: $($_.Exception.Message)"
}

Write-Host "Logs:"
Write-Host "  $out"
Write-Host "  $err"