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

<#
.SYNOPSIS
Finds a usable php.exe for the local archive viewer.

.PARAMETER PathValue
Optional explicit path to php.exe.

.OUTPUTS
System.String
#>
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

<#
.SYNOPSIS
Resolves the archive directory from parameters or the current location.

.PARAMETER ArchiveValue
Optional archive directory path.

.PARAMETER DatabaseValue
Optional SQLite database path whose parent directory should be used.

.OUTPUTS
System.String
#>
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

<#
.SYNOPSIS
Builds the effective database path for the viewer run.

.PARAMETER ArchivePath
Resolved archive directory.

.PARAMETER DatabaseValue
Optional explicit database path.

.OUTPUTS
System.String
#>
function Resolve-DatabasePath {
  param(
    [string]$ArchivePath,
    [string]$DatabaseValue
  )

  if ([string]::IsNullOrWhiteSpace($DatabaseValue)) {
    return Join-Path $ArchivePath "threadline-archive.sqlite"
  }

  return [System.IO.Path]::GetFullPath($DatabaseValue)
}

<#
.SYNOPSIS
Resolves the PHP extension directory used for SQLite support.

.PARAMETER PhpPath
Resolved php.exe path.

.OUTPUTS
System.String
#>
function Resolve-PhpExtensionDirectory {
  param([string]$PhpPath)

  $phpRoot = Split-Path -Parent $PhpPath
  $extensionDir = Join-Path $phpRoot "ext"
  if (-not (Test-Path -LiteralPath $extensionDir -PathType Container)) {
    throw "PHP extension directory not found: $extensionDir"
  }

  return $extensionDir
}

<#
.SYNOPSIS
Prints the local viewer endpoint and selected archive paths.

.PARAMETER Url
Viewer URL bound to localhost.

.PARAMETER ArchivePath
Resolved archive directory.

.PARAMETER DatabasePath
Resolved SQLite database path.

.OUTPUTS
None
#>
function Write-ViewerStartupInfo {
  param(
    [string]$Url,
    [string]$ArchivePath,
    [string]$DatabasePath
  )

  Write-Host "Threadline Viewer: $Url"
  Write-Host "Archive: $ArchivePath"
  Write-Host "Database: $DatabasePath"
  Write-Host "Press Ctrl+C to stop."
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptRoot
$viewerRoot = Join-Path $repoRoot "viewer"
if (-not (Test-Path -LiteralPath (Join-Path $viewerRoot "index.php") -PathType Leaf)) {
  throw "Viewer files not found at: $viewerRoot"
}

$resolvedPhp = Resolve-PhpPath -PathValue $PhpExePath
$resolvedArchive = Resolve-ArchiveDirectory -ArchiveValue $ArchiveDirectory -DatabaseValue $DatabasePath
$resolvedDatabase = Resolve-DatabasePath -ArchivePath $resolvedArchive -DatabaseValue $DatabasePath

if (-not (Test-Path -LiteralPath $resolvedDatabase -PathType Leaf)) {
  throw "Database not found: $resolvedDatabase"
}

$extensionDir = Resolve-PhpExtensionDirectory -PhpPath $resolvedPhp

$env:THREADLINE_ARCHIVE_DIR = $resolvedArchive
$env:THREADLINE_DATABASE_PATH = $resolvedDatabase

$url = "http://127.0.0.1:$Port/"
Write-ViewerStartupInfo -Url $url -ArchivePath $resolvedArchive -DatabasePath $resolvedDatabase

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
