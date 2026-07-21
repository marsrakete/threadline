[CmdletBinding()]
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [Alias("ArchiveZipPath", "ArchiveDirectoryPath")]
  [string]$ArchiveSourcePath,

  [Parameter(Position = 1)]
  [string]$OutputDirectory = "",

  [switch]$UsePostsJson,

  [int]$MaxPosts = 0,

  [switch]$InlineAssets,

  [string]$SqliteExePath = "",

  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$Script:RecommendedInlineAssetLimitBytes = 150MB
$Script:DefaultSqliteExePath = "C:\portable\sqlite\sqlite3.exe"

function Write-Info {
  param([string]$Message)
  Write-Host "[threadline-archive-html] $Message"
}

function Write-ProgressStep {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][int]$Current,
    [Parameter(Mandatory = $true)][int]$Total,
    [int]$Every = 25
  )
  if ($Total -le 0) {
    return
  }
  if ($Current -eq 1 -or $Current -eq $Total -or ($Every -gt 0 -and ($Current % $Every) -eq 0)) {
    Write-Info ("{0} {1} / {2}" -f $Label, $Current, $Total)
  }
}

function Get-ProgressInterval {
  param(
    [Parameter(Mandatory = $true)][int]$Total,
    [int]$TargetUpdates = 20
  )
  if ($Total -le 0) {
    return 1
  }
  return [Math]::Max(1, [int][Math]::Ceiling($Total / [Math]::Max(1, $TargetUpdates)))
}

function Escape-Html {
  param([AllowNull()][string]$Value)
  if ($null -eq $Value) {
    return ""
  }
  return [System.Net.WebUtility]::HtmlEncode([string]$Value)
}

function Read-JsonFileUtf8 {
  param([Parameter(Mandatory = $true)][string]$Path)
  $utf8 = [System.Text.UTF8Encoding]::new($true, $true)
  $text = [System.IO.File]::ReadAllText($Path, $utf8)
  return $text | ConvertFrom-Json
}

function Resolve-SqliteExePath {
  param([string]$PathValue)
  if (-not [string]::IsNullOrWhiteSpace($PathValue)) {
    $resolved = [System.IO.Path]::GetFullPath($PathValue)
    if (-not (Test-Path -LiteralPath $resolved -PathType Leaf)) {
      throw "sqlite3.exe not found at: $resolved"
    }
    return $resolved
  }
  if (Test-Path -LiteralPath $Script:DefaultSqliteExePath -PathType Leaf) {
    return $Script:DefaultSqliteExePath
  }
  $command = Get-Command sqlite3.exe -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }
  throw "sqlite3.exe was not found. Install SQLite tools or pass -SqliteExePath."
}

function Invoke-SqliteCommand {
  param(
    [Parameter(Mandatory = $true)][string]$SqliteExe,
    [Parameter(Mandatory = $true)][string]$DatabasePath,
    [Parameter(Mandatory = $true)][string]$Sql
  )
  $tempSqlPath = Join-Path ([System.IO.Path]::GetTempPath()) ("threadline-convert-" + [guid]::NewGuid().ToString("N") + ".sql")
  $tempErrPath = Join-Path ([System.IO.Path]::GetTempPath()) ("threadline-convert-" + [guid]::NewGuid().ToString("N") + ".err")
  [System.IO.File]::WriteAllText($tempSqlPath, $Sql, [System.Text.UTF8Encoding]::new($false))
  try {
    $sqliteReadPath = ([System.IO.Path]::GetFullPath($tempSqlPath)) -replace "\\", "/"
    $previousOutputEncoding = $OutputEncoding
    $previousConsoleEncoding = [Console]::OutputEncoding
    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = $utf8NoBom
    [Console]::OutputEncoding = $utf8NoBom
    try {
      $output = (& $SqliteExe $DatabasePath ".read '$sqliteReadPath'" 2> $tempErrPath)
    } finally {
      $OutputEncoding = $previousOutputEncoding
      [Console]::OutputEncoding = $previousConsoleEncoding
    }
    if ($LASTEXITCODE -ne 0) {
      $errorText = ""
      if (Test-Path -LiteralPath $tempErrPath -PathType Leaf) {
        $errorText = [System.IO.File]::ReadAllText($tempErrPath, [System.Text.UTF8Encoding]::new($true, $true))
      }
      throw ("sqlite3 failed with exit code {0}: {1}" -f $LASTEXITCODE, $errorText.Trim())
    }
    if ($null -eq $output) {
      return ""
    }
    return [string]::Join([Environment]::NewLine, @($output))
  } finally {
    if (Test-Path -LiteralPath $tempSqlPath) {
      Remove-Item -LiteralPath $tempSqlPath -Force
    }
    if (Test-Path -LiteralPath $tempErrPath) {
      Remove-Item -LiteralPath $tempErrPath -Force
    }
  }
}

function Invoke-SqliteJsonObjectRows {
  param(
    [Parameter(Mandatory = $true)][string]$SqliteExe,
    [Parameter(Mandatory = $true)][string]$DatabasePath,
    [Parameter(Mandatory = $true)][string]$Sql
  )
  $sqlWithMode = ".mode list`n$Sql"
  $output = Invoke-SqliteCommand -SqliteExe $SqliteExe -DatabasePath $DatabasePath -Sql $sqlWithMode
  if ([string]::IsNullOrWhiteSpace($output)) {
    return @()
  }
  $rows = New-Object System.Collections.Generic.List[object]
  foreach ($line in @($output -split "(`r`n|`n|`r)")) {
    if ([string]::IsNullOrWhiteSpace($line)) {
      continue
    }
    $rows.Add((ConvertFrom-Json -InputObject $line)) | Out-Null
  }
  return $rows.ToArray()
}

function ConvertFrom-EmbeddedJsonValue {
  param(
    $Value,
    $Default = $null
  )
  if ($null -eq $Value) {
    return $Default
  }
  if ($Value -is [System.Collections.IDictionary]) {
    if ($Value.Contains("value") -and $Value.Contains("Count")) {
      $wrappedValue = $Value["value"]
      if ($wrappedValue -is [System.Collections.IEnumerable] -and -not ($wrappedValue -is [string])) {
        return @($wrappedValue)
      }
    }
    return $Value
  }
  $valueProperty = $Value.PSObject.Properties["value"]
  $countProperty = $Value.PSObject.Properties["Count"]
  if ($null -ne $valueProperty -and $null -ne $countProperty -and $null -ne $valueProperty.Value) {
    $wrappedValue = $valueProperty.Value
    if ($wrappedValue -is [System.Collections.IEnumerable] -and -not ($wrappedValue -is [string])) {
      return @($wrappedValue)
    }
  }
  if ($Value -is [System.Collections.IEnumerable] -and -not ($Value -is [string])) {
    return @($Value)
  }
  $text = [string]$Value
  if ([string]::IsNullOrWhiteSpace($text)) {
    return $Default
  }
  $trimmed = $text.Trim()
  if (($trimmed.StartsWith("{") -or $trimmed.StartsWith("[""") -or $trimmed.StartsWith("[")) -or $trimmed -eq "null") {
    return ConvertFrom-EmbeddedJsonValue -Value (ConvertFrom-Json -InputObject $trimmed) -Default $Default
  }
  return $Value
}

function ConvertTo-PlainArchiveValue {
  param($Value)
  if ($null -eq $Value) {
    return $null
  }
  if ($Value -is [System.Collections.IDictionary]) {
    $converted = [ordered]@{}
    foreach ($key in $Value.Keys) {
      $converted[$key] = ConvertTo-PlainArchiveValue -Value $Value[$key]
    }
    return [pscustomobject]$converted
  }
  if ($Value -is [System.Collections.IEnumerable] -and -not ($Value -is [string])) {
    $items = New-Object System.Collections.Generic.List[object]
    foreach ($item in $Value) {
      $items.Add((ConvertTo-PlainArchiveValue -Value $item)) | Out-Null
    }
    return @($items.ToArray())
  }
  return $Value
}

function Load-ArchivePostsFromSqlite {
  param(
    [Parameter(Mandatory = $true)][string]$SqliteExe,
    [Parameter(Mandatory = $true)][string]$DatabasePath,
    [int]$MaxPosts = 0
  )
  Write-Info "Loading posts from SQLite: $DatabasePath"
  $sql = @"
SELECT json_object(
  'uri', uri,
  'cid', cid,
  'rkey', rkey,
  'created_at', created_at,
  'text', text,
  'langs_json', langs_json,
  'facets_json', facets_json,
  'reply_json', reply_json,
  'thread_root_uri', thread_root_uri,
  'thread_parent_uri', thread_parent_uri,
  'counts_json', counts_json,
  'permalink', permalink,
  'author_handle', author_handle,
  'author_display_name', author_display_name,
  'author_did', author_did,
  'author_avatar_url', author_avatar_url,
  'author_avatar_path', author_avatar_path,
  'source_images_json', source_images_json,
  'external_card_json', external_card_json,
  'images_json', images_json,
  'media_skipped_count', media_skipped_count
)
FROM posts
ORDER BY created_at_unix DESC, uri DESC
"@
  $sql += ";"
  $rows = @(Invoke-SqliteJsonObjectRows -SqliteExe $SqliteExe -DatabasePath $DatabasePath -Sql $sql)
  if ($MaxPosts -gt 0 -and $rows.Count -gt $MaxPosts) {
    Write-Info "Limiting SQLite export to the first $MaxPosts posts after loading rows."
    $rows = @($rows | Select-Object -First $MaxPosts)
  } elseif ($MaxPosts -gt 0) {
    Write-Info "SQLite returned fewer posts than the requested limit of $MaxPosts."
  }
  Write-Info ("SQLite returned {0} post rows." -f $rows.Count)
  $posts = New-Object System.Collections.Generic.List[object]
  $progressEvery = Get-ProgressInterval -Total $rows.Count -TargetUpdates 25
  for ($rowIndex = 0; $rowIndex -lt $rows.Count; $rowIndex += 1) {
    $row = $rows[$rowIndex]
    Write-ProgressStep -Label "Converting SQLite rows" -Current ($rowIndex + 1) -Total $rows.Count -Every $progressEvery
    $posts.Add([pscustomobject][ordered]@{
      uri = [string]$row.uri
      cid = [string]$row.cid
      rkey = [string]$row.rkey
      createdAt = [string]$row.created_at
      text = [string]$row.text
      langs = @(ConvertTo-PlainArchiveValue -Value (ConvertFrom-EmbeddedJsonValue -Value (Get-OptionalPropertyValue -Object $row -Name "langs_json" -Default @()) -Default @()))
      facets = @(ConvertTo-PlainArchiveValue -Value (ConvertFrom-EmbeddedJsonValue -Value (Get-OptionalPropertyValue -Object $row -Name "facets_json" -Default @()) -Default @()))
      reply = ConvertTo-PlainArchiveValue -Value (ConvertFrom-EmbeddedJsonValue -Value (Get-OptionalPropertyValue -Object $row -Name "reply_json" -Default $null) -Default $null)
      thread = [pscustomobject][ordered]@{
        rootUri = [string]$row.thread_root_uri
        parentUri = [string]$row.thread_parent_uri
      }
      counts = ConvertTo-PlainArchiveValue -Value (ConvertFrom-EmbeddedJsonValue -Value (Get-OptionalPropertyValue -Object $row -Name "counts_json" -Default $null) -Default ([ordered]@{ likeCount = 0; replyCount = 0; repostCount = 0; quoteCount = 0 }))
      permalink = [string]$row.permalink
      authorHandle = [string]$row.author_handle
      authorDisplayName = [string]$row.author_display_name
      authorDid = [string]$row.author_did
      authorAvatar = [string]$row.author_avatar_url
      authorAvatarPath = [string]$row.author_avatar_path
      sourceImages = @(ConvertTo-PlainArchiveValue -Value (ConvertFrom-EmbeddedJsonValue -Value (Get-OptionalPropertyValue -Object $row -Name "source_images_json" -Default @()) -Default @()))
      externalCard = ConvertTo-PlainArchiveValue -Value (ConvertFrom-EmbeddedJsonValue -Value (Get-OptionalPropertyValue -Object $row -Name "external_card_json" -Default $null) -Default $null)
      images = @(ConvertTo-PlainArchiveValue -Value (ConvertFrom-EmbeddedJsonValue -Value (Get-OptionalPropertyValue -Object $row -Name "images_json" -Default @()) -Default @()))
      mediaSkippedCount = [int](Get-OptionalPropertyValue -Object $row -Name "media_skipped_count" -Default 0)
    }) | Out-Null
  }
  return $posts.ToArray()
}

function Get-OptionalPropertyValue {
  param(
    [AllowNull()]$Object,
    [Parameter(Mandatory = $true)][string]$Name,
    $Default = $null
  )
  if ($null -eq $Object) {
    return $Default
  }
  if ($Object -is [System.Collections.IDictionary]) {
    if ($Object.Contains($Name)) {
      return $Object[$Name]
    }
    return $Default
  }
  $property = $Object.PSObject.Properties[$Name]
  if ($null -eq $property) {
    return $Default
  }
  return $property.Value
}

function Fill-ArchiveTemplate {
  param(
    [Parameter(Mandatory = $true)][string]$Template,
    [Parameter(Mandatory = $true)][hashtable]$Values
  )
  $result = $Template
  foreach ($key in $Values.Keys) {
    $placeholder = ("{{{{{0}}}}}" -f $key)
    $result = $result.Replace($placeholder, [string]$Values[$key])
  }
  return $result
}

function ConvertTo-ArchiveInlineJson {
  param([Parameter(Mandatory = $true)]$Value)
  $json = $Value | ConvertTo-Json -Depth 20 -Compress
  $json = $json.Replace("<", "\u003c")
  $json = $json.Replace([string][char]0x2028, "\u2028")
  $json = $json.Replace([string][char]0x2029, "\u2029")
  return $json
}

function Escape-InlineScript {
  param([AllowNull()][string]$Value)
  if ([string]::IsNullOrEmpty($Value)) {
    return ""
  }
  return ($Value -replace '</script', '<\/script')
}

function Escape-HtmlAttribute {
  param([AllowNull()][string]$Value)
  $escaped = Escape-Html $Value
  return $escaped.Replace("'", "&#39;")
}

function Convert-RelativePathToHtml {
  param([AllowNull()][string]$PathValue)
  if ([string]::IsNullOrWhiteSpace($PathValue)) {
    return ""
  }
  return ([string]$PathValue).Replace("\", "/")
}

function Convert-FileToDataUrl {
  param([Parameter(Mandatory = $true)][string]$Path)
  $extension = [System.IO.Path]::GetExtension($Path).ToLowerInvariant()
  $mimeType = switch ($extension) {
    ".jpg" { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    ".png" { "image/png" }
    ".gif" { "image/gif" }
    ".webp" { "image/webp" }
    ".svg" { "image/svg+xml" }
    default { "application/octet-stream" }
  }
  $bytes = [System.IO.File]::ReadAllBytes($Path)
  $base64 = [System.Convert]::ToBase64String($bytes)
  return "data:${mimeType};base64,$base64"
}

function Copy-ArchiveDirectoryContent {
  param(
    [Parameter(Mandatory = $true)][string]$SourceDirectory,
    [Parameter(Mandatory = $true)][string]$DestinationDirectory
  )
  New-Item -ItemType Directory -Path $DestinationDirectory -Force | Out-Null
  foreach ($item in @(Get-ChildItem -LiteralPath $SourceDirectory -Force)) {
    Copy-Item -LiteralPath $item.FullName -Destination $DestinationDirectory -Recurse -Force
  }
}

function Stage-ArchiveAssetFile {
  param(
    [Parameter(Mandatory = $true)][string]$WorkingDirectory,
    [Parameter(Mandatory = $true)][string]$RelativePath,
    [Parameter(Mandatory = $true)][string]$AssetRootDirectory,
    [Parameter(Mandatory = $true)][hashtable]$CopiedAssets
  )
  if ([string]::IsNullOrWhiteSpace($RelativePath)) {
    return ""
  }
  $normalizedRelativePath = ([string]$RelativePath).Replace("\", "/").TrimStart("/")
  if ([string]::IsNullOrWhiteSpace($normalizedRelativePath)) {
    return ""
  }
  if ($CopiedAssets.ContainsKey($normalizedRelativePath)) {
    return [string]$CopiedAssets[$normalizedRelativePath]
  }
  $sourcePath = Join-Path -Path $WorkingDirectory -ChildPath $normalizedRelativePath
  if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
    return $normalizedRelativePath
  }
  $targetRelativePath = Join-Path -Path "archive-assets" -ChildPath $normalizedRelativePath
  $targetPath = Join-Path -Path $AssetRootDirectory -ChildPath $normalizedRelativePath
  $targetDirectory = Split-Path -Path $targetPath -Parent
  if (-not [string]::IsNullOrWhiteSpace($targetDirectory)) {
    New-Item -ItemType Directory -Path $targetDirectory -Force | Out-Null
  }
  Copy-Item -LiteralPath $sourcePath -Destination $targetPath -Force
  $normalizedTargetPath = $targetRelativePath.Replace("\", "/")
  $CopiedAssets[$normalizedRelativePath] = $normalizedTargetPath
  return $normalizedTargetPath
}

function Stage-ArchiveAssetsForHtml {
  param(
    [Parameter(Mandatory = $true)][string]$WorkingDirectory,
    [AllowEmptyCollection()][object[]]$Posts
  )
  Write-Info "Reusing archive assets in place. No asset copies will be created."
  $referencedAssets = @{}
  $missingAssets = New-Object System.Collections.Generic.List[string]
  $postTotal = @($Posts).Count
  $progressEvery = Get-ProgressInterval -Total $postTotal -TargetUpdates 25
  for ($postIndex = 0; $postIndex -lt $postTotal; $postIndex += 1) {
    $post = $Posts[$postIndex]
    Write-ProgressStep -Label "Checking asset references" -Current ($postIndex + 1) -Total $postTotal -Every $progressEvery
    $avatarPath = [string](Get-OptionalPropertyValue -Object $post -Name "authorAvatarPath" -Default "")
    if (-not [string]::IsNullOrWhiteSpace($avatarPath)) {
      $normalizedAvatarPath = ([string]$avatarPath).Replace("\", "/").TrimStart("/")
      $post.authorAvatarPath = $normalizedAvatarPath
      $referencedAssets[$normalizedAvatarPath] = $true
      $avatarSourcePath = Join-Path -Path $WorkingDirectory -ChildPath $normalizedAvatarPath
      if (-not (Test-Path -LiteralPath $avatarSourcePath -PathType Leaf)) {
        $missingAssets.Add($normalizedAvatarPath) | Out-Null
      }
    }

    foreach ($image in @((Get-OptionalPropertyValue -Object $post -Name "images" -Default @()))) {
      $imagePath = [string](Get-OptionalPropertyValue -Object $image -Name "path" -Default "")
      if ([string]::IsNullOrWhiteSpace($imagePath)) {
        continue
      }
      $normalizedImagePath = ([string]$imagePath).Replace("\", "/").TrimStart("/")
      $image.path = $normalizedImagePath
      $referencedAssets[$normalizedImagePath] = $true
      $imageSourcePath = Join-Path -Path $WorkingDirectory -ChildPath $normalizedImagePath
      if (-not (Test-Path -LiteralPath $imageSourcePath -PathType Leaf)) {
        $missingAssets.Add($normalizedImagePath) | Out-Null
      }
    }

    $card = Get-OptionalPropertyValue -Object $post -Name "externalCard" -Default $null
    if ($null -eq $card) {
      continue
    }
    $thumbPath = [string](Get-OptionalPropertyValue -Object $card -Name "thumbPath" -Default "")
    if ([string]::IsNullOrWhiteSpace($thumbPath)) {
      continue
    }
    $normalizedThumbPath = ([string]$thumbPath).Replace("\", "/").TrimStart("/")
    $card.thumbPath = $normalizedThumbPath
    $referencedAssets[$normalizedThumbPath] = $true
    $thumbSourcePath = Join-Path -Path $WorkingDirectory -ChildPath $normalizedThumbPath
    if (-not (Test-Path -LiteralPath $thumbSourcePath -PathType Leaf)) {
      $missingAssets.Add($normalizedThumbPath) | Out-Null
    }
  }
  Write-Info ("Reused {0} asset references from the archive." -f $referencedAssets.Count)
  if ($missingAssets.Count -gt 0) {
    Write-Info ("Warning: {0} referenced assets were not found in the archive directory." -f $missingAssets.Count)
  }
}

function Inline-ArchiveAssetsForHtml {
  param(
    [Parameter(Mandatory = $true)][string]$WorkingDirectory,
    [AllowEmptyCollection()][object[]]$Posts,
    [switch]$Force
  )
  Write-Info "Preparing inline assets for HTML export."
  $resolvedAssets = New-Object System.Collections.Generic.List[string]
  $seenAssets = @{}
  $postTotal = @($Posts).Count
  $progressEvery = Get-ProgressInterval -Total $postTotal -TargetUpdates 25
  for ($postIndex = 0; $postIndex -lt $postTotal; $postIndex += 1) {
    $post = $Posts[$postIndex]
    Write-ProgressStep -Label "Scanning assets for inline mode" -Current ($postIndex + 1) -Total $postTotal -Every $progressEvery
    foreach ($candidate in @(
        [string](Get-OptionalPropertyValue -Object $post -Name "authorAvatarPath" -Default "")
      )) {
      if (-not [string]::IsNullOrWhiteSpace($candidate)) {
        $normalized = $candidate.Replace("\", "/").TrimStart("/")
        if (-not $seenAssets.ContainsKey($normalized)) {
          $seenAssets[$normalized] = $true
          $resolvedAssets.Add($normalized) | Out-Null
        }
      }
    }
    foreach ($image in @((Get-OptionalPropertyValue -Object $post -Name "images" -Default @()))) {
      $candidate = [string](Get-OptionalPropertyValue -Object $image -Name "path" -Default "")
      if (-not [string]::IsNullOrWhiteSpace($candidate)) {
        $normalized = $candidate.Replace("\", "/").TrimStart("/")
        if (-not $seenAssets.ContainsKey($normalized)) {
          $seenAssets[$normalized] = $true
          $resolvedAssets.Add($normalized) | Out-Null
        }
      }
    }
    $card = Get-OptionalPropertyValue -Object $post -Name "externalCard" -Default $null
    if ($null -ne $card) {
      $candidate = [string](Get-OptionalPropertyValue -Object $card -Name "thumbPath" -Default "")
      if (-not [string]::IsNullOrWhiteSpace($candidate)) {
        $normalized = $candidate.Replace("\", "/").TrimStart("/")
        if (-not $seenAssets.ContainsKey($normalized)) {
          $seenAssets[$normalized] = $true
          $resolvedAssets.Add($normalized) | Out-Null
        }
      }
    }
  }

  $totalAssetBytes = 0L
  foreach ($relativePath in $resolvedAssets) {
    $sourcePath = Join-Path -Path $WorkingDirectory -ChildPath $relativePath
    if (Test-Path -LiteralPath $sourcePath -PathType Leaf) {
      $totalAssetBytes += [int64](Get-Item -LiteralPath $sourcePath).Length
    }
  }

  if ($totalAssetBytes -gt $Script:RecommendedInlineAssetLimitBytes -and -not $Force) {
    $sizeMb = [Math]::Round(($totalAssetBytes / 1MB), 1)
    $limitMb = [Math]::Round(($Script:RecommendedInlineAssetLimitBytes / 1MB), 1)
    throw "Inline assets would embed about $sizeMb MB into one HTML file. That is above the recommended limit of $limitMb MB. Use folder-based assets or rerun with -Force if you really want to continue."
  }
  Write-Info ("Inlining {0} assets with about {1} MB of source data." -f $resolvedAssets.Count, [Math]::Round(($totalAssetBytes / 1MB), 1))

  $dataUrlByPath = @{}
  $assetTotal = $resolvedAssets.Count
  $assetProgressEvery = Get-ProgressInterval -Total $assetTotal -TargetUpdates 25
  for ($assetIndex = 0; $assetIndex -lt $assetTotal; $assetIndex += 1) {
    $relativePath = $resolvedAssets[$assetIndex]
    Write-ProgressStep -Label "Inlining assets" -Current ($assetIndex + 1) -Total $assetTotal -Every $assetProgressEvery
    $sourcePath = Join-Path -Path $WorkingDirectory -ChildPath $relativePath
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
      continue
    }
    $dataUrlByPath[$relativePath] = Convert-FileToDataUrl -Path $sourcePath
  }

  for ($postIndex = 0; $postIndex -lt $postTotal; $postIndex += 1) {
    $post = $Posts[$postIndex]
    Write-ProgressStep -Label "Rewriting inline asset paths" -Current ($postIndex + 1) -Total $postTotal -Every $progressEvery
    $avatarPath = [string](Get-OptionalPropertyValue -Object $post -Name "authorAvatarPath" -Default "")
    if (-not [string]::IsNullOrWhiteSpace($avatarPath)) {
      $normalized = $avatarPath.Replace("\", "/").TrimStart("/")
      if ($dataUrlByPath.ContainsKey($normalized)) {
        $post.authorAvatarPath = $dataUrlByPath[$normalized]
      }
    }
    foreach ($image in @((Get-OptionalPropertyValue -Object $post -Name "images" -Default @()))) {
      $imagePath = [string](Get-OptionalPropertyValue -Object $image -Name "path" -Default "")
      if ([string]::IsNullOrWhiteSpace($imagePath)) {
        continue
      }
      $normalized = $imagePath.Replace("\", "/").TrimStart("/")
      if ($dataUrlByPath.ContainsKey($normalized)) {
        $image.path = $dataUrlByPath[$normalized]
      }
    }
    $card = Get-OptionalPropertyValue -Object $post -Name "externalCard" -Default $null
    if ($null -eq $card) {
      continue
    }
    $thumbPath = [string](Get-OptionalPropertyValue -Object $card -Name "thumbPath" -Default "")
    if ([string]::IsNullOrWhiteSpace($thumbPath)) {
      continue
    }
    $normalized = $thumbPath.Replace("\", "/").TrimStart("/")
    if ($dataUrlByPath.ContainsKey($normalized)) {
      $card.thumbPath = $dataUrlByPath[$normalized]
    }
  }
}

function Get-ArchiveContentStats {
  param([AllowEmptyCollection()][object[]]$Posts)
  $stats = [ordered]@{
    postCount = @($Posts).Count
    imageCount = 0
    cardCount = 0
    avatarCount = 0
  }
  foreach ($post in @($Posts)) {
    $images = @((Get-OptionalPropertyValue -Object $post -Name "images" -Default @()))
    $stats.imageCount += $images.Count
    $card = Get-OptionalPropertyValue -Object $post -Name "externalCard" -Default $null
    if ($null -ne $card) {
      $stats.cardCount += 1
    }
    $avatarPath = [string](Get-OptionalPropertyValue -Object $post -Name "authorAvatarPath" -Default "")
    if (-not [string]::IsNullOrWhiteSpace($avatarPath)) {
      $stats.avatarCount += 1
    }
  }
  return $stats
}

function Format-ArchiveTimestamp {
  param([AllowNull()][string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) {
    return "?"
  }
  try {
    return ([datetimeoffset]::Parse($Value)).ToLocalTime().ToString("dd.MM.yyyy HH:mm")
  } catch {
    return [string]$Value
  }
}

function Shorten-UrlForDisplay {
  param([AllowNull()][string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) {
    return ""
  }
  try {
    $uri = [Uri]$Value
    $compact = "{0}{1}{2}{3}" -f $uri.Host, ($(if ($uri.AbsolutePath -eq "/") { "" } else { $uri.AbsolutePath })), $uri.Query, $uri.Fragment
    if ($compact.Length -gt 72) {
      return "{0}..." -f $compact.Substring(0, 69)
    }
    return $compact
  } catch {
    if ($Value.Length -gt 72) {
      return "{0}..." -f $Value.Substring(0, 69)
    }
    return [string]$Value
  }
}

function Extract-UrlsFromText {
  param([AllowNull()][string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) {
    return @()
  }
  $matches = [regex]::Matches($Value, 'https?://[^\s<>()"]+', 'IgnoreCase')
  $urls = New-Object System.Collections.Generic.List[string]
  foreach ($match in $matches) {
    $url = [string]$match.Value
    while ($url -match '[\.,;!?)]$') {
      $url = $url.Substring(0, $url.Length - 1)
    }
    if (-not [string]::IsNullOrWhiteSpace($url)) {
      $urls.Add($url)
    }
  }
  return @($urls.ToArray())
}

function Get-ArchiveHtmlI18n {
  return @{
    de = @{
      archiveHeaderEyebrow = "Threadline Archiv"
      archiveHtmlTitle = "Threadline Archiv - {handle}"
      archiveHtmlGenerated = "Exportiert am {exportedAt}"
      archiveSummaryPosts = "Posts"
      archiveSummaryImages = "Bilder"
      archiveSkippedImagesLabel = "Ausgelassen"
      archiveSkippedImagesNotice = "{skipped} Bilder wurden nicht eingebettet."
      archiveHtmlArchiveRangeLabel = "Archivzeitraum"
      archiveHtmlArchiveRangeValue = "{from} bis {to}"
      archiveHtmlSearchLabel = "Suche"
      archiveFromLabel = "Von"
      archiveToLabel = "Bis"
      archiveHtmlOnlyImages = "Nur Posts mit Bildern"
      archiveHtmlOnlyThreads = "Nur Threads"
      archiveHtmlResetFilters = "Filter zuruecksetzen"
      archiveHtmlIndentThreads = "Threads einruecken"
      archiveHtmlExpandThreads = "Threads aufklappen"
      archiveHtmlCollapseThreads = "Threads zuklappen"
      archiveHtmlExpandSingles = "Einzelposts aufklappen"
      archiveHtmlCollapseSingles = "Einzelposts zuklappen"
      archiveHtmlToggleAllOpen = "Alles aufklappen"
      archiveHtmlToggleAllClose = "Alles zuklappen"
      archiveHtmlHashtagsLabel = "Hashtags"
      archiveHtmlHashtagsEmpty = "Keine Hashtags erkannt."
      archiveHtmlVisibleStatus = "{entries} Eintraege, {threads} Threads, {posts} Posts sichtbar"
      archiveHtmlNoMatches = "Keine passenden Posts."
      archiveHtmlFilterSummary = "Quelle: {scope}{hashtags}"
      archiveHtmlFilterHashtagsSuffix = " · {count} Hashtags aktiv, {skipped} Posts ausgefiltert"
      archiveHtmlLoadImage = "Bild laden"
      archiveHtmlOpenImage = "Bild oeffnen"
      archiveHtmlOpenPost = "Post auf Bluesky oeffnen"
      archiveHtmlLinksSummary = "Externe Links ({count})"
      archiveHtmlLinksEmpty = "Keine externen Links im Archiv."
      archiveHtmlLinksPostLabel = "Zum Post"
      archiveHtmlThreadSummary = "{count} Posts im Thread · {images} Bilder"
      archiveHtmlSingleSummary = "Einzelpost"
      archiveHtmlNoText = "Kein Text."
      archivePdfAltPrefix = "ALT:"
      closeButton = "Schliessen"
    }
    en = @{
      archiveHeaderEyebrow = "Threadline Archive"
      archiveHtmlTitle = "Threadline Archive - {handle}"
      archiveHtmlGenerated = "Exported on {exportedAt}"
      archiveSummaryPosts = "Posts"
      archiveSummaryImages = "Images"
      archiveSkippedImagesLabel = "Skipped"
      archiveSkippedImagesNotice = "{skipped} images were not embedded."
      archiveHtmlArchiveRangeLabel = "Archive range"
      archiveHtmlArchiveRangeValue = "{from} to {to}"
      archiveHtmlSearchLabel = "Search"
      archiveFromLabel = "From"
      archiveToLabel = "To"
      archiveHtmlOnlyImages = "Only posts with images"
      archiveHtmlOnlyThreads = "Only threads"
      archiveHtmlResetFilters = "Reset filters"
      archiveHtmlIndentThreads = "Indent threads"
      archiveHtmlExpandThreads = "Expand threads"
      archiveHtmlCollapseThreads = "Collapse threads"
      archiveHtmlExpandSingles = "Expand singles"
      archiveHtmlCollapseSingles = "Collapse singles"
      archiveHtmlToggleAllOpen = "Expand all"
      archiveHtmlToggleAllClose = "Collapse all"
      archiveHtmlHashtagsLabel = "Hashtags"
      archiveHtmlHashtagsEmpty = "No hashtags found."
      archiveHtmlVisibleStatus = "{entries} entries, {threads} threads, {posts} posts visible"
      archiveHtmlNoMatches = "No matching posts."
      archiveHtmlFilterSummary = "Source: {scope}{hashtags}"
      archiveHtmlFilterHashtagsSuffix = " · {count} hashtags active, {skipped} posts filtered out"
      archiveHtmlLoadImage = "Load image"
      archiveHtmlOpenImage = "Open image"
      archiveHtmlOpenPost = "Open post on Bluesky"
      archiveHtmlLinksSummary = "External links ({count})"
      archiveHtmlLinksEmpty = "No external links in this archive."
      archiveHtmlLinksPostLabel = "Open post"
      archiveHtmlThreadSummary = "{count} posts in thread · {images} images"
      archiveHtmlSingleSummary = "Single post"
      archiveHtmlNoText = "No text."
      archivePdfAltPrefix = "ALT:"
      closeButton = "Close"
    }
  }
}

function Get-PostRootKey {
  param($Post)
  $thread = Get-OptionalPropertyValue -Object $Post -Name "thread"
  $rootUri = [string](Get-OptionalPropertyValue -Object $thread -Name "rootUri" -Default "")
  if ([string]::IsNullOrWhiteSpace($rootUri)) {
    return [string]$Post.uri
  }
  return $rootUri
}

function Get-ThreadDepthMap {
  param([object[]]$Posts)
  $byUri = @{}
  foreach ($post in $Posts) {
    if (-not [string]::IsNullOrWhiteSpace([string]$post.uri)) {
      $byUri[[string]$post.uri] = $post
    }
  }

  $depthMap = @{}

  function Resolve-Depth {
    param($Post)
    $uri = [string]$Post.uri
    if ([string]::IsNullOrWhiteSpace($uri)) {
      return 0
    }
    if ($depthMap.ContainsKey($uri)) {
      return [int]$depthMap[$uri]
    }

    $thread = Get-OptionalPropertyValue -Object $Post -Name "thread"
    $parentUri = [string](Get-OptionalPropertyValue -Object $thread -Name "parentUri" -Default "")
    if ([string]::IsNullOrWhiteSpace($parentUri) -or -not $byUri.ContainsKey($parentUri)) {
      $depthMap[$uri] = 0
      return 0
    }

    $depth = [Math]::Min(8, (Resolve-Depth $byUri[$parentUri]) + 1)
    $depthMap[$uri] = $depth
    return $depth
  }

  foreach ($post in $Posts) {
    [void](Resolve-Depth $post)
  }

  return $depthMap
}

function Group-ArchivePosts {
  param([object[]]$Posts)
  $groups = New-Object System.Collections.Generic.List[object]
  $currentPosts = New-Object System.Collections.Generic.List[object]
  $currentRootKey = ""

  foreach ($post in $Posts) {
    $rootKey = Get-PostRootKey $post
    if ($currentPosts.Count -gt 0 -and $rootKey -ne $currentRootKey) {
      $groupPosts = @($currentPosts.ToArray())
      $groups.Add([pscustomobject]@{
          RootKey = $currentRootKey
          Posts = $groupPosts
          IsThread = $groupPosts.Count -gt 1
        })
      $currentPosts = New-Object System.Collections.Generic.List[object]
    }

    $currentRootKey = $rootKey
    $currentPosts.Add($post)
  }

  if ($currentPosts.Count -gt 0) {
    $groupPosts = @($currentPosts.ToArray())
    $groups.Add([pscustomobject]@{
        RootKey = $currentRootKey
        Posts = $groupPosts
        IsThread = $groupPosts.Count -gt 1
      })
  }

  return @($groups.ToArray())
}

function Convert-PlainTextToHtml {
  param([AllowNull()][string]$Text)
  if ([string]::IsNullOrEmpty($Text)) {
    return ""
  }

  $escaped = Escape-Html $Text
  $escaped = $escaped -replace "(https?://[^\s<]+)", '<a href="$1" target="_blank" rel="noreferrer noopener">$1</a>'
  $escaped = $escaped -replace "((?<![""'>])(www\.[^\s<]+))", '<a href="https://$1" target="_blank" rel="noreferrer noopener">$1</a>'
  return ($escaped -replace "(\r\n|\n|\r)", "<br>")
}

function Render-ArchiveImageMarkup {
  param($Post)
  $images = @((Get-OptionalPropertyValue -Object $Post -Name "images" -Default @()))
  if ($images.Count -eq 0) {
    return ""
  }

  $parts = New-Object System.Collections.Generic.List[string]
  foreach ($image in $images) {
    $path = Convert-RelativePathToHtml ([string](Get-OptionalPropertyValue -Object $image -Name "path" -Default ""))
    if ([string]::IsNullOrWhiteSpace($path)) {
      continue
    }
    $altText = [string](Get-OptionalPropertyValue -Object $image -Name "alt" -Default "")
    $alt = Escape-HtmlAttribute $altText
    $caption = ""
    if (-not [string]::IsNullOrWhiteSpace($altText)) {
      $caption = "<figcaption>ALT: $(Escape-Html $altText)</figcaption>"
    }
    $parts.Add(@"
<figure class="archive-html-image">
  <img src="$path" alt="$alt" loading="lazy">
  $caption
</figure>
"@)
  }

  if ($parts.Count -eq 0) {
    return ""
  }

  return "<div class=""archive-html-gallery"">$($parts -join "`n")</div>"
}

<#
.SYNOPSIS
Renders the external link-card HTML for one archived post.
.PARAMETER Post
Archive post object that can contain externalCard metadata.
.OUTPUTS
HTML markup string, or an empty string when no external card is present.
#>
function Render-ExternalCardMarkup {
  param($Post)
  $card = Get-OptionalPropertyValue -Object $Post -Name "externalCard"
  $cardUrl = [string](Get-OptionalPropertyValue -Object $card -Name "url" -Default "")
  if ($null -eq $card -or [string]::IsNullOrWhiteSpace($cardUrl)) {
    return ""
  }

  $thumbMarkup = ""
  $thumbPath = Convert-RelativePathToHtml ([string](Get-OptionalPropertyValue -Object $card -Name "thumbPath" -Default ""))
  if (-not [string]::IsNullOrWhiteSpace($thumbPath)) {
    $thumbMarkup = "<img class=""archive-html-link-card-thumb"" src=""$(Escape-HtmlAttribute $thumbPath)"" alt="""">"
  } elseif ((Get-OptionalPropertyValue -Object $card -Name "thumbLoadFailed" -Default $false) -eq $true) {
    $thumbMarkup = '<span class="archive-html-link-card-thumb archive-html-link-card-thumb-fallback">Vorschaubild konnte nicht geladen werden.</span>'
  }

  $cardTitle = [string](Get-OptionalPropertyValue -Object $card -Name "title" -Default "")
  $title = Escape-Html ([string]($(if ([string]::IsNullOrWhiteSpace($cardTitle)) { $cardUrl } else { $cardTitle })))
  $descriptionMarkup = ""
  $cardDescription = [string](Get-OptionalPropertyValue -Object $card -Name "description" -Default "")
  if (-not [string]::IsNullOrWhiteSpace($cardDescription)) {
    $descriptionMarkup = "<span>$(Escape-Html $cardDescription)</span>"
  }
  $cardClass = "archive-html-link-card"
  $footerText = Shorten-UrlForDisplay $cardUrl
  $standardSite = Get-OptionalPropertyValue -Object $card -Name "standardSite" -Default $null
  if ($null -ne $standardSite) {
    $cardClass = "archive-html-link-card is-publication"
    $footerText = "$(Shorten-UrlForDisplay $cardUrl) - View Publication"
  }

return @"
<a class="$cardClass" href="$(Escape-HtmlAttribute $cardUrl)" target="_blank" rel="noreferrer noopener">
  $thumbMarkup
  <span class="archive-html-link-card-copy">
    <strong>$title</strong>
    $descriptionMarkup
    <small>$(Escape-Html $footerText)</small>
  </span>
</a>
"@
}

function Render-ArchivePostMarkup {
  param(
    $Post,
    [int]$GroupIndex,
    [int]$PostIndex,
    [bool]$IsThread,
    [hashtable]$DepthMap,
    [string]$FallbackHandle
  )

  $depth = 0
  if ($DepthMap.ContainsKey([string]$Post.uri)) {
    $depth = [int]$DepthMap[[string]$Post.uri]
  }

  $authorDisplay = [string](Get-OptionalPropertyValue -Object $Post -Name "authorDisplayName" -Default "")
  $rawAuthorHandle = [string](Get-OptionalPropertyValue -Object $Post -Name "authorHandle" -Default "")
  $authorHandle = [string]$(if ([string]::IsNullOrWhiteSpace($rawAuthorHandle)) { $FallbackHandle } else { $rawAuthorHandle })
  $authorAvatarPath = Convert-RelativePathToHtml ([string](Get-OptionalPropertyValue -Object $Post -Name "authorAvatarPath" -Default ""))
  $avatarMarkup = ""
  if (-not [string]::IsNullOrWhiteSpace($authorAvatarPath)) {
    $avatarMarkup = "<img class=""archive-html-avatar"" src=""$(Escape-HtmlAttribute $authorAvatarPath)"" alt=""$(Escape-HtmlAttribute ($(if ($authorDisplay) { $authorDisplay } else { "@$authorHandle" })))"" loading=""lazy"">"
  }

  $kicker = if ($IsThread) { "#{0}.{1}" -f ($GroupIndex + 1), ($PostIndex + 1) } else { "#{0}" -f ($GroupIndex + 1) }
  $metrics = Get-OptionalPropertyValue -Object $Post -Name "counts" -Default ([pscustomobject]@{ likeCount = 0; replyCount = 0; repostCount = 0; quoteCount = 0 })
  $postText = [string](Get-OptionalPropertyValue -Object $Post -Name "text" -Default "")
  $postPermalink = [string](Get-OptionalPropertyValue -Object $Post -Name "permalink" -Default "")
  $postCreatedAt = [string](Get-OptionalPropertyValue -Object $Post -Name "createdAt" -Default "")
  $postUri = [string](Get-OptionalPropertyValue -Object $Post -Name "uri" -Default "")
  $createdTimestamp = 0
  try {
    $createdTimestamp = [int64]([datetimeoffset]::Parse($postCreatedAt).ToUnixTimeMilliseconds())
  } catch {
    $createdTimestamp = 0
  }
  $linkTexts = Extract-UrlsFromText $postText
  $searchValue = @(
    $postText
    $postPermalink
    $postUri
    $authorHandle
    $authorDisplay
    ($linkTexts -join " ")
  ) -join " "
  $searchValue = (($searchValue -replace '\s+', ' ').Trim()).ToLowerInvariant()
  $hasImages = if (@((Get-OptionalPropertyValue -Object $Post -Name "images" -Default @())).Count -gt 0) { "true" } else { "false" }

  $textMarkup = if (-not [string]::IsNullOrWhiteSpace($postText)) {
    Convert-PlainTextToHtml $postText
  } else {
    '<span class="archive-html-empty">Kein Text.</span>'
  }

  $imagesMarkup = Render-ArchiveImageMarkup $Post
  $externalCardMarkup = Render-ExternalCardMarkup $Post
  $permalinkMarkup = ""
  if (-not [string]::IsNullOrWhiteSpace($postPermalink)) {
    $permalinkMarkup = '<a class="archive-html-link" href="{0}" target="_blank" rel="noreferrer noopener">Post auf Bluesky &#246;ffnen</a>' -f (Escape-HtmlAttribute $postPermalink)
  }

  return @"
<article class="archive-html-post" data-archive-post data-created="$createdTimestamp" data-has-images="$hasImages" data-search="$(Escape-HtmlAttribute $searchValue)" data-depth="$depth" style="--thread-depth:$depth">
  <div class="archive-html-post-head">
    <div class="archive-html-author">
      $avatarMarkup
      <div>
        <p class="archive-html-kicker">$kicker</p>
        <h2 data-archive-searchable="true">$(Escape-Html ($(if ($authorDisplay) { $authorDisplay } else { "@$authorHandle" })))</h2>
        <p class="archive-html-author-handle" data-archive-searchable="true">@$([System.Net.WebUtility]::HtmlEncode($authorHandle))</p>
      </div>
    </div>
    <time datetime="$(Escape-HtmlAttribute $postCreatedAt)">$(Escape-Html (Format-ArchiveTimestamp $postCreatedAt))</time>
  </div>
  <div class="archive-html-metrics">
    <span>Likes $([int](Get-OptionalPropertyValue -Object $metrics -Name "likeCount" -Default 0))</span>
    <span>Replies $([int](Get-OptionalPropertyValue -Object $metrics -Name "replyCount" -Default 0))</span>
    <span>Reposts $([int](Get-OptionalPropertyValue -Object $metrics -Name "repostCount" -Default 0))</span>
    <span>Quotes $([int](Get-OptionalPropertyValue -Object $metrics -Name "quoteCount" -Default 0))</span>
  </div>
  <div class="archive-html-text" data-archive-richtext="true">$textMarkup</div>
  $externalCardMarkup
  $imagesMarkup
  <div class="archive-html-footer">
    $permalinkMarkup
    <span class="archive-html-uri">$(Escape-Html (($postUri -replace '^at://', '')))</span>
  </div>
</article>
"@
}

function Build-ArchiveHtml {
  param(
    [object]$Manifest,
    [object[]]$Posts
  )

  $repoRoot = Split-Path -Path $PSScriptRoot -Parent
  $shellTemplatePath = Join-Path -Path $repoRoot -ChildPath "templates\archive-html-shell.html"
  $clientScriptPath = Join-Path -Path $repoRoot -ChildPath "templates\archive-html-client.js"
  if (-not (Test-Path -LiteralPath $shellTemplatePath -PathType Leaf)) {
    throw "Archiv-Template fehlt: $shellTemplatePath"
  }
  if (-not (Test-Path -LiteralPath $clientScriptPath -PathType Leaf)) {
    throw "Archiv-Client-Script fehlt: $clientScriptPath"
  }

  $handle = [string]$(if ([string]::IsNullOrWhiteSpace([string]$Manifest.account.handle)) { "threadline-archiv" } else { $Manifest.account.handle })
  $displayName = [string]$Manifest.account.displayName
  $groups = @(Group-ArchivePosts $Posts)
  $groupMarkupParts = New-Object System.Collections.Generic.List[string]
  $postCount = @($Posts).Count
  $imageCount = [int]($Manifest.imageCount)
  $exportedAtIso = [string]$Manifest.exportedAt
  $exportedAt = Format-ArchiveTimestamp $exportedAtIso
  $title = "Threadline Archiv - $handle"
  $firstCreatedAt = ""
  $lastCreatedAt = ""
  if ($Posts.Count -gt 0) {
    $firstCreatedAt = [string](Get-OptionalPropertyValue -Object $Posts[0] -Name "createdAt" -Default "")
    $lastCreatedAt = [string](Get-OptionalPropertyValue -Object $Posts[$Posts.Count - 1] -Name "createdAt" -Default "")
  }
  $htmlI18n = Get-ArchiveHtmlI18n

  for ($groupIndex = 0; $groupIndex -lt $groups.Count; $groupIndex += 1) {
    $group = $groups[$groupIndex]
    $groupPosts = @($group.Posts)
    $depthMap = Get-ThreadDepthMap $groupPosts
    $postsMarkup = New-Object System.Collections.Generic.List[string]

    for ($postIndex = 0; $postIndex -lt $groupPosts.Count; $postIndex += 1) {
      $postsMarkup.Add((Render-ArchivePostMarkup -Post $groupPosts[$postIndex] -GroupIndex $groupIndex -PostIndex $postIndex -IsThread $group.IsThread -DepthMap $depthMap -FallbackHandle $handle))
    }

    $imageCountForGroup = 0
    foreach ($groupPost in $groupPosts) {
      $imageCountForGroup += @((Get-OptionalPropertyValue -Object $groupPost -Name "images" -Default @())).Count
    }
    $summaryLabel = if ($group.IsThread) {
      "{0} Posts im Thread - {1} Bilder" -f $groupPosts.Count, $imageCountForGroup
    } else {
      "Einzelpost"
    }
    $summaryRange = if ($groupPosts.Count -gt 1) {
      "{0} - {1}" -f (Format-ArchiveTimestamp ([string]$groupPosts[0].createdAt)), (Format-ArchiveTimestamp ([string]$groupPosts[$groupPosts.Count - 1].createdAt))
    } else {
      Format-ArchiveTimestamp ([string]$groupPosts[0].createdAt)
    }

    $groupMarkupParts.Add(@"
<details class="archive-html-entry $(if ($group.IsThread) { "archive-html-thread" } else { "archive-html-single" })" data-archive-entry data-is-thread="$(if ($group.IsThread) { "true" } else { "false" })" data-entry-kind="$(if ($group.IsThread) { "thread" } else { "single" })" open>
  <summary>
    <div>
      <strong>$(Escape-Html $summaryLabel)</strong>
      <span>$(Escape-Html $summaryRange)</span>
    </div>
    <span>$(if ($group.IsThread) { "Posts: $($groupPosts.Count)" } else { Escape-Html ("#{0}" -f ($groupIndex + 1)) })</span>
  </summary>
  <div class="archive-html-entry-body $(if ($group.IsThread) { "archive-html-thread-posts" } else { "" })">
    $($postsMarkup -join "`n")
  </div>
</details>
"@)
  }

  $shellTemplate = [System.IO.File]::ReadAllText($shellTemplatePath, [System.Text.UTF8Encoding]::new($true, $true))
  $clientScript = Escape-InlineScript ([System.IO.File]::ReadAllText($clientScriptPath, [System.Text.UTF8Encoding]::new($true, $true)))
  $metaItemsMarkup = @"
<div class="archive-html-meta-item">
  <span data-i18n-key="archiveSummaryPosts">Posts</span>
  <strong>$postCount</strong>
</div>
<div class="archive-html-meta-item">
  <span data-i18n-key="archiveSummaryImages">Bilder</span>
  <strong>$imageCount</strong>
</div>
<div class="archive-html-meta-item">
  <span data-i18n-key="archiveHtmlArchiveRangeLabel">Archivzeitraum</span>
  <strong id="archive-range-copy" data-range-from="$(Escape-HtmlAttribute $firstCreatedAt)" data-range-to="$(Escape-HtmlAttribute $lastCreatedAt)">$(Escape-Html ("{0} bis {1}" -f (Format-ArchiveTimestamp $firstCreatedAt), (Format-ArchiveTimestamp $lastCreatedAt)))</strong>
</div>
"@
  $bootstrap = @{
    htmlI18n = $htmlI18n
    defaults = @{
      fromValue = ""
      toValue = ""
    }
    runtimeData = @{
      handle = $handle
      exportedAtIso = $exportedAtIso
      title = $title
      skippedImageCount = 0
      filterScope = "ZIP-Archiv"
      filterHashtagCount = 0
      filterSkippedCount = 0
    }
  }

  return (Fill-ArchiveTemplate -Template $shellTemplate -Values @{
      documentTitle = Escape-Html $title
      heroKicker = Escape-Html "Threadline Archiv"
      pageTitle = Escape-Html ($(if ($displayName) { "$displayName (@$handle)" } else { "@$handle" }))
      generatedCopy = Escape-Html ("Offline aus dem ZIP-Archiv erzeugt am {0}. Alle Bilder, Avatare und Link-Card-Vorschaubilder werden lokal aus dem entpackten Archiv geladen." -f $exportedAt)
      skippedCopyMarkup = ""
      filterCopyMarkup = ""
      metaItemsMarkup = $metaItemsMarkup
      searchLabel = Escape-Html "Suche"
      searchPlaceholder = Escape-HtmlAttribute "Suche"
      fromLabel = Escape-Html "Von"
      fromValue = ""
      toLabel = Escape-Html "Bis"
      toValue = ""
      onlyImagesLabel = Escape-Html "Nur Posts mit Bildern"
      onlyThreadsLabel = Escape-Html "Nur Threads"
      resetFiltersLabel = Escape-Html "Filter zuruecksetzen"
      indentThreadsLabel = Escape-Html "Threads einruecken"
      toggleAllLabel = Escape-Html "Alles aufklappen"
      toggleThreadsLabel = Escape-Html "Threads aufklappen"
      toggleSinglesLabel = Escape-Html "Einzelposts aufklappen"
      hashtagsLabel = Escape-Html "Hashtags"
      hashtagsMarkup = '<p class="archive-html-hashtags-empty" data-i18n-key="archiveHtmlHashtagsEmpty">Keine Hashtags erkannt.</p>'
      linksMarkup = ""
      groupsMarkup = ($groupMarkupParts -join "`n")
      lightboxTitle = Escape-Html $title
      lightboxCloseLabel = Escape-Html "Schliessen"
      bootstrapJson = ConvertTo-ArchiveInlineJson $bootstrap
      clientScript = $clientScript
    })
}

$resolvedSourcePath = (Resolve-Path -LiteralPath $ArchiveSourcePath).Path
$sourceItem = Get-Item -LiteralPath $resolvedSourcePath
$isZipSource = ($sourceItem -is [System.IO.FileInfo])
$workingDirectory = ""
$sourceLabel = ""
$htmlBaseName = ""

if ($isZipSource) {
  Write-Info "Input is a ZIP archive. Expanding into a working directory."
  if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $zipBaseName = [System.IO.Path]::GetFileNameWithoutExtension($resolvedSourcePath)
    $OutputDirectory = Join-Path -Path ([System.IO.Path]::GetDirectoryName($resolvedSourcePath)) -ChildPath "${zipBaseName}-html"
  }

  if ((Test-Path -LiteralPath $OutputDirectory) -and -not $Force) {
    throw "Ausgabeordner existiert bereits. Nutze -Force oder gib einen anderen Zielordner an: $OutputDirectory"
  }

  if (Test-Path -LiteralPath $OutputDirectory) {
    Remove-Item -LiteralPath $OutputDirectory -Recurse -Force
  }

  New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
  Expand-Archive -LiteralPath $resolvedSourcePath -DestinationPath $OutputDirectory -Force
  $workingDirectory = (Resolve-Path -LiteralPath $OutputDirectory).Path
  $sourceLabel = "ZIP"
  $htmlBaseName = [System.IO.Path]::GetFileNameWithoutExtension($resolvedSourcePath)
} else {
  Write-Info "Input is an archive directory."
  if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $workingDirectory = $resolvedSourcePath
  } else {
    $resolvedOutputDirectory = [System.IO.Path]::GetFullPath($OutputDirectory)
    if ([System.StringComparer]::OrdinalIgnoreCase.Equals($resolvedOutputDirectory, $resolvedSourcePath)) {
      $workingDirectory = $resolvedSourcePath
    } else {
      if ((Test-Path -LiteralPath $resolvedOutputDirectory) -and -not $Force) {
        throw "Ausgabeordner existiert bereits. Nutze -Force oder gib einen anderen Zielordner an: $resolvedOutputDirectory"
      }
      if (Test-Path -LiteralPath $resolvedOutputDirectory) {
        Remove-Item -LiteralPath $resolvedOutputDirectory -Recurse -Force
      }
      Write-Info "Copying archive directory into a dedicated working directory."
      Copy-ArchiveDirectoryContent -SourceDirectory $resolvedSourcePath -DestinationDirectory $resolvedOutputDirectory
      $workingDirectory = (Resolve-Path -LiteralPath $resolvedOutputDirectory).Path
    }
  }
  $sourceLabel = "Ordner"
  $htmlBaseName = Split-Path -Path $workingDirectory -Leaf
}

$manifestPath = Join-Path -Path $workingDirectory -ChildPath "manifest.json"
$postsPath = Join-Path -Path $workingDirectory -ChildPath "posts.json"
$sqlitePath = Join-Path -Path $workingDirectory -ChildPath "threadline-archive.sqlite"

if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
  throw "manifest.json fehlt im Archiv."
}
Write-Info "Found manifest.json."

$manifest = Read-JsonFileUtf8 -Path $manifestPath
$posts = $null
$postSourceLabel = ""
if ($UsePostsJson) {
  if (-not (Test-Path -LiteralPath $postsPath -PathType Leaf)) {
    throw "posts.json fehlt im Archiv. Entferne -UsePostsJson oder erzeuge posts.json explizit im Export-Script."
  }
  Write-Info "Using posts.json as requested."
  $posts = Read-JsonFileUtf8 -Path $postsPath
  if ($MaxPosts -gt 0) {
    Write-Info "Limiting posts.json export to the first $MaxPosts posts."
    $posts = @($posts) | Select-Object -First $MaxPosts
  }
  $postSourceLabel = "posts.json"
} else {
  if (-not (Test-Path -LiteralPath $sqlitePath -PathType Leaf)) {
    throw "threadline-archive.sqlite fehlt im Archiv. Nutze -UsePostsJson als Fallback oder erzeuge das Archiv erneut."
  }
  $resolvedSqliteExePath = Resolve-SqliteExePath -PathValue $SqliteExePath
  Write-Info "Using threadline-archive.sqlite as the primary post source."
  Write-Info "Resolved sqlite3: $resolvedSqliteExePath"
  $posts = Load-ArchivePostsFromSqlite -SqliteExe $resolvedSqliteExePath -DatabasePath $sqlitePath -MaxPosts $MaxPosts
  $postSourceLabel = "SQLite"
}
$postsArray = @($posts)
$stats = Get-ArchiveContentStats -Posts $postsArray
Write-Info ("Loaded {0} posts, {1} images, {2} link cards, {3} avatar references." -f $stats.postCount, $stats.imageCount, $stats.cardCount, $stats.avatarCount)

if ($postsArray.Count -eq 0) {
  Write-Warning "Das Archiv enthaelt keine Posts. Es wird trotzdem ein HTML-Grundgeruest erzeugt."
}

if ($InlineAssets) {
  Write-Info "Asset mode: inline data URLs."
  Inline-ArchiveAssetsForHtml -WorkingDirectory $workingDirectory -Posts $postsArray -Force:$Force
} else {
  Write-Info "Asset mode: reuse original archive assets."
  Stage-ArchiveAssetsForHtml -WorkingDirectory $workingDirectory -Posts $postsArray
}

Write-Info "Building HTML document."
Write-Info "HTML is currently assembled in memory before it is written to disk."
$html = Build-ArchiveHtml -Manifest $manifest -Posts $postsArray
$htmlFileName = "{0}.html" -f $htmlBaseName
$htmlPath = Join-Path -Path $workingDirectory -ChildPath $htmlFileName
Write-Info "Writing HTML file."
[System.IO.File]::WriteAllText($htmlPath, $html, [System.Text.UTF8Encoding]::new($true))
$htmlFileSizeBytes = [int64](Get-Item -LiteralPath $htmlPath).Length
$htmlFileSizeMb = [Math]::Round(($htmlFileSizeBytes / 1MB), 1)

Write-Host ""
Write-Host "Threadline-Archiv wurde als HTML aufbereitet:" -ForegroundColor Green
Write-Host "  Quelle ($sourceLabel): $resolvedSourcePath"
Write-Host "  Post-Daten: $postSourceLabel"
Write-Host "  Posts: $($stats.postCount)"
Write-Host "  Bilder: $($stats.imageCount)"
Write-Host "  Link-Cards: $($stats.cardCount)"
Write-Host "  Assets: $(if ($InlineAssets) { 'inline' } else { 'Originaldateien im Archiv' })"
Write-Host "  HTML-Größe: $htmlFileSizeMb MB"
Write-Host "  HTML: $htmlPath"
Write-Host "  Ordner: $workingDirectory"
