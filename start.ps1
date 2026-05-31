# HRI Companion Demo - one-click start (Windows PowerShell)
Set-Location $PSScriptRoot
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()

$envFile = Join-Path $PSScriptRoot ".env"
$envExample = Join-Path $PSScriptRoot ".env.example"

if (-not (Test-Path $envFile)) {
  Copy-Item $envExample $envFile
  Write-Host "[setup] Created .env from .env.example — edit LLM_API_KEY then rerun." -ForegroundColor Yellow
  Write-Host ""
}

function Import-DotEnv([string]$Path) {
  if (-not (Test-Path $Path)) { return }
  $text = [System.IO.File]::ReadAllText($Path)
  $text = $text.TrimStart([char]0xFEFF)
  foreach ($rawLine in $text -split "`r?`n") {
    $line = $rawLine.Trim()
    if (-not $line -or $line.StartsWith('#') -or $line -notmatch '=') { continue }
    $eq = $line.IndexOf('=')
    $name = $line.Substring(0, $eq).Trim().Trim([char]0xFEFF)
    $value = $line.Substring($eq + 1).Trim().Trim('"').Trim("'")
    if ($name) { Set-Item -Path "Env:$name" -Value $value -Force }
  }
}

Import-DotEnv $envFile

$env:FACE_MODEL_NAME = if ($env:FACE_MODEL_NAME) { $env:FACE_MODEL_NAME } else { "buffalo_s" }
$env:PYTHON_BIN = if ($env:PYTHON_BIN) { $env:PYTHON_BIN } else { "python" }
$env:IDENTITY_TIMEOUT_MS = if ($env:IDENTITY_TIMEOUT_MS) { $env:IDENTITY_TIMEOUT_MS } else { "180000" }
$env:FACE_MATCH_THRESHOLD = if ($env:FACE_MATCH_THRESHOLD) { $env:FACE_MATCH_THRESHOLD } else { "0.45" }
$env:PORT = if ($env:PORT) { $env:PORT } else { "8173" }
$env:LLM_BASE_URL = if ($env:LLM_BASE_URL) { $env:LLM_BASE_URL } else { "https://api.openai.com/v1" }
$env:LLM_MODEL = if ($env:LLM_MODEL) { $env:LLM_MODEL } else { "gpt-4o" }
$env:LLM_WIRE_API = if ($env:LLM_WIRE_API) { $env:LLM_WIRE_API } else { "responses" }

$key = $env:LLM_API_KEY
if (-not $key -or $key -match 'your-.*-key|^sk-\.\.\.$|^changeme$|^placeholder$') {
  Write-Host "[vlm] NOT configured — edit .env LLM_API_KEY (vision model required for object detection)" -ForegroundColor Red
} else {
  Write-Host "[vlm] OK: $($env:LLM_MODEL) @ $($env:LLM_BASE_URL) ($($env:LLM_WIRE_API))" -ForegroundColor Green
}

$port = [int]$env:PORT
$listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($listeners) {
  $pids = $listeners.OwningProcess | Sort-Object -Unique
  foreach ($procId in $pids) {
    $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
    if ($proc -and $proc.ProcessName -eq 'node') {
      Write-Host "[port] Stopping old node on :$port (pid $procId)..." -ForegroundColor Yellow
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
      Start-Sleep -Seconds 1
    } else {
      Write-Host "[port] ERROR: port $port in use by pid $procId ($($proc.ProcessName)). Stop it manually." -ForegroundColor Red
      exit 1
    }
  }
}

Write-Host "Checking Python + InsightFace..."
python -c "import cv2, insightface; print('Python OK:', insightface.__file__)" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Installing Python deps (first time may take a few minutes)..." -ForegroundColor Yellow
  python -m pip install insightface opencv-python onnxruntime
}

Write-Host ""
Write-Host "Starting server at http://127.0.0.1:$port/" -ForegroundColor Cyan
Write-Host "Open in browser: http://127.0.0.1:$port/" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host ""

node server.mjs
