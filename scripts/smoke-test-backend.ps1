<#
.SYNOPSIS
  Starts the PyInstaller backend exactly as the desktop app does and checks it.
#>
param(
    [string]$Executable = (Join-Path $PSScriptRoot '..\backend\dist\server\server.exe'),
    [string]$TesseractDir = (Join-Path $PSScriptRoot '..\vendor\tesseract')
)
$ErrorActionPreference = 'Stop'

$data = Join-Path ([System.IO.Path]::GetTempPath()) ("libradigit-smoke-" + [guid]::NewGuid())
$token = [guid]::NewGuid().ToString('N')
$env:LIBRADIGIT_API_TOKEN = $token
$env:LIBRADIGIT_DATABASE = Join-Path $data 'libradigit.db'
$env:LIBRADIGIT_UPLOAD_FOLDER = Join-Path $data 'uploads'
$env:LIBRADIGIT_ARCHIVE_FOLDER = Join-Path $data 'Archive'
if (Test-Path (Join-Path $TesseractDir 'tesseract.exe')) {
    $env:LIBRADIGIT_TESSERACT_CMD = Join-Path $TesseractDir 'tesseract.exe'
    $env:TESSDATA_PREFIX = Join-Path $TesseractDir 'tessdata'
}

$proc = Start-Process -FilePath $Executable -PassThru -NoNewWindow `
    -RedirectStandardOutput (Join-Path $env:TEMP 'backend-out.txt') -RedirectStandardError (Join-Path $env:TEMP 'backend-err.txt')
try {
    $health = $null
    for ($i = 0; $i -lt 90 -and -not $health; $i++) {
        Start-Sleep -Seconds 1
        # A crashed backend will never answer; stop waiting and show why.
        if ($proc.HasExited) { break }
        try { $health = Invoke-RestMethod 'http://127.0.0.1:5001/api/health' } catch { }
    }
    if (-not $health) {
        Write-Host '--- backend stdout ---'
        Get-Content (Join-Path $env:TEMP 'backend-out.txt') -ErrorAction SilentlyContinue | Select-Object -Last 40
        Write-Host '--- backend stderr ---'
        Get-Content (Join-Path $env:TEMP 'backend-err.txt') -ErrorAction SilentlyContinue | Select-Object -Last 40
        if ($proc.HasExited) { throw "Backend exited with code $($proc.ExitCode) before becoming healthy" }
        throw 'Backend did not become healthy'
    }
    Write-Host "Health: $($health | ConvertTo-Json -Compress)"
    if ($env:LIBRADIGIT_TESSERACT_CMD -and -not $health.tesseract) { throw 'Bundled Tesseract was not detected' }

    try {
        Invoke-RestMethod 'http://127.0.0.1:5001/api/projects' | Out-Null
        throw 'API answered without the token'
    } catch [Microsoft.PowerShell.Commands.HttpResponseException] {
        if ($_.Exception.Response.StatusCode.value__ -ne 401) { throw }
    }
    $projects = Invoke-RestMethod 'http://127.0.0.1:5001/api/projects' -Headers @{ 'X-LibraDigit-Token' = $token }
    Write-Host "Authorized request OK ($($projects.projects.Count) projects)"
} finally {
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
}
