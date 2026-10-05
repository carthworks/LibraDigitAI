<#
.SYNOPSIS
  Copies a Tesseract OCR install into vendor/tesseract for the Windows installer.

.DESCRIPTION
  Uses an existing install under "C:\Program Files\Tesseract-OCR" or installs the
  UB Mannheim build with Chocolatey, then adds the language packs the app offers
  (tessdata_fast models). electron-builder ships vendor/tesseract as
  resources/tesseract, and the Electron shell points the backend at it.
#>
param(
    [string[]]$Languages = @('eng', 'osd', 'spa', 'fra', 'deu', 'ita', 'por', 'hin', 'chi_sim', 'jpn', 'rus'),
    [string]$Destination = (Join-Path $PSScriptRoot '..\vendor\tesseract')
)
$ErrorActionPreference = 'Stop'

$source = 'C:\Program Files\Tesseract-OCR'
if (-not (Test-Path (Join-Path $source 'tesseract.exe'))) {
    Write-Host 'Installing Tesseract with Chocolatey...'
    choco install tesseract -y --no-progress
    if ($LASTEXITCODE -ne 0) { throw 'Chocolatey install of tesseract failed' }
}

if (Test-Path $Destination) { Remove-Item $Destination -Recurse -Force }
New-Item -ItemType Directory -Path $Destination | Out-Null
Copy-Item -Path (Join-Path $source '*') -Destination $Destination -Recurse -Force
# The uninstaller and docs are not needed inside our installer.
Get-ChildItem $Destination -Filter 'unins*' | Remove-Item -Force
if (Test-Path (Join-Path $Destination 'doc')) { Remove-Item (Join-Path $Destination 'doc') -Recurse -Force }

$tessdata = Join-Path $Destination 'tessdata'
New-Item -ItemType Directory -Path $tessdata -Force | Out-Null
foreach ($lang in $Languages) {
    $target = Join-Path $tessdata "$lang.traineddata"
    if (-not (Test-Path $target)) {
        $url = "https://github.com/tesseract-ocr/tessdata_fast/raw/main/$lang.traineddata"
        Write-Host "Downloading $lang"
        Invoke-WebRequest -Uri $url -OutFile $target -UseBasicParsing
    }
}

$exe = Join-Path $Destination 'tesseract.exe'
$env:TESSDATA_PREFIX = $tessdata
$installed = & $exe --list-langs 2>&1 | Select-Object -Skip 1
$missing = $Languages | Where-Object { $installed -notcontains $_ }
if ($missing) { throw "Missing language packs: $($missing -join ', ')" }
Write-Host "Bundled Tesseract with languages: $($installed -join ', ')"
