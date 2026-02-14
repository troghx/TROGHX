param(
  [int]$Port = 8888,
  [string]$DatabaseUrl = "",
  [string]$AuthToken = "",
  [string]$GoogleServiceAccountJson = "",
  [string]$GofileApiToken = ""
)

$ErrorActionPreference = "Stop"

function Import-EnvFile {
  param([string]$Path)

  if (-not (Test-Path $Path)) { return }

  Get-Content -Path $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line) { return }
    if ($line.StartsWith("#")) { return }
    if ($line -notmatch "=") { return }

    $parts = $line.Split("=", 2)
    if ($parts.Count -ne 2) { return }

    $key = $parts[0].Trim()
    $val = $parts[1].Trim()
    if (-not $key) { return }

    if (
      ($val.StartsWith('"') -and $val.EndsWith('"')) -or
      ($val.StartsWith("'") -and $val.EndsWith("'"))
    ) {
      if ($val.Length -ge 2) {
        $val = $val.Substring(1, $val.Length - 2)
      }
    }

    if (-not (Get-Item "Env:$key" -ErrorAction SilentlyContinue)) {
      Set-Item -Path "Env:$key" -Value $val
    }
  }
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

# Carga opcional de variables locales sin commitear.
Import-EnvFile (Join-Path $root ".env.local")

if ($DatabaseUrl) { $env:DATABASE_URL = $DatabaseUrl }
if ($AuthToken) { $env:AUTH_TOKEN = $AuthToken }
if ($GoogleServiceAccountJson) { $env:GOOGLE_SERVICE_ACCOUNT_JSON = $GoogleServiceAccountJson }
if ($GofileApiToken) { $env:GOFILE_API_TOKEN = $GofileApiToken }

if (-not $env:DATABASE_URL) {
  $enteredDb = Read-Host "Pega DATABASE_URL (Neon)"
  if ($enteredDb) { $env:DATABASE_URL = $enteredDb.Trim() }
}

if (-not $env:AUTH_TOKEN) {
  Write-Host "Aviso: AUTH_TOKEN no esta seteado (admin create/update/delete fallara)." -ForegroundColor Yellow
}

if (-not $env:DATABASE_URL) {
  Write-Host "Error: falta DATABASE_URL." -ForegroundColor Red
  exit 1
}

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  Write-Host "Error: no se encontro npx en PATH." -ForegroundColor Red
  exit 1
}

Write-Host "Iniciando Netlify Dev en http://localhost:$Port" -ForegroundColor Cyan
Write-Host "Root: $root"
Write-Host "DATABASE_URL: configurado"
if ($env:AUTH_TOKEN) {
  Write-Host "AUTH_TOKEN: configurado"
}

npx --yes netlify-cli@latest dev --port $Port
