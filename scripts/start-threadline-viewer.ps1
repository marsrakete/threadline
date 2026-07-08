[CmdletBinding()]
param(
  [string]$ArchiveDirectory = "",
  [string]$DatabasePath = "",
  [string]$PhpExePath = "",
  [int]$Port = 8787,
  [switch]$OpenBrowser
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-PhpPath {
  param([string]$PathValue)
  if (-not [string]::IsNullOrWhiteSpace($PathValue)) {
    $resolved = [System.IO.Path]::GetFullPath($PathValue)
    if (-not (Test-Path -LiteralPath $resolved -PathType Leaf)) {
      throw "php.exe not found at: $resolved"
    }
    return $resolved
  }

  $command = Get-Command php.exe -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $wingetRoot = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages"
  if (Test-Path -LiteralPath $wingetRoot -PathType Container) {
    $candidate = Get-ChildItem -LiteralPath $wingetRoot -Recurse -Filter php.exe -ErrorAction SilentlyContinue |
      Select-Object -First 1 -ExpandProperty FullName
    if ($candidate) {
      return $candidate
    }
  }

  throw "php.exe was not found. Install PHP or pass -PhpExePath."
}

function Resolve-ArchiveDirectory {
  param(
    [string]$ArchiveValue,
    [string]$DatabaseValue
  )

  if (-not [string]::IsNullOrWhiteSpace($ArchiveValue)) {
    $resolved = [System.IO.Path]::GetFullPath($ArchiveValue)
    if (-not (Test-Path -LiteralPath $resolved -PathType Container)) {
      throw "Archive directory not found: $resolved"
    }
    return $resolved
  }

  if (-not [string]::IsNullOrWhiteSpace($DatabaseValue)) {
    $resolvedDb = [System.IO.Path]::GetFullPath($DatabaseValue)
    if (-not (Test-Path -LiteralPath $resolvedDb -PathType Leaf)) {
      throw "Database not found: $resolvedDb"
    }
    return [System.IO.Path]::GetDirectoryName($resolvedDb)
  }

  $current = (Get-Location).Path
  if (Test-Path -LiteralPath (Join-Path $current "threadline-archive.sqlite") -PathType Leaf) {
    return $current
  }

  throw "Pass -ArchiveDirectory or -DatabasePath. The current directory does not contain threadline-archive.sqlite."
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptRoot
$viewerRoot = Join-Path $repoRoot "viewer"
if (-not (Test-Path -LiteralPath (Join-Path $viewerRoot "index.php") -PathType Leaf)) {
  throw "Viewer files not found at: $viewerRoot"
}

$resolvedPhp = Resolve-PhpPath -PathValue $PhpExePath
$resolvedArchive = Resolve-ArchiveDirectory -ArchiveValue $ArchiveDirectory -DatabaseValue $DatabasePath
$resolvedDatabase = if ([string]::IsNullOrWhiteSpace($DatabasePath)) {
  Join-Path $resolvedArchive "threadline-archive.sqlite"
} else {
  [System.IO.Path]::GetFullPath($DatabasePath)
}

if (-not (Test-Path -LiteralPath $resolvedDatabase -PathType Leaf)) {
  throw "Database not found: $resolvedDatabase"
}

$phpRoot = Split-Path -Parent $resolvedPhp
$extensionDir = Join-Path $phpRoot "ext"
if (-not (Test-Path -LiteralPath $extensionDir -PathType Container)) {
  throw "PHP extension directory not found: $extensionDir"
}

$env:THREADLINE_ARCHIVE_DIR = $resolvedArchive
$env:THREADLINE_DATABASE_PATH = $resolvedDatabase

$url = "http://127.0.0.1:$Port/"
Write-Host "Threadline Viewer: $url"
Write-Host "Archive: $resolvedArchive"
Write-Host "Database: $resolvedDatabase"
Write-Host "Press Ctrl+C to stop."

if ($OpenBrowser) {
  Start-Process $url
}

& $resolvedPhp `
  -d "extension_dir=$extensionDir" `
  -d "extension=pdo_sqlite" `
  -d "extension=sqlite3" `
  -S "127.0.0.1:$Port" `
  -t $viewerRoot `
  (Join-Path $viewerRoot "index.php")
