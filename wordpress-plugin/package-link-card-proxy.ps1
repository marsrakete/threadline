$ErrorActionPreference = "Stop"

$pluginSlug = "threadline-link-card-proxy"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceDir = Join-Path $root $pluginSlug
$zipPath = Join-Path $root "$pluginSlug.zip"

if (-not (Test-Path -LiteralPath $sourceDir -PathType Container)) {
    throw "Plugin source directory not found: $sourceDir"
}

if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    $sourcePrefix = $sourceDir.TrimEnd("\", "/") + [System.IO.Path]::DirectorySeparatorChar
    Get-ChildItem -LiteralPath $sourceDir -Recurse -File | ForEach-Object {
        $relativePath = $_.FullName.Substring($sourcePrefix.Length)
        $entryName = "$pluginSlug/" + ($relativePath -replace "\\", "/")
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entryName, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
} finally {
    $zip.Dispose()
}

Write-Host "Created $zipPath"
