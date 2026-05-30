# HRI Companion Demo - one-click start (Windows PowerShell)
Set-Location $PSScriptRoot

$env:FACE_MODEL_NAME = "buffalo_s"
$env:PYTHON_BIN = "python"
$env:IDENTITY_TIMEOUT_MS = "180000"
$env:FACE_MATCH_THRESHOLD = "0.45"
$env:PORT = "8173"

Write-Host "Checking Python + InsightFace..."
python -c "import cv2, insightface; print('Python OK:', insightface.__file__)" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Installing Python deps (first time may take a few minutes)..." -ForegroundColor Yellow
  python -m pip install insightface opencv-python onnxruntime
}

Write-Host ""
Write-Host "Starting server at http://127.0.0.1:8173/" -ForegroundColor Cyan
Write-Host "Open in browser: http://127.0.0.1:8173/" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host ""

node server.mjs
