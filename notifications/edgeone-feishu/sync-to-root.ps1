param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\\..")).Path
)

$source = Join-Path $PSScriptRoot "cloud-functions"
$target = Join-Path $ProjectRoot "cloud-functions"

if (-not (Test-Path -LiteralPath $source)) {
  throw "Source folder not found: $source"
}

New-Item -ItemType Directory -Path $target -Force | Out-Null
Copy-Item -Path (Join-Path $source "*") -Destination $target -Recurse -Force

Write-Host "Synced Cloud Functions to: $target"
