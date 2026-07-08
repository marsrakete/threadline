[CmdletBinding()]
param(
  [string]$ConfigPath = "",
  [string]$Identifier = "",
  [string]$AppPassword = "",
  [string]$Service = "",
  [string]$SourceActor = "",
  [string]$OutputDirectory = "",
  [ValidateSet("all", "year", "range")]
  [string]$Scope = "",
  [string]$Year = "",
  [string]$From = "",
  [string]$To = "",
  [ValidateSet("full", "posts", "threads", "thread_roots")]
  [string]$ContentMode = "",
  [switch]$IncludeConversationContext,
  [int]$MaxPosts = 0,
  [ValidateSet("normal", "aggressive", "night")]
  [string]$WaitProfile = "",
  [switch]$Resume,
  [switch]$Update,
  [ValidateSet("fetch", "context", "metrics", "avatars", "media", "export", "zip")]
  [string]$RestartFrom = "",
  [switch]$CreatePostsJson,
  [switch]$CreateZip,
  [string]$SqliteExePath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Script:ToolVersion = "0.1.0-sqlite"
$Script:DefaultService = "https://bsky.social"
$Script:DefaultMaxPosts = 2000
$Script:DefaultPageSize = 100
$Script:DefaultSqliteExePath = "C:\portable\sqlite\sqlite3.exe"
$Script:UserAgent = "threadline-powershell-sqlite-archiver/$($Script:ToolVersion)"
$Script:ProgressInlineActive = $false
$Script:ProgressInlineLength = 0

function Write-Info {
  param([string]$Message)
  if ($Script:ProgressInlineActive) {
    Write-Host ""
    $Script:ProgressInlineActive = $false
    $Script:ProgressInlineLength = 0
  }
  Write-Host "[threadline-sqlite-archiver] $Message"
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
    $message = "[threadline-sqlite-archiver] $Label $Current / $Total"
    $paddingLength = [Math]::Max(0, $Script:ProgressInlineLength - $message.Length)
    $padding = if ($paddingLength -gt 0) { " " * $paddingLength } else { "" }
    Write-Host -NoNewline ("`r" + $message + $padding)
    $Script:ProgressInlineActive = $Current -lt $Total
    $Script:ProgressInlineLength = $message.Length
    if ($Current -eq $Total) {
      Write-Host ""
      $Script:ProgressInlineActive = $false
      $Script:ProgressInlineLength = 0
    }
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

function Ensure-Directory {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (-not [string]::IsNullOrWhiteSpace($Path)) {
    [System.IO.Directory]::CreateDirectory($Path) | Out-Null
  }
}

function Read-JsonFileUtf8 {
  param([Parameter(Mandatory = $true)][string]$Path)
  $utf8 = [System.Text.UTF8Encoding]::new($true, $true)
  $text = [System.IO.File]::ReadAllText($Path, $utf8)
  if ([string]::IsNullOrWhiteSpace($text)) {
    return $null
  }
  return ConvertFrom-Json -InputObject $text
}

function Write-JsonFileUtf8 {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)]$Value
  )
  $directory = [System.IO.Path]::GetDirectoryName($Path)
  if ($directory) {
    Ensure-Directory -Path $directory
  }
  $json = $Value | ConvertTo-Json -Depth 100
  $utf8 = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText($Path, $json, $utf8)
}

function Append-LineUtf8 {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Line
  )
  $directory = [System.IO.Path]::GetDirectoryName($Path)
  if ($directory) {
    Ensure-Directory -Path $directory
  }
  $utf8 = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::AppendAllText($Path, $Line + [Environment]::NewLine, $utf8)
}

function Get-ConfigValue {
  param(
    $Config,
    [string]$Name,
    $Default = $null
  )
  if ($null -eq $Config) {
    return $Default
  }
  if ($Config -is [System.Collections.IDictionary]) {
    if ($Config.Contains($Name)) {
      $value = $Config[$Name]
      if ($null -ne $value) {
        return $value
      }
    }
    return $Default
  }
  $property = $Config.PSObject.Properties[$Name]
  if ($null -eq $property -or $null -eq $property.Value) {
    return $Default
  }
  return $property.Value
}

function Get-ObjectPropertyValue {
  param(
    $Object,
    [string]$Name,
    $Default = $null
  )
  if ($null -eq $Object) {
    return $Default
  }
  if ($Object -is [System.Collections.IDictionary]) {
    if ($Object.Contains($Name)) {
      $value = $Object[$Name]
      if ($null -ne $value) {
        return $value
      }
    }
    return $Default
  }
  $property = $Object.PSObject.Properties[$Name]
  if ($null -eq $property -or $null -eq $property.Value) {
    return $Default
  }
  return $property.Value
}

function Set-ObjectPropertyValue {
  param(
    [Parameter(Mandatory = $true)]$Object,
    [Parameter(Mandatory = $true)][string]$Name,
    $Value
  )
  if ($Object -is [System.Collections.IDictionary]) {
    $Object[$Name] = $Value
    return
  }
  $property = $Object.PSObject.Properties[$Name]
  if ($null -ne $property) {
    $property.Value = $Value
    return
  }
  $Object | Add-Member -NotePropertyName $Name -NotePropertyValue $Value
}

function Resolve-ConfigPathValue {
  param(
    [string]$Value,
    [string]$ConfigFilePath
  )
  if ([string]::IsNullOrWhiteSpace($Value)) {
    return ""
  }
  if ([System.IO.Path]::IsPathRooted($Value)) {
    return [System.IO.Path]::GetFullPath($Value)
  }
  $baseDirectory = if ($ConfigFilePath) { Split-Path -Parent $ConfigFilePath } else { (Get-Location).Path }
  return [System.IO.Path]::GetFullPath((Join-Path $baseDirectory $Value))
}

function Normalize-ServiceUrl {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $Script:DefaultService
  }
  return ([string]$Value).Trim().TrimEnd("/")
}

function Test-LooksLikePlaceholderCredential {
  param(
    [string]$Identifier,
    [string]$AppPassword
  )
  if ([string]::IsNullOrWhiteSpace($Identifier) -or [string]::IsNullOrWhiteSpace($AppPassword)) {
    return $false
  }
  if ($Identifier -eq "your-handle.bsky.social") {
    return $true
  }
  if ($AppPassword -eq "xxxx-xxxx-xxxx-xxxx") {
    return $true
  }
  return $false
}

function Normalize-ArchiveDateString {
  param(
    [string]$Value,
    [string]$FieldName
  )
  if ([string]::IsNullOrWhiteSpace($Value)) {
    return ""
  }
  $trimmed = $Value.Trim()
  try {
    return ([datetime]::ParseExact($trimmed, "yyyy-MM-dd", [System.Globalization.CultureInfo]::InvariantCulture)).ToString("yyyy-MM-dd")
  } catch {
    throw "Invalid value for $FieldName. Use YYYY-MM-DD."
  }
}

function Get-WaitProfileSettings {
  param([string]$Profile)
  switch ($Profile) {
    "aggressive" {
      return @{
        SoftPauseEveryPages = 40
        SoftPauseMs = 3000
        LongPauseEveryPages = 200
        LongPauseMs = 12000
        RetryFallbacksMs = @(1000, 2500, 5000, 10000)
      }
    }
    "night" {
      return @{
        SoftPauseEveryPages = 20
        SoftPauseMs = 5000
        LongPauseEveryPages = 80
        LongPauseMs = 20000
        RetryFallbacksMs = @(2000, 5000, 10000, 20000)
      }
    }
    default {
      return @{
        SoftPauseEveryPages = 30
        SoftPauseMs = 4000
        LongPauseEveryPages = 120
        LongPauseMs = 15000
        RetryFallbacksMs = @(1500, 4000, 8000, 15000)
      }
    }
  }
}

function Invoke-SoftPauseIfNeeded {
  param(
    [int]$PageCount,
    [hashtable]$WaitSettings
  )
  if ($WaitSettings.LongPauseEveryPages -gt 0 -and $PageCount -gt 0 -and ($PageCount % $WaitSettings.LongPauseEveryPages) -eq 0) {
    $seconds = [Math]::Ceiling($WaitSettings.LongPauseMs / 1000)
    Write-Info "Cooling down for $seconds seconds after $PageCount pages."
    Start-Sleep -Milliseconds $WaitSettings.LongPauseMs
    return
  }
  if ($WaitSettings.SoftPauseEveryPages -gt 0 -and $PageCount -gt 0 -and ($PageCount % $WaitSettings.SoftPauseEveryPages) -eq 0) {
    $seconds = [Math]::Ceiling($WaitSettings.SoftPauseMs / 1000)
    Write-Info "Cooling down for $seconds seconds after $PageCount pages."
    Start-Sleep -Milliseconds $WaitSettings.SoftPauseMs
  }
}

function Get-HttpErrorPayload {
  param([Exception]$Exception)
  try {
    $responseStream = $Exception.Response.GetResponseStream()
    if ($null -eq $responseStream) {
      return $null
    }
    $reader = New-Object System.IO.StreamReader($responseStream)
    try {
      $text = $reader.ReadToEnd()
      if ([string]::IsNullOrWhiteSpace($text)) {
        return $null
      }
      return ConvertFrom-Json -InputObject $text
    } finally {
      $reader.Dispose()
      $responseStream.Dispose()
    }
  } catch {
    return $null
  }
}

function Invoke-HttpJson {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Uri,
    [hashtable]$Headers = @{},
    $Body = $null,
    [int[]]$RetryFallbacksMs = @()
  )
  $attempt = 0
  while ($true) {
    try {
      $params = @{
        Method = $Method
        Uri = $Uri
        Headers = $Headers
        UserAgent = $Script:UserAgent
        TimeoutSec = 60
      }
      if ($null -ne $Body) {
        $params["ContentType"] = "application/json"
        $params["Body"] = ($Body | ConvertTo-Json -Depth 50 -Compress)
      }
      return Invoke-RestMethod @params
    } catch {
      if ($attempt -ge $RetryFallbacksMs.Count) {
        throw
      }
      Start-Sleep -Milliseconds $RetryFallbacksMs[$attempt]
      $attempt += 1
    }
  }
}

function New-AtprotoSession {
  param(
    [Parameter(Mandatory = $true)][string]$Identifier,
  [Parameter(Mandatory = $true)][string]$AppPassword,
  [Parameter(Mandatory = $true)][string]$Service,
  [int[]]$RetryFallbacksMs = @()
  )
  try {
    return Invoke-HttpJson -Method POST -Uri "$Service/xrpc/com.atproto.server.createSession" -Body @{
      identifier = $Identifier
      password = $AppPassword
    } -RetryFallbacksMs $RetryFallbacksMs
  } catch {
    $payload = Get-HttpErrorPayload -Exception $_.Exception
    $errorCode = [string](Get-ObjectPropertyValue -Object $payload -Name "error" -Default "")
    if ($errorCode -eq "AuthenticationRequired") {
      throw "Login failed for '$Identifier'. Check the handle/service combination and use a valid Bluesky app password in the form xxxx-xxxx-xxxx-xxxx."
    }
    throw
  }
}

function Refresh-AtprotoSession {
  param(
    [Parameter(Mandatory = $true)]$SessionState,
    [int[]]$RetryFallbacksMs = @()
  )
  $body = $null
  $headers = @{
    Authorization = "Bearer $($SessionState.Session.refreshJwt)"
  }
  try {
    $SessionState.Session = Invoke-HttpJson -Method POST -Uri "$($SessionState.Service)/xrpc/com.atproto.server.refreshSession" -Headers $headers -Body $body -RetryFallbacksMs $RetryFallbacksMs
  } catch {
    $payload = Get-HttpErrorPayload -Exception $_.Exception
    $errorCode = [string](Get-ObjectPropertyValue -Object $payload -Name "error" -Default "")
    if ($errorCode -eq "ExpiredToken") {
      Write-Info "Refresh token expired. Creating a new session."
      $SessionState.Session = New-AtprotoSession -Identifier $SessionState.Identifier -AppPassword $SessionState.AppPassword -Service $SessionState.Service -RetryFallbacksMs $RetryFallbacksMs
      return
    }
    throw
  }
}

function Invoke-Atproto {
  param(
    [Parameter(Mandatory = $true)]$SessionState,
    [Parameter(Mandatory = $true)][string]$Endpoint,
    [hashtable]$Query = @{},
    [string]$Method = "GET",
    $Body = $null
  )
  $queryString = ""
  if ($Query.Count -gt 0) {
    $pairs = New-Object System.Collections.Generic.List[string]
    foreach ($key in $Query.Keys) {
      $value = $Query[$key]
      foreach ($item in @($value)) {
        $pairs.Add(("{0}={1}" -f [Uri]::EscapeDataString([string]$key), [Uri]::EscapeDataString([string]$item)))
      }
    }
    if ($pairs.Count -gt 0) {
      $queryString = "?" + ($pairs -join "&")
    }
  }
  $uri = "$($SessionState.Service)/xrpc/$Endpoint$queryString"
  $retrySettings = $SessionState.WaitSettings.RetryFallbacksMs
  for ($attempt = 0; $attempt -lt 2; $attempt += 1) {
    $headers = @{
      Authorization = "Bearer $($SessionState.Session.accessJwt)"
    }
    try {
      return Invoke-HttpJson -Method $Method -Uri $uri -Headers $headers -Body $Body -RetryFallbacksMs $retrySettings
    } catch {
      $response = $_.Exception.Response
      $statusCode = if ($response) { [int]$response.StatusCode } else { 0 }
      $payload = Get-HttpErrorPayload -Exception $_.Exception
      $errorCode = [string](Get-ObjectPropertyValue -Object $payload -Name "error" -Default "")
      if (($statusCode -eq 401 -or $errorCode -eq "ExpiredToken") -and $attempt -eq 0) {
        Write-Info "Access token expired. Refreshing session."
        Refresh-AtprotoSession -SessionState $SessionState -RetryFallbacksMs $retrySettings
        continue
      }
      throw
    }
  }
}

function Resolve-HandleToDid {
  param(
    [Parameter(Mandatory = $true)]$SessionState,
    [Parameter(Mandatory = $true)][string]$Handle
  )
  $response = Invoke-Atproto -SessionState $SessionState -Endpoint "com.atproto.identity.resolveHandle" -Query @{ handle = $Handle }
  if (-not $response.did) {
    throw "Could not resolve handle $Handle to a DID."
  }
  return [string]$response.did
}

function Get-ActorProfile {
  param(
    [Parameter(Mandatory = $true)]$SessionState,
    [Parameter(Mandatory = $true)][string]$Actor
  )
  return Invoke-Atproto -SessionState $SessionState -Endpoint "app.bsky.actor.getProfile" -Query @{ actor = $Actor }
}

function Get-DidDocumentUrl {
  param([string]$Did)
  if ($Did -like "did:plc:*") {
    return "https://plc.directory/$Did"
  }
  if ($Did -like "did:web:*") {
    $host = $Did.Substring(8)
    return "https://$host/.well-known/did.json"
  }
  throw "Unsupported DID method for $Did"
}

function Resolve-PdsForDid {
  param([string]$Did)
  $uri = Get-DidDocumentUrl -Did $Did
  $document = Invoke-HttpJson -Method GET -Uri $uri
  foreach ($service in @(Get-ObjectPropertyValue -Object $document -Name "service" -Default @())) {
    $serviceType = [string](Get-ObjectPropertyValue -Object $service -Name "type" -Default "")
    $serviceId = [string](Get-ObjectPropertyValue -Object $service -Name "id" -Default "")
    if ($serviceType -eq "AtprotoPersonalDataServer" -or $serviceId -like "*#atproto_pds") {
      $endpoint = [string](Get-ObjectPropertyValue -Object $service -Name "serviceEndpoint" -Default "")
      if (-not [string]::IsNullOrWhiteSpace($endpoint)) {
        return $endpoint.TrimEnd("/")
      }
    }
  }
  throw "Could not resolve PDS endpoint for DID $Did"
}

function Invoke-HttpBytes {
  param(
    [Parameter(Mandatory = $true)][string]$Uri,
    [hashtable]$Headers = @{}
  )
  $response = Invoke-WebRequest -Uri $Uri -Headers $Headers -UserAgent $Script:UserAgent -Method GET -UseBasicParsing -ErrorAction Stop
  $memory = New-Object System.IO.MemoryStream
  try {
    $response.RawContentStream.CopyTo($memory)
    return @{
      Bytes = $memory.ToArray()
      ContentType = [string]($response.Headers["Content-Type"] | Select-Object -First 1)
    }
  } finally {
    $memory.Dispose()
  }
}

function Parse-AtUri {
  param([string]$Uri)
  if ([string]::IsNullOrWhiteSpace($Uri) -or $Uri -notmatch "^at://([^/]+)/([^/]+)/([^/?#]+)") {
    return @{ did = ""; collection = ""; rkey = "" }
  }
  return @{ did = $Matches[1]; collection = $Matches[2]; rkey = $Matches[3] }
}

function Get-ArchiveRootUri {
  param($Record, [string]$FallbackUri)
  $reply = Get-ObjectPropertyValue -Object $Record -Name "reply"
  $root = Get-ObjectPropertyValue -Object $reply -Name "root"
  $rootUriValue = Get-ObjectPropertyValue -Object $root -Name "uri"
  if (-not [string]::IsNullOrWhiteSpace([string]$rootUriValue)) {
    return [string]$rootUriValue
  }
  return $FallbackUri
}

function Get-ArchiveParentUri {
  param($Record)
  $reply = Get-ObjectPropertyValue -Object $Record -Name "reply"
  $parent = Get-ObjectPropertyValue -Object $reply -Name "parent"
  $parentUriValue = Get-ObjectPropertyValue -Object $parent -Name "uri"
  if (-not [string]::IsNullOrWhiteSpace([string]$parentUriValue)) {
    return [string]$parentUriValue
  }
  return ""
}

function Test-DateInFilter {
  param(
    [string]$CreatedAt,
    [hashtable]$Filters
  )
  if ([string]::IsNullOrWhiteSpace($CreatedAt)) {
    return $false
  }
  $timestamp = [DateTimeOffset]::Parse($CreatedAt).UtcDateTime
  switch ($Filters.scope) {
    "year" {
      if ([string]::IsNullOrWhiteSpace($Filters.year)) { return $true }
      return $timestamp.Year -eq [int]$Filters.year
    }
    "range" {
      if (-not [string]::IsNullOrWhiteSpace($Filters.from)) {
        $fromStart = [datetime]::ParseExact("$($Filters.from)T00:00:00Z", "yyyy-MM-ddTHH:mm:ssZ", [System.Globalization.CultureInfo]::InvariantCulture, [System.Globalization.DateTimeStyles]::AssumeUniversal)
        if ($timestamp -lt $fromStart) { return $false }
      }
      if (-not [string]::IsNullOrWhiteSpace($Filters.to)) {
        $toEnd = [datetime]::ParseExact("$($Filters.to)T23:59:59Z", "yyyy-MM-ddTHH:mm:ssZ", [System.Globalization.CultureInfo]::InvariantCulture, [System.Globalization.DateTimeStyles]::AssumeUniversal)
        if ($timestamp -gt $toEnd) { return $false }
      }
      return $true
    }
    default {
      return $true
    }
  }
}

function Test-ShouldStopScan {
  param(
    [string]$CreatedAt,
    [hashtable]$Filters
  )
  if ([string]::IsNullOrWhiteSpace($CreatedAt)) {
    return $false
  }
  $timestamp = [DateTimeOffset]::Parse($CreatedAt).UtcDateTime
  if ($Filters.scope -eq "year" -and -not [string]::IsNullOrWhiteSpace($Filters.year)) {
    $yearStart = [datetime]::ParseExact("$($Filters.year)-01-01T00:00:00Z", "yyyy-MM-ddTHH:mm:ssZ", [System.Globalization.CultureInfo]::InvariantCulture, [System.Globalization.DateTimeStyles]::AssumeUniversal)
    if ($timestamp -lt $yearStart) { return $true }
  }
  if ($Filters.scope -eq "range" -and -not [string]::IsNullOrWhiteSpace($Filters.from)) {
    $fromStart = [datetime]::ParseExact("$($Filters.from)T00:00:00Z", "yyyy-MM-ddTHH:mm:ssZ", [System.Globalization.CultureInfo]::InvariantCulture, [System.Globalization.DateTimeStyles]::AssumeUniversal)
    if ($timestamp -lt $fromStart) { return $true }
  }
  return $false
}

function Test-RecordInSelection {
  param(
    $Record,
    [hashtable]$Filters,
    [string]$SourceDid,
    [string]$FallbackUri
  )
  if (-not (Test-DateInFilter -CreatedAt ([string](Get-ObjectPropertyValue -Object $Record -Name "createdAt" -Default "")) -Filters $Filters)) {
    return $false
  }
  switch ($Filters.contentMode) {
    "posts" {
      $parentUri = Get-ArchiveParentUri -Record $Record
      if ([string]::IsNullOrWhiteSpace($parentUri)) {
        return $true
      }
      $rootUri = Get-ArchiveRootUri -Record $Record -FallbackUri $FallbackUri
      return (Parse-AtUri -Uri $rootUri).did -eq $SourceDid
    }
    default {
      return $true
    }
  }
}

function Get-EmbedImages {
  param($Record)
  $embed = Get-ObjectPropertyValue -Object $Record -Name "embed"
  if ($null -eq $embed) { return @() }
  $images = Get-ObjectPropertyValue -Object $embed -Name "images"
  if ($images -is [System.Collections.IEnumerable]) { return @($images) | Select-Object -First 10 }
  $items = Get-ObjectPropertyValue -Object $embed -Name "items"
  if ($items -is [System.Collections.IEnumerable]) { return @($items | Where-Object { (Get-ObjectPropertyValue -Object $_ -Name "image") }) | Select-Object -First 10 }
  $media = Get-ObjectPropertyValue -Object $embed -Name "media"
  if ($media) { return Get-EmbedImages -Record @{ embed = $media } }
  return @()
}

function Get-BlobCidFromRef {
  param($Image)
  foreach ($value in @(
      (Get-ObjectPropertyValue -Object (Get-ObjectPropertyValue -Object (Get-ObjectPropertyValue -Object $Image -Name "image") -Name "ref") -Name '$link'),
      (Get-ObjectPropertyValue -Object (Get-ObjectPropertyValue -Object $Image -Name "image") -Name "cid"),
      (Get-ObjectPropertyValue -Object $Image -Name "cid"),
      (Get-ObjectPropertyValue -Object (Get-ObjectPropertyValue -Object $Image -Name "ref") -Name '$link')
    )) {
    if (-not [string]::IsNullOrWhiteSpace([string]$value)) {
      return [string]$value
    }
  }
  return ""
}

function Get-EmbedImageRefs {
  param($Record)
  $items = New-Object System.Collections.Generic.List[object]
  foreach ($image in @(Get-EmbedImages -Record $Record)) {
    $cid = Get-BlobCidFromRef -Image $image
    if ([string]::IsNullOrWhiteSpace($cid)) { continue }
    $aspectRatio = Get-ObjectPropertyValue -Object $image -Name "aspectRatio" -Default $null
    $items.Add([ordered]@{
      cid = $cid
      alt = [string](Get-ObjectPropertyValue -Object $image -Name "alt" -Default "")
      width = [int](Get-ObjectPropertyValue -Object $aspectRatio -Name "width" -Default 0)
      height = [int](Get-ObjectPropertyValue -Object $aspectRatio -Name "height" -Default 0)
    }) | Out-Null
  }
  return $items.ToArray()
}

function Get-ExternalCardFromRecord {
  param($Record)
  $embed = Get-ObjectPropertyValue -Object $Record -Name "embed"
  if ($null -eq $embed) { return $null }
  $external = Get-ObjectPropertyValue -Object $embed -Name "external"
  $media = Get-ObjectPropertyValue -Object $embed -Name "media"
  if ($null -eq $external -and $media) {
    $external = Get-ObjectPropertyValue -Object $media -Name "external"
  }
  if ($null -eq $external) { return $null }
  $thumbRef = Get-ObjectPropertyValue -Object $external -Name "thumb"
  if ($null -eq $thumbRef) { $thumbRef = Get-ObjectPropertyValue -Object $external -Name "thumbnail" }
  if ($null -eq $thumbRef) { $thumbRef = Get-ObjectPropertyValue -Object $external -Name "image" }
  return [ordered]@{
    url = [string](Get-ObjectPropertyValue -Object $external -Name "uri" -Default "")
    title = [string](Get-ObjectPropertyValue -Object $external -Name "title" -Default "")
    description = [string](Get-ObjectPropertyValue -Object $external -Name "description" -Default "")
    thumb = [string](Get-ObjectPropertyValue -Object $thumbRef -Name "uri" -Default "")
    thumbCid = [string](Get-BlobCidFromRef -Image $thumbRef)
    thumbPath = ""
    thumbLoadFailed = $false
    thumbLoadAttempts = 0
  }
}

function Build-PostWebUrl {
  param(
    [string]$Handle,
    [string]$RecordKey
  )
  if ([string]::IsNullOrWhiteSpace($Handle) -or [string]::IsNullOrWhiteSpace($RecordKey)) {
    return ""
  }
  return "https://bsky.app/profile/$Handle/post/$RecordKey"
}

function New-ArchivePostEntity {
  param(
    [string]$Uri,
    [string]$Cid,
    $Record,
    [string]$AuthorHandle,
    [string]$AuthorDid,
    [string]$AuthorDisplayName,
    [string]$AuthorAvatar,
    $Counts
  )
  $parsed = Parse-AtUri -Uri $Uri
  if ($null -eq $Counts) {
    $Counts = @{ likeCount = 0; replyCount = 0; repostCount = 0; quoteCount = 0 }
  }
  return [ordered]@{
    uri = $Uri
    cid = $Cid
    rkey = $parsed.rkey
    createdAt = [string](Get-ObjectPropertyValue -Object $Record -Name "createdAt" -Default "")
    text = [string](Get-ObjectPropertyValue -Object $Record -Name "text" -Default "")
    langs = @((Get-ObjectPropertyValue -Object $Record -Name "langs" -Default @()))
    facets = @((Get-ObjectPropertyValue -Object $Record -Name "facets" -Default @()))
    reply = Get-ObjectPropertyValue -Object $Record -Name "reply"
    thread = [ordered]@{
      rootUri = Get-ArchiveRootUri -Record $Record -FallbackUri $Uri
      parentUri = Get-ArchiveParentUri -Record $Record
    }
    counts = [ordered]@{
      likeCount = [int]$Counts.likeCount
      replyCount = [int]$Counts.replyCount
      repostCount = [int]$Counts.repostCount
      quoteCount = [int]$Counts.quoteCount
    }
    permalink = Build-PostWebUrl -Handle $AuthorHandle -RecordKey $parsed.rkey
    authorHandle = $AuthorHandle
    authorDisplayName = $AuthorDisplayName
    authorDid = $AuthorDid
    authorAvatar = $AuthorAvatar
    authorAvatarPath = ""
    sourceImages = @(Get-EmbedImageRefs -Record $Record)
    externalCard = Get-ExternalCardFromRecord -Record $Record
    images = @()
    mediaSkippedCount = 0
    isPrimarySelection = $true
  }
}

function New-ArchivePostEntityFromPostView {
  param(
    [Parameter(Mandatory = $true)]$PostView,
    [bool]$IsPrimarySelection = $false
  )
  $record = Get-ObjectPropertyValue -Object $PostView -Name "record" -Default $null
  if ($null -eq $record) {
    return $null
  }
  $author = Get-ObjectPropertyValue -Object $PostView -Name "author" -Default $null
  $entity = New-ArchivePostEntity `
    -Uri ([string](Get-ObjectPropertyValue -Object $PostView -Name "uri" -Default "")) `
    -Cid ([string](Get-ObjectPropertyValue -Object $PostView -Name "cid" -Default "")) `
    -Record $record `
    -AuthorHandle ([string](Get-ObjectPropertyValue -Object $author -Name "handle" -Default "")) `
    -AuthorDid ([string](Get-ObjectPropertyValue -Object $author -Name "did" -Default "")) `
    -AuthorDisplayName ([string](Get-ObjectPropertyValue -Object $author -Name "displayName" -Default "")) `
    -AuthorAvatar ([string](Get-ObjectPropertyValue -Object $author -Name "avatar" -Default "")) `
    -Counts @{
      likeCount = [int](Get-ObjectPropertyValue -Object $PostView -Name "likeCount" -Default 0)
      replyCount = [int](Get-ObjectPropertyValue -Object $PostView -Name "replyCount" -Default 0)
      repostCount = [int](Get-ObjectPropertyValue -Object $PostView -Name "repostCount" -Default 0)
      quoteCount = [int](Get-ObjectPropertyValue -Object $PostView -Name "quoteCount" -Default 0)
    }
  Set-ObjectPropertyValue -Object $entity -Name "isPrimarySelection" -Value $IsPrimarySelection
  return $entity
}

function Collect-ThreadViewPosts {
  param([Parameter(Mandatory = $true)]$ThreadNode)
  $result = New-Object System.Collections.Generic.List[object]
  $stack = New-Object System.Collections.Generic.Stack[object]
  $stack.Push($ThreadNode)
  while ($stack.Count -gt 0) {
    $node = $stack.Pop()
    if ($null -eq $node) {
      continue
    }
    $postView = Get-ObjectPropertyValue -Object $node -Name "post" -Default $null
    if ($null -ne $postView -and -not [string]::IsNullOrWhiteSpace([string](Get-ObjectPropertyValue -Object $postView -Name "uri" -Default ""))) {
      $result.Add($postView) | Out-Null
    }
    $parentNode = Get-ObjectPropertyValue -Object $node -Name "parent" -Default $null
    if ($null -ne $parentNode) {
      $stack.Push($parentNode)
    }
    foreach ($replyNode in @(Get-ObjectPropertyValue -Object $node -Name "replies" -Default @())) {
      if ($null -ne $replyNode) {
        $stack.Push($replyNode)
      }
    }
  }
  return $result.ToArray()
}

function ConvertTo-CompactJson {
  param($Value)
  if ($null -eq $Value) { return "" }
  return ($Value | ConvertTo-Json -Depth 100 -Compress)
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

function ConvertTo-SqliteTextLiteral {
  param([AllowNull()][string]$Value)
  if ($null -eq $Value) { return "NULL" }
  return "'" + ($Value -replace "'", "''") + "'"
}

function ConvertTo-SqliteIntegerLiteral {
  param($Value)
  if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value)) { return "NULL" }
  return ([int64]$Value).ToString([System.Globalization.CultureInfo]::InvariantCulture)
}

function Resolve-SqliteExePath {
  param([string]$PathValue)
  $candidates = New-Object System.Collections.Generic.List[string]
  if (-not [string]::IsNullOrWhiteSpace($PathValue)) { $candidates.Add($PathValue) | Out-Null }
  $configValue = [string](Get-ConfigValue -Config $config -Name "sqliteExePath" -Default "")
  if (-not [string]::IsNullOrWhiteSpace($configValue)) { $candidates.Add($configValue) | Out-Null }
  $candidates.Add($Script:DefaultSqliteExePath) | Out-Null
  $command = Get-Command sqlite3.exe -ErrorAction SilentlyContinue
  if ($command) { $candidates.Add($command.Source) | Out-Null }
  foreach ($candidate in $candidates) {
    if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
    $resolved = $candidate
    if (-not [System.IO.Path]::IsPathRooted($candidate) -and $ConfigPath) {
      $resolved = Resolve-ConfigPathValue -Value $candidate -ConfigFilePath $ConfigPath
    }
    if (Test-Path -LiteralPath $resolved -PathType Leaf) {
      return [System.IO.Path]::GetFullPath($resolved)
    }
  }
  throw "sqlite3.exe was not found. Install the official SQLite tools and pass -SqliteExePath, for example C:\portable\sqlite\sqlite3.exe."
}

function Invoke-SqliteCommand {
  param(
    [Parameter(Mandatory = $true)][string]$SqliteExe,
    [Parameter(Mandatory = $true)][string]$DatabasePath,
    [Parameter(Mandatory = $true)][string]$Sql,
    [switch]$Json
  )
  $tempSqlPath = Join-Path ([System.IO.Path]::GetTempPath()) ("threadline-sqlite-" + [guid]::NewGuid().ToString("N") + ".sql")
  [System.IO.File]::WriteAllText($tempSqlPath, $Sql, [System.Text.UTF8Encoding]::new($false))
  try {
    $args = @()
    if ($Json) { $args += "-json" }
    $args += @($DatabasePath)
    $sqliteReadPath = ([System.IO.Path]::GetFullPath($tempSqlPath)) -replace "\\", "/"
    $output = (& $SqliteExe @args ".read '$sqliteReadPath'" 2>&1)
    if ($LASTEXITCODE -ne 0) {
      throw ("sqlite3 failed with exit code {0}: {1}" -f $LASTEXITCODE, ($output -join [Environment]::NewLine))
    }
    return [string]::Join([Environment]::NewLine, @($output))
  } finally {
    if (Test-Path -LiteralPath $tempSqlPath) {
      Remove-Item -LiteralPath $tempSqlPath -Force
    }
  }
}

function Invoke-SqliteNonQuery {
  param(
    [Parameter(Mandatory = $true)][string]$SqliteExe,
    [Parameter(Mandatory = $true)][string]$DatabasePath,
    [Parameter(Mandatory = $true)][string]$Sql
  )
  Invoke-SqliteCommand -SqliteExe $SqliteExe -DatabasePath $DatabasePath -Sql $Sql | Out-Null
}

function Invoke-SqliteJsonQuery {
  param(
    [Parameter(Mandatory = $true)][string]$SqliteExe,
    [Parameter(Mandatory = $true)][string]$DatabasePath,
    [Parameter(Mandatory = $true)][string]$Sql
  )
  $output = Invoke-SqliteCommand -SqliteExe $SqliteExe -DatabasePath $DatabasePath -Sql $Sql -Json
  if ([string]::IsNullOrWhiteSpace($output)) { return @() }
  return @(ConvertFrom-Json -InputObject $output)
}

function Invoke-SqliteScalar {
  param(
    [Parameter(Mandatory = $true)][string]$SqliteExe,
    [Parameter(Mandatory = $true)][string]$DatabasePath,
    [Parameter(Mandatory = $true)][string]$Sql
  )
  $output = Invoke-SqliteCommand -SqliteExe $SqliteExe -DatabasePath $DatabasePath -Sql $Sql
  if ([string]::IsNullOrWhiteSpace($output)) {
    return ""
  }
  $lines = @(
    $output -split "(`r`n|`n|`r)" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
  )
  if ($lines.Count -eq 0) {
    return ""
  }
  return [string]$lines[-1]
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

function Get-ArchivePaths {
  param([Parameter(Mandatory = $true)][string]$OutputDirectory)
  $metaDir = Join-Path $OutputDirectory "_meta"
  return [ordered]@{
    Root = $OutputDirectory
    MetaDir = $metaDir
    DatabasePath = Join-Path $OutputDirectory "threadline-archive.sqlite"
    ManifestPath = Join-Path $OutputDirectory "manifest.json"
    PostsPath = Join-Path $OutputDirectory "posts.json"
    SessionPath = Join-Path $metaDir "session-state.json"
    CheckpointPath = Join-Path $metaDir "archive-checkpoint.json"
    MediaFailuresPath = Join-Path $metaDir "media-failures.ndjson"
    AvatarsDir = Join-Path $OutputDirectory "avatars"
    ImagesDir = Join-Path $OutputDirectory "images"
    LinkCardsDir = Join-Path $OutputDirectory "link-cards"
  }
}

function Initialize-SqliteSchema {
  param(
    [Parameter(Mandatory = $true)][string]$SqliteExe,
    [Parameter(Mandatory = $true)][string]$DatabasePath
  )
  $sql = @"
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA temp_store = MEMORY;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS run_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  uri TEXT PRIMARY KEY,
  cid TEXT,
  rkey TEXT,
  created_at TEXT,
  created_at_unix INTEGER,
  text TEXT,
  langs_json TEXT,
  facets_json TEXT,
  reply_json TEXT,
  thread_root_uri TEXT,
  thread_parent_uri TEXT,
  counts_json TEXT,
  permalink TEXT,
  author_handle TEXT,
  author_display_name TEXT,
  author_did TEXT,
  author_avatar_url TEXT,
  author_avatar_path TEXT,
  source_images_json TEXT,
  external_card_json TEXT,
  images_json TEXT,
  media_skipped_count INTEGER NOT NULL DEFAULT 0,
  is_primary_selection INTEGER NOT NULL DEFAULT 0,
  has_context INTEGER NOT NULL DEFAULT 0,
  has_metrics INTEGER NOT NULL DEFAULT 0,
  has_avatar INTEGER NOT NULL DEFAULT 0,
  has_media INTEGER NOT NULL DEFAULT 0,
  export_ready INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_posts_created_at_unix ON posts(created_at_unix DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_did ON posts(author_did);
CREATE INDEX IF NOT EXISTS idx_posts_thread_root ON posts(thread_root_uri);

CREATE TABLE IF NOT EXISTS assets (
  asset_key TEXT PRIMARY KEY,
  asset_type TEXT NOT NULL,
  post_uri TEXT,
  source_did TEXT,
  source_cid TEXT,
  source_url TEXT,
  relative_path TEXT,
  mime_type TEXT,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  last_error TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_assets_post_uri ON assets(post_uri);
"@
  Invoke-SqliteNonQuery -SqliteExe $SqliteExe -DatabasePath $DatabasePath -Sql $sql
  foreach ($migrationSql in @(
    "ALTER TABLE posts ADD COLUMN is_primary_selection INTEGER NOT NULL DEFAULT 0;",
    "ALTER TABLE posts ADD COLUMN has_context INTEGER NOT NULL DEFAULT 0;"
  )) {
    try {
      Invoke-SqliteNonQuery -SqliteExe $SqliteExe -DatabasePath $DatabasePath -Sql $migrationSql
    } catch {
      if ($_.Exception.Message -notmatch "duplicate column name") {
        throw
      }
    }
  }
  Invoke-SqliteNonQuery -SqliteExe $SqliteExe -DatabasePath $DatabasePath -Sql "CREATE INDEX IF NOT EXISTS idx_posts_primary_context ON posts(is_primary_selection, has_context, created_at_unix DESC);"
}

function Repair-PrimarySelectionFlags {
  param(
    [Parameter(Mandatory = $true)][string]$SqliteExe,
    [Parameter(Mandatory = $true)][string]$DatabasePath,
    [Parameter(Mandatory = $true)][string]$SourceDid
  )
  if ([string]::IsNullOrWhiteSpace($SourceDid)) {
    return 0
  }
  $sql = @"
UPDATE posts
SET is_primary_selection = 1
WHERE author_did = $(ConvertTo-SqliteTextLiteral $SourceDid)
  AND is_primary_selection = 0;
SELECT changes();
"@
  $changed = [string](Invoke-SqliteScalar -SqliteExe $SqliteExe -DatabasePath $DatabasePath -Sql $sql)
  if ([string]::IsNullOrWhiteSpace($changed)) {
    return 0
  }
  return [int]$changed
}

function Set-RunStateValue {
  param(
    [Parameter(Mandatory = $true)][string]$SqliteExe,
    [Parameter(Mandatory = $true)][string]$DatabasePath,
    [Parameter(Mandatory = $true)][string]$Key,
    [AllowNull()][string]$Value
  )
  $sql = @"
INSERT INTO run_state(key, value)
VALUES ($(ConvertTo-SqliteTextLiteral $Key), $(ConvertTo-SqliteTextLiteral $Value))
ON CONFLICT(key) DO UPDATE SET value = excluded.value;
"@
  Invoke-SqliteNonQuery -SqliteExe $SqliteExe -DatabasePath $DatabasePath -Sql $sql
}

function Get-RunStateValue {
  param(
    [Parameter(Mandatory = $true)][string]$SqliteExe,
    [Parameter(Mandatory = $true)][string]$DatabasePath,
    [Parameter(Mandatory = $true)][string]$Key,
    [string]$Default = ""
  )
  $sql = "SELECT value FROM run_state WHERE key = $(ConvertTo-SqliteTextLiteral $Key);"
  $rows = @(Invoke-SqliteJsonQuery -SqliteExe $SqliteExe -DatabasePath $DatabasePath -Sql $sql)
  if ($rows.Count -eq 0) { return $Default }
  return [string](Get-ObjectPropertyValue -Object $rows[0] -Name "value" -Default $Default)
}

function Initialize-ArchiveState {
  param(
    [Parameter(Mandatory = $true)][string]$SqliteExe,
    [Parameter(Mandatory = $true)][string]$DatabasePath,
    [Parameter(Mandatory = $true)][hashtable]$Filters,
    [Parameter(Mandatory = $true)][string]$SourceDid,
    [Parameter(Mandatory = $true)][string]$SourceHandle,
    [Parameter(Mandatory = $true)][string]$Service
  )
  $state = [ordered]@{
    schemaVersion = 1
    toolVersion = $Script:ToolVersion
    service = $Service
    sourceDid = $SourceDid
    sourceHandle = $SourceHandle
    filters = $Filters
    status = "running"
    phase = "fetch"
    fetchCursor = ""
    pageCount = 0
    exportedPosts = 0
    updatedAt = [DateTimeOffset]::UtcNow.ToString("o")
  }
  foreach ($key in $state.Keys) {
    $value = if ($state[$key] -is [System.Collections.IDictionary] -or ($state[$key] -is [System.Collections.IEnumerable] -and -not ($state[$key] -is [string]))) {
      ConvertTo-CompactJson -Value $state[$key]
    } else {
      [string]$state[$key]
    }
    Set-RunStateValue -SqliteExe $SqliteExe -DatabasePath $DatabasePath -Key $key -Value $value
  }
}

function Get-ArchiveStateSnapshot {
  param(
    [Parameter(Mandatory = $true)][string]$SqliteExe,
    [Parameter(Mandatory = $true)][string]$DatabasePath
  )
  $rows = @(Invoke-SqliteJsonQuery -SqliteExe $SqliteExe -DatabasePath $DatabasePath -Sql "SELECT key, value FROM run_state;")
  $state = [ordered]@{}
  foreach ($row in $rows) {
    $state[[string]$row.key] = [string]$row.value
  }
  return $state
}

function Save-ArchiveCheckpoint {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)]$State
  )
  Write-JsonFileUtf8 -Path $Path -Value $State
}

function Load-ArchiveCheckpoint {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    return $null
  }
  return Read-JsonFileUtf8 -Path $Path
}

function Reset-ArchivePhaseFromCheckpoint {
  param(
    [Parameter(Mandatory = $true)]$Checkpoint,
    [Parameter(Mandatory = $true)][string]$Phase,
    [Parameter(Mandatory = $true)][bool]$CreateZip
  )
  $phaseOrder = @("fetch", "context", "metrics", "avatars", "media", "export", "zip")
  $phaseIndex = [Array]::IndexOf($phaseOrder, $Phase)
  if ($phaseIndex -lt 0) {
    throw "Unsupported restart phase '$Phase'."
  }

  $phaseStatus = Get-ObjectPropertyValue -Object $Checkpoint -Name "phaseStatus" -Default $null
  if ($null -eq $phaseStatus) {
    $phaseStatus = [ordered]@{
      fetch = "pending"
      context = "pending"
      metrics = "pending"
      avatars = "pending"
      media = "pending"
      export = "pending"
      zip = if ($CreateZip) { "pending" } else { "disabled" }
    }
  }

  foreach ($phaseName in $phaseOrder) {
    $currentIndex = [Array]::IndexOf($phaseOrder, $phaseName)
    if ($phaseName -eq "zip" -and -not $CreateZip) {
      Set-ObjectPropertyValue -Object $phaseStatus -Name $phaseName -Value "disabled"
    } elseif ($currentIndex -lt $phaseIndex) {
      Set-ObjectPropertyValue -Object $phaseStatus -Name $phaseName -Value "complete"
    } else {
      Set-ObjectPropertyValue -Object $phaseStatus -Name $phaseName -Value "pending"
    }
  }

  switch ($Phase) {
    "fetch" {
      $Checkpoint.fetchCursor = ""
      $Checkpoint.pageCount = 0
      $Checkpoint.exportedPosts = 0
      $Checkpoint.contextOffset = 0
      $Checkpoint.metricsOffset = 0
      $Checkpoint.avatarOffset = 0
      $Checkpoint.mediaOffset = 0
    }
    "context" {
      $Checkpoint.contextOffset = 0
      $Checkpoint.metricsOffset = 0
      $Checkpoint.avatarOffset = 0
      $Checkpoint.mediaOffset = 0
    }
    "metrics" {
      $Checkpoint.metricsOffset = 0
      $Checkpoint.avatarOffset = 0
      $Checkpoint.mediaOffset = 0
    }
    "avatars" {
      $Checkpoint.avatarOffset = 0
      $Checkpoint.mediaOffset = 0
    }
    "media" {
      $Checkpoint.mediaOffset = 0
    }
  }

  $Checkpoint.phaseStatus = $phaseStatus
  $Checkpoint.phase = if ($Phase -eq "fetch") { "fetch" } else { "fetch-complete" }
  $Checkpoint.status = "running"
  $Checkpoint.updatedAt = [DateTimeOffset]::UtcNow.ToString("o")
  return $Checkpoint
}

function Get-DatabasePostCount {
  param(
    [Parameter(Mandatory = $true)][string]$SqliteExe,
    [Parameter(Mandatory = $true)][string]$DatabasePath
  )
  $value = [string](Invoke-SqliteScalar -SqliteExe $SqliteExe -DatabasePath $DatabasePath -Sql "SELECT COUNT(*) FROM posts;")
  if ([string]::IsNullOrWhiteSpace($value)) {
    return 0
  }
  return [int]$value
}

function Has-PostUriInDatabase {
  param(
    [Parameter(Mandatory = $true)][string]$SqliteExe,
    [Parameter(Mandatory = $true)][string]$DatabasePath,
    [Parameter(Mandatory = $true)][string]$Uri
  )
  if ([string]::IsNullOrWhiteSpace($Uri)) {
    return $false
  }
  $value = [string](Invoke-SqliteScalar -SqliteExe $SqliteExe -DatabasePath $DatabasePath -Sql "SELECT 1 FROM posts WHERE uri = $(ConvertTo-SqliteTextLiteral $Uri) LIMIT 1;")
  return -not [string]::IsNullOrWhiteSpace($value)
}

function Get-PendingPostCount {
  param(
    [Parameter(Mandatory = $true)][string]$SqliteExe,
    [Parameter(Mandatory = $true)][string]$DatabasePath,
    [Parameter(Mandatory = $true)][ValidateSet("has_context","has_metrics","has_avatar","has_media")] [string]$FlagColumn,
    [string]$WhereClause = ""
  )
  $sql = "SELECT COUNT(*) FROM posts WHERE $FlagColumn = 0"
  if (-not [string]::IsNullOrWhiteSpace($WhereClause)) {
    $sql += " AND ($WhereClause)"
  }
  $sql += ";"
  $value = [string](Invoke-SqliteScalar -SqliteExe $SqliteExe -DatabasePath $DatabasePath -Sql $sql)
  if ([string]::IsNullOrWhiteSpace($value)) {
    return 0
  }
  return [int]$value
}

function ConvertTo-SqliteUnixMillis {
  param([string]$CreatedAt)
  if ([string]::IsNullOrWhiteSpace($CreatedAt)) { return 0 }
  try {
    return [int64]([DateTimeOffset]::Parse($CreatedAt).ToUnixTimeMilliseconds())
  } catch {
    return 0
  }
}

function Get-AssetExtensionFromMimeType {
  param([string]$MimeType)
  $value = [string]$MimeType
  if ($value -match "png") { return "png" }
  if ($value -match "webp") { return "webp" }
  if ($value -match "gif") { return "gif" }
  if ($value -match "svg") { return "svg" }
  if ($value -match "jpeg|jpg") { return "jpg" }
  return "bin"
}

function Save-ByteAsset {
  param(
    [Parameter(Mandatory = $true)][string]$OutputDirectory,
    [Parameter(Mandatory = $true)][string]$RelativePath,
    [Parameter(Mandatory = $true)][byte[]]$Bytes,
    [Parameter(Mandatory = $true)][string]$ContentType
  )
  $fullPath = Join-Path $OutputDirectory $RelativePath
  Ensure-Directory -Path (Split-Path -Parent $fullPath)
  [System.IO.File]::WriteAllBytes($fullPath, $Bytes)
  return [ordered]@{
    path = $RelativePath.Replace("\", "/")
    type = if ([string]::IsNullOrWhiteSpace($ContentType)) { "application/octet-stream" } else { $ContentType }
    sizeBytes = $Bytes.Length
  }
}

function Get-AssetRecordFromRelativePath {
  param(
    [Parameter(Mandatory = $true)][string]$OutputDirectory,
    [Parameter(Mandatory = $true)][string]$RelativePath,
    [string]$ContentType = "application/octet-stream"
  )
  if ([string]::IsNullOrWhiteSpace($RelativePath)) {
    return $null
  }
  $fullPath = Join-Path $OutputDirectory $RelativePath
  if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
    return $null
  }
  return [ordered]@{
    path = $RelativePath.Replace("\", "/")
    type = if ([string]::IsNullOrWhiteSpace($ContentType)) { "application/octet-stream" } else { $ContentType }
    sizeBytes = [int64](Get-Item -LiteralPath $fullPath).Length
  }
}

function Get-BlobAssetCacheKey {
  param(
    [string]$Did,
    [string]$Cid
  )
  if ([string]::IsNullOrWhiteSpace($Did) -or [string]::IsNullOrWhiteSpace($Cid)) {
    return ""
  }
  return "blob:${Did}:${Cid}"
}

function Get-UrlAssetCacheKey {
  param([string]$Url)
  if ([string]::IsNullOrWhiteSpace($Url)) {
    return ""
  }
  return "url:$Url"
}

function Build-CdnBlobThumbnailUrl {
  param(
    [string]$Did,
    [string]$Cid
  )
  if ([string]::IsNullOrWhiteSpace($Did) -or [string]::IsNullOrWhiteSpace($Cid)) {
    return ""
  }
  return "https://cdn.bsky.app/img/feed_thumbnail/plain/$([Uri]::EscapeDataString($Did))/$([Uri]::EscapeDataString($Cid))@jpeg"
}

function Build-CdnBlobImageUrl {
  param(
    [string]$Did,
    [string]$Cid
  )
  if ([string]::IsNullOrWhiteSpace($Did) -or [string]::IsNullOrWhiteSpace($Cid)) {
    return ""
  }
  return "https://cdn.bsky.app/img/feed_fullsize/plain/$([Uri]::EscapeDataString($Did))/$([Uri]::EscapeDataString($Cid))@jpeg"
}

function Build-PdsBlobUrl {
  param(
    [string]$Did,
    [string]$Cid
  )
  if ([string]::IsNullOrWhiteSpace($Did) -or [string]::IsNullOrWhiteSpace($Cid)) {
    return ""
  }
  $pds = Resolve-PdsForDid -Did $Did
  return "$pds/xrpc/com.atproto.sync.getBlob?did=$([Uri]::EscapeDataString($Did))&cid=$([Uri]::EscapeDataString($Cid))"
}

function Get-CachedAsset {
  param(
    [Parameter(Mandatory = $true)][hashtable]$AssetIndex,
    [Parameter(Mandatory = $true)][string]$CacheKey,
    [Parameter(Mandatory = $true)][string]$OutputDirectory
  )
  if ([string]::IsNullOrWhiteSpace($CacheKey) -or -not $AssetIndex.ContainsKey($CacheKey)) {
    return $null
  }
  $cached = $AssetIndex[$CacheKey]
  $relativePath = [string](Get-ObjectPropertyValue -Object $cached -Name "path" -Default "")
  $contentType = [string](Get-ObjectPropertyValue -Object $cached -Name "type" -Default "application/octet-stream")
  $asset = Get-AssetRecordFromRelativePath -OutputDirectory $OutputDirectory -RelativePath $relativePath -ContentType $contentType
  if ($null -eq $asset) {
    $AssetIndex.Remove($CacheKey) | Out-Null
    return $null
  }
  $AssetIndex[$CacheKey] = $asset
  return $asset
}

function Set-CachedAsset {
  param(
    [Parameter(Mandatory = $true)][hashtable]$AssetIndex,
    [Parameter(Mandatory = $true)][string]$CacheKey,
    [Parameter(Mandatory = $true)]$Asset
  )
  if ([string]::IsNullOrWhiteSpace($CacheKey) -or $null -eq $Asset) {
    return
  }
  $AssetIndex[$CacheKey] = [ordered]@{
    path = [string](Get-ObjectPropertyValue -Object $Asset -Name "path" -Default "")
    type = [string](Get-ObjectPropertyValue -Object $Asset -Name "type" -Default "application/octet-stream")
    sizeBytes = [int64](Get-ObjectPropertyValue -Object $Asset -Name "sizeBytes" -Default 0)
  }
}

function Add-AssetToListIfMissing {
  param(
    [Parameter(Mandatory = $true)]$AssetList,
    [Parameter(Mandatory = $true)][hashtable]$AssetPathIndex,
    $Asset
  )
  if ($null -eq $Asset) {
    return
  }
  $path = [string](Get-ObjectPropertyValue -Object $Asset -Name "path" -Default "")
  if ([string]::IsNullOrWhiteSpace($path) -or $AssetPathIndex.ContainsKey($path)) {
    return
  }
  $AssetPathIndex[$path] = $true
  $AssetList.Add($Asset) | Out-Null
}

function Download-BlobAsset {
  param(
    [Parameter(Mandatory = $true)]$SessionState,
    [Parameter(Mandatory = $true)][string]$Did,
    [Parameter(Mandatory = $true)][string]$Cid
  )
  $uri = Build-PdsBlobUrl -Did $Did -Cid $Cid
  $retrySettings = $SessionState.WaitSettings.RetryFallbacksMs
  for ($attempt = 0; $attempt -lt 2; $attempt += 1) {
    $headers = @{ Authorization = "Bearer $($SessionState.Session.accessJwt)" }
    try {
      return Invoke-HttpBytes -Uri $uri -Headers $headers
    } catch {
      $response = $_.Exception.Response
      $statusCode = if ($response) { [int]$response.StatusCode } else { 0 }
      $payload = Get-HttpErrorPayload -Exception $_.Exception
      $errorCode = [string](Get-ObjectPropertyValue -Object $payload -Name "error" -Default "")
      if (($statusCode -eq 401 -or $errorCode -eq "ExpiredToken") -and $attempt -eq 0) {
        Write-Info "Access token expired during blob download. Refreshing session."
        Refresh-AtprotoSession -SessionState $SessionState -RetryFallbacksMs $retrySettings | Out-Null
        continue
      }
      throw
    }
  }
}

function Try-DownloadPostImageAsset {
  param(
    [Parameter(Mandatory = $true)]$SessionState,
    [Parameter(Mandatory = $true)]$Post,
    [Parameter(Mandatory = $true)]$Image,
    [Parameter(Mandatory = $true)][string]$Cid,
    [Parameter(Mandatory = $true)][int]$ImageIndex,
    [Parameter(Mandatory = $true)][string]$OutputDirectory,
    [Parameter(Mandatory = $true)][hashtable]$AssetIndex
  )
  $did = [string](Get-ObjectPropertyValue -Object $Post -Name "authorDid" -Default "")
  $cacheKey = Get-BlobAssetCacheKey -Did $did -Cid $Cid
  $cachedAsset = Get-CachedAsset -AssetIndex $AssetIndex -CacheKey $cacheKey -OutputDirectory $OutputDirectory
  if ($cachedAsset) {
    return [ordered]@{
      asset = $cachedAsset
      source = "cache"
      remoteUrl = ""
      blobUrl = Build-PdsBlobUrl -Did $did -Cid $Cid
      cdnUrl = Build-CdnBlobImageUrl -Did $did -Cid $Cid
    }
  }

  $download = $null
  $downloadSource = ""
  $blobUrl = Build-PdsBlobUrl -Did $did -Cid $Cid
  $fallbackImageUrl = Build-CdnBlobImageUrl -Did $did -Cid $Cid
  $blobErrorMessage = ""
  $cdnErrorMessage = ""
  try {
    $download = Download-BlobAsset -SessionState $SessionState -Did $did -Cid $Cid
    $downloadSource = "blob"
  } catch {
    $blobErrorMessage = $_.Exception.Message
    if (-not [string]::IsNullOrWhiteSpace($fallbackImageUrl)) {
      Write-Info "Blob image lookup failed for $($Post.uri). Falling back to CDN image URL."
    } else {
      throw
    }
  }
  if ($null -eq $download -and -not [string]::IsNullOrWhiteSpace($fallbackImageUrl)) {
    try {
      $download = Invoke-HttpBytes -Uri $fallbackImageUrl -Headers @{}
      $downloadSource = "url"
    } catch {
      $cdnErrorMessage = $_.Exception.Message
      $combinedMessage = "Blob failed: $blobErrorMessage"
      if (-not [string]::IsNullOrWhiteSpace($fallbackImageUrl)) {
        $combinedMessage += " | CDN failed: $cdnErrorMessage"
      }
      throw $combinedMessage
    }
  }
  if ($null -eq $download) {
    return $null
  }

  $extension = Get-AssetExtensionFromMimeType -MimeType $download.ContentType
  $authorSlug = ([string](Get-ObjectPropertyValue -Object $Post -Name "authorHandle" -Default ""), $did -join "-").Replace(":", "-").Replace("/", "-")
  $authorSlug = ($authorSlug -replace "[^\w.-]+", "-").Trim("-")
  if ([string]::IsNullOrWhiteSpace($authorSlug)) { $authorSlug = "author" }
  $createdAtValue = [string](Get-ObjectPropertyValue -Object $Post -Name "createdAt" -Default "")
  $yearPart = if ($createdAtValue.Length -ge 4) { $createdAtValue.Substring(0, 4) } else { "misc" }
  $rkeyValue = [string](Get-ObjectPropertyValue -Object $Post -Name "rkey" -Default "")
  $relativePath = "images/$yearPart/$authorSlug-$rkeyValue-$ImageIndex.$extension"
  $asset = Save-ByteAsset -OutputDirectory $OutputDirectory -RelativePath $relativePath -Bytes $download.Bytes -ContentType $download.ContentType
  Set-CachedAsset -AssetIndex $AssetIndex -CacheKey $cacheKey -Asset $asset

  return [ordered]@{
    asset = $asset
    source = $downloadSource
    remoteUrl = $(if ($downloadSource -eq "url") { $fallbackImageUrl } else { $blobUrl })
    blobUrl = $blobUrl
    cdnUrl = $fallbackImageUrl
  }
}

function Try-DownloadLinkCardThumbnailAsset {
  param(
    [Parameter(Mandatory = $true)]$SessionState,
    [Parameter(Mandatory = $true)]$Post,
    [string]$ThumbCid,
    [string]$ThumbUrl,
    [Parameter(Mandatory = $true)][string]$OutputDirectory,
    [Parameter(Mandatory = $true)][hashtable]$AssetIndex
  )
  $thumbCacheKey = if (-not [string]::IsNullOrWhiteSpace($ThumbCid)) {
    Get-BlobAssetCacheKey -Did ([string]$Post.authorDid) -Cid $ThumbCid
  } else {
    Get-UrlAssetCacheKey -Url $ThumbUrl
  }
  $cachedAsset = Get-CachedAsset -AssetIndex $AssetIndex -CacheKey $thumbCacheKey -OutputDirectory $OutputDirectory
  if ($cachedAsset) {
    return $cachedAsset
  }

  $download = $null
  $downloadSource = ""
  $fallbackThumbUrl = $ThumbUrl
  if (-not [string]::IsNullOrWhiteSpace($ThumbCid)) {
    try {
      $download = Download-BlobAsset -SessionState $SessionState -Did ([string]$Post.authorDid) -Cid $ThumbCid
      $downloadSource = "blob"
    } catch {
      if ([string]::IsNullOrWhiteSpace($fallbackThumbUrl)) {
        $fallbackThumbUrl = Build-CdnBlobThumbnailUrl -Did ([string]$Post.authorDid) -Cid $ThumbCid
      }
      if (-not [string]::IsNullOrWhiteSpace($fallbackThumbUrl)) {
        Write-Info "Blob thumbnail lookup failed for $($Post.uri). Falling back to thumbnail URL."
      } else {
        throw
      }
    }
  }
  if ($null -eq $download -and -not [string]::IsNullOrWhiteSpace($fallbackThumbUrl)) {
    $download = Invoke-HttpBytes -Uri $fallbackThumbUrl -Headers @{}
    $downloadSource = "url"
  }
  if ($null -eq $download) {
    return $null
  }

  $extension = Get-AssetExtensionFromMimeType -MimeType $download.ContentType
  $authorSlug = ([string]$Post.authorHandle, [string]$Post.authorDid -join "-").Replace(":", "-").Replace("/", "-")
  $authorSlug = ($authorSlug -replace "[^\w.-]+", "-").Trim("-")
  if ([string]::IsNullOrWhiteSpace($authorSlug)) {
    $authorSlug = "author"
  }
  $relativePath = "link-cards/$authorSlug-$($Post.rkey).$extension"
  $asset = Save-ByteAsset -OutputDirectory $OutputDirectory -RelativePath $relativePath -Bytes $download.Bytes -ContentType $download.ContentType
  Set-CachedAsset -AssetIndex $AssetIndex -CacheKey $thumbCacheKey -Asset $asset
  if ($downloadSource -eq "url") {
    Set-CachedAsset -AssetIndex $AssetIndex -CacheKey (Get-UrlAssetCacheKey -Url $fallbackThumbUrl) -Asset $asset
  }
  return $asset
}

function Download-AvatarAsset {
  param(
    [Parameter(Mandatory = $true)]$Post,
    [Parameter(Mandatory = $true)][string]$OutputDirectory,
    [Parameter(Mandatory = $true)][hashtable]$AssetIndex
  )
  $avatarUrl = [string](Get-ObjectPropertyValue -Object $Post -Name "authorAvatar" -Default "")
  if ([string]::IsNullOrWhiteSpace($avatarUrl)) {
    return $null
  }
  $existingAvatarPath = [string](Get-ObjectPropertyValue -Object $Post -Name "authorAvatarPath" -Default "")
  if (-not [string]::IsNullOrWhiteSpace($existingAvatarPath)) {
    $asset = Get-AssetRecordFromRelativePath -OutputDirectory $OutputDirectory -RelativePath $existingAvatarPath
    if ($asset) {
      $AssetIndex[$avatarUrl] = $asset
      return $asset
    }
  }
  if ($AssetIndex.ContainsKey($avatarUrl)) {
    $cached = Get-CachedAsset -AssetIndex $AssetIndex -CacheKey $avatarUrl -OutputDirectory $OutputDirectory
    if ($cached) {
      Set-ObjectPropertyValue -Object $Post -Name "authorAvatarPath" -Value $cached.path
      return $cached
    }
  }
  try {
    $download = Invoke-HttpBytes -Uri $avatarUrl -Headers @{}
    $extension = Get-AssetExtensionFromMimeType -MimeType $download.ContentType
    $slug = ([string](Get-ObjectPropertyValue -Object $Post -Name "authorHandle" -Default ""), [string](Get-ObjectPropertyValue -Object $Post -Name "authorDid" -Default "") -join "-").Replace(":", "-").Replace("/", "-")
    $slug = ($slug -replace "[^\w.-]+", "-").Trim("-")
    if ([string]::IsNullOrWhiteSpace($slug)) {
      $slug = "account"
    }
    $relativePath = "avatars/$slug.$extension"
    $asset = Save-ByteAsset -OutputDirectory $OutputDirectory -RelativePath $relativePath -Bytes $download.Bytes -ContentType $download.ContentType
    Set-CachedAsset -AssetIndex $AssetIndex -CacheKey $avatarUrl -Asset $asset
    Set-ObjectPropertyValue -Object $Post -Name "authorAvatarPath" -Value $asset.path
    return $asset
  } catch {
    $authorHandleValue = [string](Get-ObjectPropertyValue -Object $Post -Name "authorHandle" -Default "")
    Write-Info "Skipping avatar download for ${authorHandleValue}: $($_.Exception.Message)"
    return $null
  }
}

function Upsert-ArchivePostsBatch {
  param(
    [Parameter(Mandatory = $true)][string]$SqliteExe,
    [Parameter(Mandatory = $true)][string]$DatabasePath,
    [Parameter(Mandatory = $true)]$Posts
  )
  if (@($Posts).Count -eq 0) { return 0 }
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add("BEGIN IMMEDIATE;") | Out-Null
  foreach ($post in @($Posts)) {
    $createdAt = [string](Get-ObjectPropertyValue -Object $post -Name "createdAt" -Default "")
    $thread = Get-ObjectPropertyValue -Object $post -Name "thread" -Default @{}
    $sql = @"
INSERT INTO posts (
  uri, cid, rkey, created_at, created_at_unix, text, langs_json, facets_json, reply_json,
  thread_root_uri, thread_parent_uri, counts_json, permalink, author_handle, author_display_name,
  author_did, author_avatar_url, author_avatar_path, source_images_json, external_card_json, images_json,
  media_skipped_count, is_primary_selection, has_context, has_metrics, has_avatar, has_media, export_ready
) VALUES (
  $(ConvertTo-SqliteTextLiteral ([string](Get-ObjectPropertyValue -Object $post -Name "uri" -Default ""))),
  $(ConvertTo-SqliteTextLiteral ([string](Get-ObjectPropertyValue -Object $post -Name "cid" -Default ""))),
  $(ConvertTo-SqliteTextLiteral ([string](Get-ObjectPropertyValue -Object $post -Name "rkey" -Default ""))),
  $(ConvertTo-SqliteTextLiteral $createdAt),
  $(ConvertTo-SqliteIntegerLiteral (ConvertTo-SqliteUnixMillis -CreatedAt $createdAt)),
  $(ConvertTo-SqliteTextLiteral ([string](Get-ObjectPropertyValue -Object $post -Name "text" -Default ""))),
  $(ConvertTo-SqliteTextLiteral (ConvertTo-CompactJson (Get-ObjectPropertyValue -Object $post -Name "langs" -Default @()))),
  $(ConvertTo-SqliteTextLiteral (ConvertTo-CompactJson (Get-ObjectPropertyValue -Object $post -Name "facets" -Default @()))),
  $(ConvertTo-SqliteTextLiteral (ConvertTo-CompactJson (Get-ObjectPropertyValue -Object $post -Name "reply" -Default $null))),
  $(ConvertTo-SqliteTextLiteral ([string](Get-ObjectPropertyValue -Object $thread -Name "rootUri" -Default ""))),
  $(ConvertTo-SqliteTextLiteral ([string](Get-ObjectPropertyValue -Object $thread -Name "parentUri" -Default ""))),
  $(ConvertTo-SqliteTextLiteral (ConvertTo-CompactJson (Get-ObjectPropertyValue -Object $post -Name "counts" -Default @{}))),
  $(ConvertTo-SqliteTextLiteral ([string](Get-ObjectPropertyValue -Object $post -Name "permalink" -Default ""))),
  $(ConvertTo-SqliteTextLiteral ([string](Get-ObjectPropertyValue -Object $post -Name "authorHandle" -Default ""))),
  $(ConvertTo-SqliteTextLiteral ([string](Get-ObjectPropertyValue -Object $post -Name "authorDisplayName" -Default ""))),
  $(ConvertTo-SqliteTextLiteral ([string](Get-ObjectPropertyValue -Object $post -Name "authorDid" -Default ""))),
  $(ConvertTo-SqliteTextLiteral ([string](Get-ObjectPropertyValue -Object $post -Name "authorAvatar" -Default ""))),
  $(ConvertTo-SqliteTextLiteral ([string](Get-ObjectPropertyValue -Object $post -Name "authorAvatarPath" -Default ""))),
  $(ConvertTo-SqliteTextLiteral (ConvertTo-CompactJson (Get-ObjectPropertyValue -Object $post -Name "sourceImages" -Default @()))),
  $(ConvertTo-SqliteTextLiteral (ConvertTo-CompactJson (Get-ObjectPropertyValue -Object $post -Name "externalCard" -Default $null))),
  $(ConvertTo-SqliteTextLiteral (ConvertTo-CompactJson (Get-ObjectPropertyValue -Object $post -Name "images" -Default @()))),
  $(ConvertTo-SqliteIntegerLiteral ([int](Get-ObjectPropertyValue -Object $post -Name "mediaSkippedCount" -Default 0))),
  $(ConvertTo-SqliteIntegerLiteral $(if ((Get-ObjectPropertyValue -Object $post -Name "isPrimarySelection" -Default $false)) { 1 } else { 0 })),
  0,
  0, 0, 0, 0
)
ON CONFLICT(uri) DO UPDATE SET
  cid = excluded.cid,
  rkey = excluded.rkey,
  created_at = excluded.created_at,
  created_at_unix = excluded.created_at_unix,
  text = excluded.text,
  langs_json = excluded.langs_json,
  facets_json = excluded.facets_json,
  reply_json = excluded.reply_json,
  thread_root_uri = excluded.thread_root_uri,
  thread_parent_uri = excluded.thread_parent_uri,
  counts_json = excluded.counts_json,
  permalink = excluded.permalink,
  author_handle = excluded.author_handle,
  author_display_name = excluded.author_display_name,
  author_did = excluded.author_did,
  author_avatar_url = excluded.author_avatar_url,
  is_primary_selection = MAX(posts.is_primary_selection, excluded.is_primary_selection),
  source_images_json = excluded.source_images_json,
  external_card_json = excluded.external_card_json;
"@
    $lines.Add($sql) | Out-Null
  }
  $lines.Add("COMMIT;") | Out-Null
  $lines.Add("SELECT COUNT(*) AS post_count FROM posts;") | Out-Null
  $countValue = [string](Invoke-SqliteScalar -SqliteExe $SqliteExe -DatabasePath $DatabasePath -Sql ($lines -join "`n"))
  if ([string]::IsNullOrWhiteSpace($countValue)) {
    return 0
  }
  return [int]$countValue
}

function Update-ArchivePostMetricsBatch {
  param(
    [Parameter(Mandatory = $true)][string]$SqliteExe,
    [Parameter(Mandatory = $true)][string]$DatabasePath,
    [Parameter(Mandatory = $true)]$Entries
  )
  if (@($Entries).Count -eq 0) { return }
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add("BEGIN IMMEDIATE;") | Out-Null
  foreach ($entry in @($Entries)) {
    $lines.Add(@"
UPDATE posts
SET counts_json = $(ConvertTo-SqliteTextLiteral (ConvertTo-CompactJson (Get-ObjectPropertyValue -Object $entry -Name "counts" -Default @{}))),
    author_handle = $(ConvertTo-SqliteTextLiteral ([string](Get-ObjectPropertyValue -Object $entry -Name "authorHandle" -Default ""))),
    author_display_name = $(ConvertTo-SqliteTextLiteral ([string](Get-ObjectPropertyValue -Object $entry -Name "authorDisplayName" -Default ""))),
    author_did = $(ConvertTo-SqliteTextLiteral ([string](Get-ObjectPropertyValue -Object $entry -Name "authorDid" -Default ""))),
    author_avatar_url = $(ConvertTo-SqliteTextLiteral ([string](Get-ObjectPropertyValue -Object $entry -Name "authorAvatar" -Default ""))),
    has_metrics = 1
WHERE uri = $(ConvertTo-SqliteTextLiteral ([string](Get-ObjectPropertyValue -Object $entry -Name "uri" -Default "")));
"@) | Out-Null
  }
  $lines.Add("COMMIT;") | Out-Null
  Invoke-SqliteNonQuery -SqliteExe $SqliteExe -DatabasePath $DatabasePath -Sql ($lines -join "`n")
}

function Update-ArchivePostContextBatch {
  param(
    [Parameter(Mandatory = $true)][string]$SqliteExe,
    [Parameter(Mandatory = $true)][string]$DatabasePath,
    [Parameter(Mandatory = $true)]$Uris
  )
  if (@($Uris).Count -eq 0) { return }
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add("BEGIN IMMEDIATE;") | Out-Null
  foreach ($uri in @($Uris)) {
    $lines.Add(@"
UPDATE posts
SET has_context = 1
WHERE uri = $(ConvertTo-SqliteTextLiteral ([string]$uri));
"@) | Out-Null
  }
  $lines.Add("COMMIT;") | Out-Null
  Invoke-SqliteNonQuery -SqliteExe $SqliteExe -DatabasePath $DatabasePath -Sql ($lines -join "`n")
}

function Update-ArchivePostAvatarBatch {
  param(
    [Parameter(Mandatory = $true)][string]$SqliteExe,
    [Parameter(Mandatory = $true)][string]$DatabasePath,
    [Parameter(Mandatory = $true)]$Entries
  )
  if (@($Entries).Count -eq 0) { return }
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add("BEGIN IMMEDIATE;") | Out-Null
  foreach ($entry in @($Entries)) {
    $lines.Add(@"
UPDATE posts
SET author_avatar_url = $(ConvertTo-SqliteTextLiteral ([string](Get-ObjectPropertyValue -Object $entry -Name "authorAvatar" -Default ""))),
    author_avatar_path = $(ConvertTo-SqliteTextLiteral ([string](Get-ObjectPropertyValue -Object $entry -Name "authorAvatarPath" -Default ""))),
    has_avatar = 1
WHERE uri = $(ConvertTo-SqliteTextLiteral ([string](Get-ObjectPropertyValue -Object $entry -Name "uri" -Default "")));
"@) | Out-Null
  }
  $lines.Add("COMMIT;") | Out-Null
  Invoke-SqliteNonQuery -SqliteExe $SqliteExe -DatabasePath $DatabasePath -Sql ($lines -join "`n")
}

function Update-ArchivePostMediaBatch {
  param(
    [Parameter(Mandatory = $true)][string]$SqliteExe,
    [Parameter(Mandatory = $true)][string]$DatabasePath,
    [Parameter(Mandatory = $true)]$Entries
  )
  if (@($Entries).Count -eq 0) { return }
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add("BEGIN IMMEDIATE;") | Out-Null
  foreach ($entry in @($Entries)) {
    $lines.Add(@"
UPDATE posts
SET images_json = $(ConvertTo-SqliteTextLiteral (ConvertTo-CompactJson (Get-ObjectPropertyValue -Object $entry -Name "images" -Default @()))),
    external_card_json = $(ConvertTo-SqliteTextLiteral (ConvertTo-CompactJson (Get-ObjectPropertyValue -Object $entry -Name "externalCard" -Default $null))),
    media_skipped_count = $(ConvertTo-SqliteIntegerLiteral ([int](Get-ObjectPropertyValue -Object $entry -Name "mediaSkippedCount" -Default 0))),
    has_media = 1
WHERE uri = $(ConvertTo-SqliteTextLiteral ([string](Get-ObjectPropertyValue -Object $entry -Name "uri" -Default "")));
"@) | Out-Null
  }
  $lines.Add("COMMIT;") | Out-Null
  Invoke-SqliteNonQuery -SqliteExe $SqliteExe -DatabasePath $DatabasePath -Sql ($lines -join "`n")
}

function Get-ArchivePostsFromDatabase {
  param(
    [Parameter(Mandatory = $true)][string]$SqliteExe,
    [Parameter(Mandatory = $true)][string]$DatabasePath
  )
  $rows = @(Invoke-SqliteJsonObjectRows -SqliteExe $SqliteExe -DatabasePath $DatabasePath -Sql @"
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
ORDER BY created_at_unix DESC, uri DESC;
"@)
  $posts = New-Object System.Collections.Generic.List[object]
  foreach ($row in $rows) {
    $posts.Add([ordered]@{
      uri = [string]$row.uri
      cid = [string]$row.cid
      rkey = [string]$row.rkey
      createdAt = [string]$row.created_at
      text = [string]$row.text
      langs = @(ConvertFrom-EmbeddedJsonValue -Value (Get-ObjectPropertyValue -Object $row -Name "langs_json" -Default @()) -Default @())
      facets = @(ConvertFrom-EmbeddedJsonValue -Value (Get-ObjectPropertyValue -Object $row -Name "facets_json" -Default @()) -Default @())
      reply = ConvertFrom-EmbeddedJsonValue -Value (Get-ObjectPropertyValue -Object $row -Name "reply_json" -Default $null) -Default $null
      thread = [ordered]@{
        rootUri = [string]$row.thread_root_uri
        parentUri = [string]$row.thread_parent_uri
      }
      counts = ConvertFrom-EmbeddedJsonValue -Value (Get-ObjectPropertyValue -Object $row -Name "counts_json" -Default $null) -Default ([ordered]@{ likeCount = 0; replyCount = 0; repostCount = 0; quoteCount = 0 })
      permalink = [string]$row.permalink
      authorHandle = [string]$row.author_handle
      authorDisplayName = [string]$row.author_display_name
      authorDid = [string]$row.author_did
      authorAvatar = [string]$row.author_avatar_url
      authorAvatarPath = [string]$row.author_avatar_path
      sourceImages = @(ConvertFrom-EmbeddedJsonValue -Value (Get-ObjectPropertyValue -Object $row -Name "source_images_json" -Default @()) -Default @())
      externalCard = ConvertFrom-EmbeddedJsonValue -Value (Get-ObjectPropertyValue -Object $row -Name "external_card_json" -Default $null) -Default $null
      images = @(ConvertFrom-EmbeddedJsonValue -Value (Get-ObjectPropertyValue -Object $row -Name "images_json" -Default @()) -Default @())
      mediaSkippedCount = [int](Get-ObjectPropertyValue -Object $row -Name "media_skipped_count" -Default 0)
    }) | Out-Null
  }
  return $posts.ToArray()
}

function Get-ArchivePostBatchFromDatabase {
  param(
    [Parameter(Mandatory = $true)][string]$SqliteExe,
    [Parameter(Mandatory = $true)][string]$DatabasePath,
    [Parameter(Mandatory = $true)][int]$Offset,
    [Parameter(Mandatory = $true)][int]$Limit
  )
  $safeOffset = [Math]::Max(0, $Offset)
  $safeLimit = [Math]::Max(1, $Limit)
  $rows = @(Invoke-SqliteJsonObjectRows -SqliteExe $SqliteExe -DatabasePath $DatabasePath -Sql @"
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
LIMIT $safeLimit OFFSET $safeOffset;
"@)
  $posts = New-Object System.Collections.Generic.List[object]
  foreach ($row in $rows) {
    $posts.Add([ordered]@{
      uri = [string]$row.uri
      cid = [string]$row.cid
      rkey = [string]$row.rkey
      createdAt = [string]$row.created_at
      text = [string]$row.text
      langs = @(ConvertFrom-EmbeddedJsonValue -Value (Get-ObjectPropertyValue -Object $row -Name "langs_json" -Default @()) -Default @())
      facets = @(ConvertFrom-EmbeddedJsonValue -Value (Get-ObjectPropertyValue -Object $row -Name "facets_json" -Default @()) -Default @())
      reply = ConvertFrom-EmbeddedJsonValue -Value (Get-ObjectPropertyValue -Object $row -Name "reply_json" -Default $null) -Default $null
      thread = [ordered]@{
        rootUri = [string]$row.thread_root_uri
        parentUri = [string]$row.thread_parent_uri
      }
      counts = ConvertFrom-EmbeddedJsonValue -Value (Get-ObjectPropertyValue -Object $row -Name "counts_json" -Default $null) -Default ([ordered]@{ likeCount = 0; replyCount = 0; repostCount = 0; quoteCount = 0 })
      permalink = [string]$row.permalink
      authorHandle = [string]$row.author_handle
      authorDisplayName = [string]$row.author_display_name
      authorDid = [string]$row.author_did
      authorAvatar = [string]$row.author_avatar_url
      authorAvatarPath = [string]$row.author_avatar_path
      sourceImages = @(ConvertFrom-EmbeddedJsonValue -Value (Get-ObjectPropertyValue -Object $row -Name "source_images_json" -Default @()) -Default @())
      externalCard = ConvertFrom-EmbeddedJsonValue -Value (Get-ObjectPropertyValue -Object $row -Name "external_card_json" -Default $null) -Default $null
      images = @(ConvertFrom-EmbeddedJsonValue -Value (Get-ObjectPropertyValue -Object $row -Name "images_json" -Default @()) -Default @())
      mediaSkippedCount = [int](Get-ObjectPropertyValue -Object $row -Name "media_skipped_count" -Default 0)
    }) | Out-Null
  }
  return $posts.ToArray()
}

function Get-ArchivePendingPostBatchFromDatabase {
  param(
    [Parameter(Mandatory = $true)][string]$SqliteExe,
    [Parameter(Mandatory = $true)][string]$DatabasePath,
    [Parameter(Mandatory = $true)][ValidateSet("has_context","has_metrics","has_avatar","has_media")] [string]$FlagColumn,
    [Parameter(Mandatory = $true)][int]$Limit,
    [string]$WhereClause = ""
  )
  $safeLimit = [Math]::Max(1, $Limit)
  $whereSql = "WHERE $FlagColumn = 0"
  if (-not [string]::IsNullOrWhiteSpace($WhereClause)) {
    $whereSql += " AND ($WhereClause)"
  }
  $rows = @(Invoke-SqliteJsonObjectRows -SqliteExe $SqliteExe -DatabasePath $DatabasePath -Sql @"
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
$whereSql
ORDER BY created_at_unix DESC, uri DESC
LIMIT $safeLimit;
"@)
  $posts = New-Object System.Collections.Generic.List[object]
  foreach ($row in $rows) {
    $posts.Add([ordered]@{
      uri = [string]$row.uri
      cid = [string]$row.cid
      rkey = [string]$row.rkey
      createdAt = [string]$row.created_at
      text = [string]$row.text
      langs = @(ConvertFrom-EmbeddedJsonValue -Value (Get-ObjectPropertyValue -Object $row -Name "langs_json" -Default @()) -Default @())
      facets = @(ConvertFrom-EmbeddedJsonValue -Value (Get-ObjectPropertyValue -Object $row -Name "facets_json" -Default @()) -Default @())
      reply = ConvertFrom-EmbeddedJsonValue -Value (Get-ObjectPropertyValue -Object $row -Name "reply_json" -Default $null) -Default $null
      thread = [ordered]@{
        rootUri = [string]$row.thread_root_uri
        parentUri = [string]$row.thread_parent_uri
      }
      counts = ConvertFrom-EmbeddedJsonValue -Value (Get-ObjectPropertyValue -Object $row -Name "counts_json" -Default $null) -Default ([ordered]@{ likeCount = 0; replyCount = 0; repostCount = 0; quoteCount = 0 })
      permalink = [string]$row.permalink
      authorHandle = [string]$row.author_handle
      authorDisplayName = [string]$row.author_display_name
      authorDid = [string]$row.author_did
      authorAvatar = [string]$row.author_avatar_url
      authorAvatarPath = [string]$row.author_avatar_path
      sourceImages = @(ConvertFrom-EmbeddedJsonValue -Value (Get-ObjectPropertyValue -Object $row -Name "source_images_json" -Default @()) -Default @())
      externalCard = ConvertFrom-EmbeddedJsonValue -Value (Get-ObjectPropertyValue -Object $row -Name "external_card_json" -Default $null) -Default $null
      images = @(ConvertFrom-EmbeddedJsonValue -Value (Get-ObjectPropertyValue -Object $row -Name "images_json" -Default @()) -Default @())
      mediaSkippedCount = [int](Get-ObjectPropertyValue -Object $row -Name "media_skipped_count" -Default 0)
    }) | Out-Null
  }
  return $posts.ToArray()
}

function Seed-AssetCacheFromPosts {
  param(
    [Parameter(Mandatory = $true)]$Posts,
    [Parameter(Mandatory = $true)][string]$OutputDirectory,
    [Parameter(Mandatory = $true)][hashtable]$AssetIndex,
    $AssetList = $null,
    [hashtable]$AssetPathIndex = $null
  )
  foreach ($post in @($Posts)) {
    $avatarPath = [string](Get-ObjectPropertyValue -Object $post -Name "authorAvatarPath" -Default "")
    $avatarUrl = [string](Get-ObjectPropertyValue -Object $post -Name "authorAvatar" -Default "")
    if (-not [string]::IsNullOrWhiteSpace($avatarPath)) {
      $asset = Get-AssetRecordFromRelativePath -OutputDirectory $OutputDirectory -RelativePath $avatarPath
      if ($asset) {
        if (-not [string]::IsNullOrWhiteSpace($avatarUrl)) {
          Set-CachedAsset -AssetIndex $AssetIndex -CacheKey $avatarUrl -Asset $asset
        }
        if ($null -ne $AssetList -and $null -ne $AssetPathIndex) {
          Add-AssetToListIfMissing -AssetList $AssetList -AssetPathIndex $AssetPathIndex -Asset $asset
        }
      }
    }
    foreach ($image in @(Get-ObjectPropertyValue -Object $post -Name "images" -Default @())) {
      $pathValue = [string](Get-ObjectPropertyValue -Object $image -Name "path" -Default "")
      if ([string]::IsNullOrWhiteSpace($pathValue)) { continue }
      $asset = Get-AssetRecordFromRelativePath -OutputDirectory $OutputDirectory -RelativePath $pathValue -ContentType ([string](Get-ObjectPropertyValue -Object $image -Name "mimeType" -Default "application/octet-stream"))
      if ($asset) {
        $cacheKey = Get-BlobAssetCacheKey -Did ([string](Get-ObjectPropertyValue -Object $image -Name "sourceDid" -Default "")) -Cid ([string](Get-ObjectPropertyValue -Object $image -Name "sourceCid" -Default ""))
        if (-not [string]::IsNullOrWhiteSpace($cacheKey)) {
          Set-CachedAsset -AssetIndex $AssetIndex -CacheKey $cacheKey -Asset $asset
        }
        if ($null -ne $AssetList -and $null -ne $AssetPathIndex) {
          Add-AssetToListIfMissing -AssetList $AssetList -AssetPathIndex $AssetPathIndex -Asset $asset
        }
      }
    }
    $externalCard = Get-ObjectPropertyValue -Object $post -Name "externalCard" -Default $null
    if ($null -ne $externalCard) {
      $thumbPath = [string](Get-ObjectPropertyValue -Object $externalCard -Name "thumbPath" -Default "")
      if ([string]::IsNullOrWhiteSpace($thumbPath)) { continue }
      $thumbAsset = Get-AssetRecordFromRelativePath -OutputDirectory $OutputDirectory -RelativePath $thumbPath
      if ($thumbAsset) {
        $thumbCid = [string](Get-ObjectPropertyValue -Object $externalCard -Name "thumbCid" -Default "")
        $thumbUrl = [string](Get-ObjectPropertyValue -Object $externalCard -Name "thumb" -Default "")
        if (-not [string]::IsNullOrWhiteSpace($thumbCid)) {
          Set-CachedAsset -AssetIndex $AssetIndex -CacheKey (Get-BlobAssetCacheKey -Did ([string](Get-ObjectPropertyValue -Object $post -Name "authorDid" -Default "")) -Cid $thumbCid) -Asset $thumbAsset
        }
        if (-not [string]::IsNullOrWhiteSpace($thumbUrl)) {
          Set-CachedAsset -AssetIndex $AssetIndex -CacheKey (Get-UrlAssetCacheKey -Url $thumbUrl) -Asset $thumbAsset
        }
        if ($null -ne $AssetList -and $null -ne $AssetPathIndex) {
          Add-AssetToListIfMissing -AssetList $AssetList -AssetPathIndex $AssetPathIndex -Asset $thumbAsset
        }
      }
    }
  }
}

function New-ArchiveManifest {
  param(
    [Parameter(Mandatory = $true)]$SourceProfile,
    [Parameter(Mandatory = $true)][hashtable]$Filters,
    [Parameter(Mandatory = $true)][int]$PostCount,
    [Parameter(Mandatory = $true)][int]$ImageCount,
    [Parameter(Mandatory = $true)][int]$SkippedImageCount,
    [Parameter(Mandatory = $true)][int]$PageCount,
    [Parameter(Mandatory = $true)][string]$Phase,
    [string]$Warning = ""
  )
  $manifest = [ordered]@{
    schemaVersion = 1
    exportedAt = [DateTimeOffset]::UtcNow.ToString("o")
    appVersion = "powershell-sqlite-archiver/$($Script:ToolVersion)"
    account = [ordered]@{
      handle = [string]$SourceProfile.handle
      did = [string]$SourceProfile.did
      displayName = [string]$SourceProfile.displayName
      avatar = [string]$SourceProfile.avatar
    }
    filters = $Filters
    postCount = $PostCount
    imageCount = $ImageCount
    skippedImageCount = $SkippedImageCount
    hashtagFilteredOutCount = 0
    pageCount = $PageCount
    phase = $Phase
    errorMessage = ""
  }
  if (-not [string]::IsNullOrWhiteSpace($Warning)) {
    $manifest["warning"] = $Warning
  }
  return $manifest
}

function Get-ZipExportFiles {
  param([Parameter(Mandatory = $true)][string]$SourceDirectory)
  $sourceRoot = [System.IO.Path]::GetFullPath($SourceDirectory)
  return @(
    Get-ChildItem -LiteralPath $sourceRoot -Recurse -File | Where-Object {
      $fullName = [System.IO.Path]::GetFullPath($_.FullName)
      $relativePath = $fullName.Substring($sourceRoot.Length).TrimStart('\', '/').Replace('\', '/')
      if ([string]::IsNullOrWhiteSpace($relativePath)) {
        return $false
      }
      return -not ($relativePath -like '_meta/*')
    } | Sort-Object FullName
  )
}

function Write-ArchiveZip {
  param(
    [Parameter(Mandatory = $true)][string]$SourceDirectory,
    [Parameter(Mandatory = $true)][string]$ZipPath
  )
  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $fileArray = @(Get-ZipExportFiles -SourceDirectory $SourceDirectory)
  $totalFiles = $fileArray.Count
  $progressEvery = Get-ProgressInterval -Total $totalFiles -TargetUpdates 20
  if (Test-Path -LiteralPath $ZipPath) {
    Remove-Item -LiteralPath $ZipPath -Force
  }
  $sourceRoot = [System.IO.Path]::GetFullPath($SourceDirectory)
  $zipArchive = [System.IO.Compression.ZipFile]::Open($ZipPath, [System.IO.Compression.ZipArchiveMode]::Create)
  try {
    for ($fileIndex = 0; $fileIndex -lt $totalFiles; $fileIndex += 1) {
      $displayIndex = $fileIndex + 1
      Write-ProgressStep -Label "ZIP files" -Current $displayIndex -Total $totalFiles -Every $progressEvery
      $file = $fileArray[$fileIndex]
      $fullName = [System.IO.Path]::GetFullPath($file.FullName)
      $relativePath = $fullName.Substring($sourceRoot.Length).TrimStart('\', '/').Replace('\', '/')
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zipArchive, $fullName, $relativePath, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
  } finally {
    $zipArchive.Dispose()
  }
  return $totalFiles
}

function Export-ArchiveFromDatabase {
  param(
    [Parameter(Mandatory = $true)][string]$SqliteExe,
    [Parameter(Mandatory = $true)][string]$DatabasePath,
    [Parameter(Mandatory = $true)]$Paths,
    [Parameter(Mandatory = $true)]$SourceProfile,
    [Parameter(Mandatory = $true)][hashtable]$Filters,
    [Parameter(Mandatory = $true)][int]$PageCount,
    [Parameter(Mandatory = $true)][bool]$CreatePostsJson,
    [string]$Warning = ""
  )
  $postCount = Get-DatabasePostCount -SqliteExe $SqliteExe -DatabasePath $DatabasePath
  if ($CreatePostsJson) {
    Write-Info "Streaming $postCount posts from SQLite for final export."
  } else {
    Write-Info "Scanning $postCount posts from SQLite for manifest export. posts.json is disabled."
  }
  $imageCount = 0
  $skippedImageCount = 0
  $exportBatchSize = 500
  $progressEvery = Get-ProgressInterval -Total $postCount -TargetUpdates 25
  $writer = $null
  $writtenCount = 0
  try {
    if ($CreatePostsJson) {
      $utf8 = [System.Text.UTF8Encoding]::new($false)
      $writer = New-Object System.IO.StreamWriter($Paths.PostsPath, $false, $utf8)
      $writer.WriteLine("[")
    } elseif (Test-Path -LiteralPath $Paths.PostsPath) {
      Remove-Item -LiteralPath $Paths.PostsPath -Force
    }
    for ($readOffset = 0; $readOffset -lt $postCount; $readOffset += $exportBatchSize) {
      $batch = @(Get-ArchivePostBatchFromDatabase -SqliteExe $SqliteExe -DatabasePath $DatabasePath -Offset $readOffset -Limit $exportBatchSize)
      if ($batch.Count -eq 0) { break }
      foreach ($post in $batch) {
        $writtenCount += 1
        $imageCount += @((Get-ObjectPropertyValue -Object $post -Name "images" -Default @())).Count
        $skippedImageCount += [int](Get-ObjectPropertyValue -Object $post -Name "mediaSkippedCount" -Default 0)
        if ($CreatePostsJson) {
          $json = $post | ConvertTo-Json -Depth 100 -Compress
          if ($writtenCount -gt 1) {
            $writer.WriteLine(",")
          }
          $writer.Write($json)
        }
        Write-ProgressStep -Label "Export posts" -Current $writtenCount -Total $postCount -Every $progressEvery
      }
      if ($CreatePostsJson) {
        $writer.Flush()
      }
      Write-Info "Export stats so far: posts=$writtenCount/$postCount | images=$imageCount | skippedImages=$skippedImageCount"
    }
    if ($CreatePostsJson) {
      $writer.WriteLine()
      $writer.WriteLine("]")
    }
  } finally {
    if ($null -ne $writer) {
      $writer.Dispose()
    }
  }
  Write-Info "Preparing manifest for $writtenCount exported posts."
  $manifest = New-ArchiveManifest -SourceProfile $SourceProfile -Filters $Filters -PostCount $writtenCount -ImageCount $imageCount -SkippedImageCount $skippedImageCount -PageCount $PageCount -Phase "completed" -Warning $Warning

  Write-Info "Writing manifest.json"
  Write-JsonFileUtf8 -Path $Paths.ManifestPath -Value $manifest
  if ($CreatePostsJson) {
    Write-Info "posts.json finished."
  } else {
    Write-Info "posts.json was skipped."
  }
}

$config = $null
$resolvedConfigPath = ""
if (-not [string]::IsNullOrWhiteSpace($ConfigPath)) {
  $resolvedConfigPath = [System.IO.Path]::GetFullPath($ConfigPath)
  $config = Read-JsonFileUtf8 -Path $resolvedConfigPath
}

$resolvedIdentifier = if ($Identifier) { $Identifier } else { [string](Get-ConfigValue -Config $config -Name "identifier" -Default "") }
$resolvedAppPassword = if ($AppPassword) { $AppPassword } else { [string](Get-ConfigValue -Config $config -Name "appPassword" -Default "") }
$resolvedService = Normalize-ServiceUrl -Value ($(if ($Service) { $Service } else { [string](Get-ConfigValue -Config $config -Name "service" -Default $Script:DefaultService) }))
$resolvedSourceActor = if ($SourceActor) { $SourceActor.Trim() } else { [string](Get-ConfigValue -Config $config -Name "sourceActor" -Default "") }
$resolvedOutputDirectory = if ($OutputDirectory) { $OutputDirectory } else { [string](Get-ConfigValue -Config $config -Name "outputDirectory" -Default "") }
$resolvedOutputDirectory = Resolve-ConfigPathValue -Value $resolvedOutputDirectory -ConfigFilePath $resolvedConfigPath
$resolvedScope = if ($Scope) { $Scope } else { [string](Get-ConfigValue -Config $config -Name "scope" -Default "all") }
$resolvedYear = if ($Year) { $Year } else { [string](Get-ConfigValue -Config $config -Name "year" -Default "") }
$resolvedFrom = Normalize-ArchiveDateString -Value ($(if ($From) { $From } else { [string](Get-ConfigValue -Config $config -Name "from" -Default "") })) -FieldName "from"
$resolvedTo = Normalize-ArchiveDateString -Value ($(if ($To) { $To } else { [string](Get-ConfigValue -Config $config -Name "to" -Default "") })) -FieldName "to"
$resolvedContentMode = if ($ContentMode) { $ContentMode } else { [string](Get-ConfigValue -Config $config -Name "contentMode" -Default "full") }
$resolvedIncludeConversationContext = if ($PSBoundParameters.ContainsKey("IncludeConversationContext")) { $IncludeConversationContext.IsPresent } else { [bool](Get-ConfigValue -Config $config -Name "includeConversationContext" -Default $false) }
$resolvedMaxPosts = if ($MaxPosts -gt 0) { $MaxPosts } else { [int](Get-ConfigValue -Config $config -Name "maxPosts" -Default $Script:DefaultMaxPosts) }
$resolvedWaitProfile = if ($WaitProfile) { $WaitProfile } else { [string](Get-ConfigValue -Config $config -Name "waitProfile" -Default "normal") }
$resolvedCreatePostsJson = if ($PSBoundParameters.ContainsKey("CreatePostsJson")) { $CreatePostsJson.IsPresent } else { [bool](Get-ConfigValue -Config $config -Name "createPostsJson" -Default $false) }
$resolvedCreateZip = if ($PSBoundParameters.ContainsKey("CreateZip")) { $CreateZip.IsPresent } else { [bool](Get-ConfigValue -Config $config -Name "createZip" -Default $false) }

if ([string]::IsNullOrWhiteSpace($resolvedIdentifier)) { throw "Identifier is required." }
if ([string]::IsNullOrWhiteSpace($resolvedAppPassword)) { throw "AppPassword is required." }
if ([string]::IsNullOrWhiteSpace($resolvedOutputDirectory)) { throw "OutputDirectory is required." }
if (Test-LooksLikePlaceholderCredential -Identifier $resolvedIdentifier -AppPassword $resolvedAppPassword) {
  throw "The SQLite sample config still contains placeholder credentials. Replace 'your-handle.bsky.social' and 'xxxx-xxxx-xxxx-xxxx' with your real Bluesky handle and app password."
}

$resolvedOutputDirectory = [System.IO.Path]::GetFullPath($resolvedOutputDirectory)
Ensure-Directory -Path $resolvedOutputDirectory
$paths = Get-ArchivePaths -OutputDirectory $resolvedOutputDirectory
Ensure-Directory -Path $paths.MetaDir
Ensure-Directory -Path $paths.AvatarsDir
Ensure-Directory -Path $paths.ImagesDir
Ensure-Directory -Path $paths.LinkCardsDir

$resolvedSqliteExePath = Resolve-SqliteExePath -PathValue $SqliteExePath
Write-Info "Using sqlite3 at $resolvedSqliteExePath"

$effectiveResume = $Resume -or $Update -or (-not [string]::IsNullOrWhiteSpace($RestartFrom))
$databaseExists = Test-Path -LiteralPath $paths.DatabasePath -PathType Leaf
if ($effectiveResume) {
  if (-not $databaseExists) {
    throw "No existing SQLite archive database found in '$resolvedOutputDirectory'. Start without -Resume first."
  }
} elseif ($databaseExists) {
  throw "Existing SQLite archive database found in '$resolvedOutputDirectory'. Use -Resume or choose a different outputDirectory."
}

Initialize-SqliteSchema -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath

$waitSettings = Get-WaitProfileSettings -Profile $resolvedWaitProfile
$sessionState = [ordered]@{
  Service = $resolvedService
  Identifier = $resolvedIdentifier
  AppPassword = $resolvedAppPassword
  WaitSettings = $waitSettings
  Session = New-AtprotoSession -Identifier $resolvedIdentifier -AppPassword $resolvedAppPassword -Service $resolvedService -RetryFallbacksMs $waitSettings.RetryFallbacksMs
}

$sourceDid = ""
if ([string]::IsNullOrWhiteSpace($resolvedSourceActor)) {
  $sourceDid = [string]$sessionState.Session.did
} elseif ($resolvedSourceActor -like "did:*") {
  $sourceDid = $resolvedSourceActor
} else {
  $sourceDid = Resolve-HandleToDid -SessionState $sessionState -Handle $resolvedSourceActor
}

$sourceProfile = Get-ActorProfile -SessionState $sessionState -Actor $sourceDid
$sourceHandle = [string]$sourceProfile.handle
if ([string]::IsNullOrWhiteSpace($sourceHandle)) {
  $sourceHandle = [string]$sourceDid
}

$filters = [ordered]@{
  sourceActor = if ([string]::IsNullOrWhiteSpace($resolvedSourceActor)) { $sourceHandle } else { $resolvedSourceActor.TrimStart("@") }
  sourceDid = $sourceDid
  scope = $resolvedScope
  contentMode = $resolvedContentMode
  includeConversationContext = $resolvedIncludeConversationContext
  year = $resolvedYear
  from = $resolvedFrom
  to = $resolvedTo
  hashtagScope = "thread"
  hashtagTags = @()
}

$warning = ""
if ($resolvedContentMode -in @("threads", "thread_roots")) {
  $warning = "This PowerShell version currently maps contentMode '$resolvedContentMode' to the base post selection logic."
}

if (-not $effectiveResume) {
  Initialize-ArchiveState -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Filters $filters -SourceDid $sourceDid -SourceHandle $sourceHandle -Service $resolvedService
  Save-ArchiveCheckpoint -Path $paths.CheckpointPath -State ([ordered]@{
    phase = "fetch"
    status = "running"
    fetchCursor = ""
    pageCount = 0
    exportedPosts = 0
    contextOffset = 0
    metricsOffset = 0
    avatarOffset = 0
    mediaOffset = 0
    phaseStatus = [ordered]@{
      fetch = "running"
      context = if ($resolvedIncludeConversationContext) { "pending" } else { "disabled" }
      metrics = "pending"
      avatars = "pending"
      media = "pending"
      export = "pending"
      zip = if ($resolvedCreateZip) { "pending" } else { "disabled" }
    }
    updatedAt = [DateTimeOffset]::UtcNow.ToString("o")
  })
}

$state = Get-ArchiveStateSnapshot -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath
$checkpoint = Load-ArchiveCheckpoint -Path $paths.CheckpointPath
$cursor = [string](Get-ObjectPropertyValue -Object $checkpoint -Name "fetchCursor" -Default (Get-ObjectPropertyValue -Object $state -Name "fetchCursor" -Default ""))
$pageCount = [int](Get-ObjectPropertyValue -Object $checkpoint -Name "pageCount" -Default (Get-ObjectPropertyValue -Object $state -Name "pageCount" -Default "0"))
$fetchPhase = [string](Get-ObjectPropertyValue -Object $checkpoint -Name "phase" -Default (Get-ObjectPropertyValue -Object $state -Name "phase" -Default "fetch"))
$useOwnRepo = $sourceDid -eq [string]$sessionState.Session.did
$pageSize = [Math]::Min($Script:DefaultPageSize, [Math]::Max(25, $resolvedMaxPosts))
$progressEvery = Get-ProgressInterval -Total $resolvedMaxPosts -TargetUpdates 20
$stopScan = $false
$fetchComplete = $fetchPhase -ne "fetch"
$persistedPostCount = [int](Get-ObjectPropertyValue -Object $checkpoint -Name "exportedPosts" -Default (Get-RunStateValue -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Key "exportedPosts" -Default "0"))
$phaseStatus = Get-ObjectPropertyValue -Object $checkpoint -Name "phaseStatus" -Default $null
if ($null -eq $phaseStatus) {
  $phaseStatus = [ordered]@{
    fetch = if ($fetchComplete) { "complete" } else { "running" }
    context = if ($resolvedIncludeConversationContext) { "pending" } else { "disabled" }
    metrics = "pending"
    avatars = "pending"
    media = "pending"
    export = "pending"
    zip = if ($resolvedCreateZip) { "pending" } else { "disabled" }
  }
}
if (-not (Get-ObjectPropertyValue -Object $phaseStatus -Name "context" -Default $null)) {
  Set-ObjectPropertyValue -Object $phaseStatus -Name "context" -Value $(if ($resolvedIncludeConversationContext) { "pending" } else { "disabled" })
}
if (-not $resolvedIncludeConversationContext) {
  Set-ObjectPropertyValue -Object $phaseStatus -Name "context" -Value "disabled"
} elseif ([string](Get-ObjectPropertyValue -Object $phaseStatus -Name "context" -Default "") -eq "disabled") {
  Set-ObjectPropertyValue -Object $phaseStatus -Name "context" -Value "pending"
}

$primaryFlagsRepaired = Repair-PrimarySelectionFlags -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -SourceDid $sourceDid
if ($primaryFlagsRepaired -gt 0) {
  Write-Info "Repaired primary selection flags for $primaryFlagsRepaired existing source posts."
  if ($resolvedIncludeConversationContext) {
    Set-ObjectPropertyValue -Object $phaseStatus -Name "context" -Value "pending"
    $checkpoint.contextOffset = 0
  }
}

$restartFromPhase = $RestartFrom.Trim().ToLowerInvariant()
if (-not [string]::IsNullOrWhiteSpace($restartFromPhase)) {
  if ($null -eq $checkpoint) {
    throw "No checkpoint found in '$resolvedOutputDirectory'. Start a normal run before using -RestartFrom."
  }
  $checkpoint = Reset-ArchivePhaseFromCheckpoint -Checkpoint $checkpoint -Phase $restartFromPhase -CreateZip $resolvedCreateZip
  Save-ArchiveCheckpoint -Path $paths.CheckpointPath -State $checkpoint
  Set-RunStateValue -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Key "phase" -Value ([string]$checkpoint.phase)
  Set-RunStateValue -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Key "status" -Value ([string]$checkpoint.status)
  Set-RunStateValue -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Key "fetchCursor" -Value ([string](Get-ObjectPropertyValue -Object $checkpoint -Name "fetchCursor" -Default ""))
  Set-RunStateValue -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Key "pageCount" -Value ([string](Get-ObjectPropertyValue -Object $checkpoint -Name "pageCount" -Default 0))
  Set-RunStateValue -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Key "exportedPosts" -Value ([string](Get-ObjectPropertyValue -Object $checkpoint -Name "exportedPosts" -Default 0))
  Set-RunStateValue -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Key "updatedAt" -Value ([string]$checkpoint.updatedAt)
  Write-Info "RestartFrom applied: $restartFromPhase"
  $phaseStatus = Get-ObjectPropertyValue -Object $checkpoint -Name "phaseStatus" -Default $phaseStatus
  if (-not (Get-ObjectPropertyValue -Object $phaseStatus -Name "context" -Default $null)) {
    Set-ObjectPropertyValue -Object $phaseStatus -Name "context" -Value $(if ($resolvedIncludeConversationContext) { "pending" } else { "disabled" })
  }
  if ($resolvedIncludeConversationContext -and [string](Get-ObjectPropertyValue -Object $phaseStatus -Name "context" -Default "") -eq "disabled") {
    Set-ObjectPropertyValue -Object $phaseStatus -Name "context" -Value "pending"
  }
  $cursor = [string](Get-ObjectPropertyValue -Object $checkpoint -Name "fetchCursor" -Default "")
  $pageCount = [int](Get-ObjectPropertyValue -Object $checkpoint -Name "pageCount" -Default 0)
  $fetchPhase = [string](Get-ObjectPropertyValue -Object $checkpoint -Name "phase" -Default "fetch")
  $fetchComplete = $fetchPhase -ne "fetch"
  $persistedPostCount = [int](Get-ObjectPropertyValue -Object $checkpoint -Name "exportedPosts" -Default $persistedPostCount)
}
$fetchPhaseStatus = [string](Get-ObjectPropertyValue -Object $phaseStatus -Name "fetch" -Default "")
if ($fetchPhaseStatus -eq "complete") {
  $fetchComplete = $true
}
$databasePostCount = Get-DatabasePostCount -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath
if ($databasePostCount -gt $persistedPostCount) {
  $persistedPostCount = $databasePostCount
  Set-RunStateValue -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Key "exportedPosts" -Value ([string]$persistedPostCount)
}
if ($Update) {
  $fetchComplete = $false
  $fetchPhase = "fetch"
  $cursor = ""
  $pageCount = 0
  if ($databasePostCount -gt 0) {
    Set-ObjectPropertyValue -Object $phaseStatus -Name "fetch" -Value "running"
  } else {
    Set-ObjectPropertyValue -Object $phaseStatus -Name "fetch" -Value "running"
    Write-Info "Update mode was requested, but the archive does not contain any posts yet. A full initial fetch will be started."
  }
  Write-Info "Update mode: fetching only posts that are newer than the first already-known archived post."
}
if ($effectiveResume) {
  $cursorInfo = if ([string]::IsNullOrWhiteSpace($cursor)) { "<empty>" } else { $cursor.Substring(0, [Math]::Min(32, $cursor.Length)) }
  Write-Info "Resume state: phase=$fetchPhase | pageCount=$pageCount | postsInDb=$databasePostCount | cursor=$cursorInfo"
  if ((-not $Update) -and ($databasePostCount -gt 0) -and (-not $fetchComplete) -and [string]::IsNullOrWhiteSpace($cursor)) {
    Write-Info "Resume cursor is missing. The script will replay pages from the beginning and rely on SQLite deduplication until it reaches new posts."
  }
}
$fetchPostLimit = if ($Update) { $databasePostCount + $resolvedMaxPosts } else { $resolvedMaxPosts }

if (-not $fetchComplete) {
  Set-RunStateValue -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Key "status" -Value "running"
  Set-RunStateValue -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Key "phase" -Value "fetch"
  Set-RunStateValue -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Key "updatedAt" -Value ([DateTimeOffset]::UtcNow.ToString("o"))
  Save-ArchiveCheckpoint -Path $paths.CheckpointPath -State ([ordered]@{
    phase = "fetch"
    status = "running"
    fetchCursor = $cursor
    pageCount = $pageCount
    exportedPosts = $persistedPostCount
    contextOffset = [int](Get-ObjectPropertyValue -Object $checkpoint -Name "contextOffset" -Default 0)
    metricsOffset = [int](Get-ObjectPropertyValue -Object $checkpoint -Name "metricsOffset" -Default 0)
    avatarOffset = [int](Get-ObjectPropertyValue -Object $checkpoint -Name "avatarOffset" -Default 0)
    mediaOffset = [int](Get-ObjectPropertyValue -Object $checkpoint -Name "mediaOffset" -Default 0)
    phaseStatus = $phaseStatus
    updatedAt = [DateTimeOffset]::UtcNow.ToString("o")
  })
}

while ((-not $fetchComplete) -and (-not $stopScan) -and $persistedPostCount -lt $fetchPostLimit) {
  $pageSelectedCount = 0
  $pageReplyCount = 0
  $pageThreadStartCount = 0
  $batchPosts = New-Object System.Collections.Generic.List[object]
  if ($useOwnRepo) {
    $query = @{
      repo = $sourceDid
      collection = "app.bsky.feed.post"
      limit = $pageSize
      reverse = $true
    }
    if (-not [string]::IsNullOrWhiteSpace($cursor)) { $query["cursor"] = $cursor }
    $page = Invoke-Atproto -SessionState $sessionState -Endpoint "com.atproto.repo.listRecords" -Query $query
    $cursor = [string](Get-ObjectPropertyValue -Object $page -Name "cursor" -Default "")
    foreach ($recordItem in @(Get-ObjectPropertyValue -Object $page -Name "records" -Default @())) {
      $record = Get-ObjectPropertyValue -Object $recordItem -Name "value"
      $uri = [string](Get-ObjectPropertyValue -Object $recordItem -Name "uri" -Default "")
      $cid = [string](Get-ObjectPropertyValue -Object $recordItem -Name "cid" -Default "")
      $createdAt = [string](Get-ObjectPropertyValue -Object $record -Name "createdAt" -Default "")
      if (Test-ShouldStopScan -CreatedAt $createdAt -Filters $filters) {
        $stopScan = $true
        break
      }
      if (-not (Test-RecordInSelection -Record $record -Filters $filters -SourceDid $sourceDid -FallbackUri $uri)) {
        continue
      }
      if ($Update -and (Has-PostUriInDatabase -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Uri $uri)) {
        Write-Info "Update boundary reached at known post $uri"
        $stopScan = $true
        break
      }
      $post = New-ArchivePostEntity -Uri $uri -Cid $cid -Record $record -AuthorHandle $sourceHandle -AuthorDid $sourceDid -AuthorDisplayName ([string]$sourceProfile.displayName) -AuthorAvatar ([string]$sourceProfile.avatar) -Counts $null
      $batchPosts.Add($post) | Out-Null
      $pageSelectedCount += 1
      if ([string]::IsNullOrWhiteSpace((Get-ArchiveParentUri -Record $record))) { $pageThreadStartCount += 1 } else { $pageReplyCount += 1 }
      if (($persistedPostCount + $batchPosts.Count) -ge $fetchPostLimit) { break }
    }
  } else {
    $query = @{ actor = $sourceDid; limit = $pageSize }
    if (-not [string]::IsNullOrWhiteSpace($cursor)) { $query["cursor"] = $cursor }
    $page = Invoke-Atproto -SessionState $sessionState -Endpoint "app.bsky.feed.getAuthorFeed" -Query $query
    $cursor = [string](Get-ObjectPropertyValue -Object $page -Name "cursor" -Default "")
    foreach ($item in @(Get-ObjectPropertyValue -Object $page -Name "feed" -Default @())) {
      $postView = Get-ObjectPropertyValue -Object $item -Name "post"
      $postAuthor = Get-ObjectPropertyValue -Object $postView -Name "author"
      if ([string](Get-ObjectPropertyValue -Object $postAuthor -Name "did" -Default "") -ne $sourceDid) {
        continue
      }
      $record = Get-ObjectPropertyValue -Object $postView -Name "record"
      $createdAt = [string](Get-ObjectPropertyValue -Object $record -Name "createdAt" -Default "")
      if (Test-ShouldStopScan -CreatedAt $createdAt -Filters $filters) {
        $stopScan = $true
        break
      }
      if (-not (Test-RecordInSelection -Record $record -Filters $filters -SourceDid $sourceDid -FallbackUri ([string]$postView.uri))) {
        continue
      }
      $postViewUri = [string](Get-ObjectPropertyValue -Object $postView -Name "uri" -Default "")
      if ($Update -and (Has-PostUriInDatabase -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Uri $postViewUri)) {
        Write-Info "Update boundary reached at known post $postViewUri"
        $stopScan = $true
        break
      }
      $counts = @{
        likeCount = [int](Get-ObjectPropertyValue -Object $postView -Name "likeCount" -Default 0)
        replyCount = [int](Get-ObjectPropertyValue -Object $postView -Name "replyCount" -Default 0)
        repostCount = [int](Get-ObjectPropertyValue -Object $postView -Name "repostCount" -Default 0)
        quoteCount = [int](Get-ObjectPropertyValue -Object $postView -Name "quoteCount" -Default 0)
      }
      $post = New-ArchivePostEntity -Uri ([string](Get-ObjectPropertyValue -Object $postView -Name "uri" -Default "")) -Cid ([string](Get-ObjectPropertyValue -Object $postView -Name "cid" -Default "")) -Record $record -AuthorHandle ([string](Get-ObjectPropertyValue -Object $postAuthor -Name "handle" -Default "")) -AuthorDid ([string](Get-ObjectPropertyValue -Object $postAuthor -Name "did" -Default "")) -AuthorDisplayName ([string](Get-ObjectPropertyValue -Object $postAuthor -Name "displayName" -Default "")) -AuthorAvatar ([string](Get-ObjectPropertyValue -Object $postAuthor -Name "avatar" -Default "")) -Counts $counts
      $batchPosts.Add($post) | Out-Null
      $pageSelectedCount += 1
      if ([string]::IsNullOrWhiteSpace((Get-ArchiveParentUri -Record $record))) { $pageThreadStartCount += 1 } else { $pageReplyCount += 1 }
      if (($persistedPostCount + $batchPosts.Count) -ge $fetchPostLimit) { break }
    }
  }

  if ($batchPosts.Count -gt 0) {
    $persistedPostCount = Upsert-ArchivePostsBatch -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Posts ($batchPosts.ToArray())
    if ($persistedPostCount -le 0) {
      throw "SQLite post store reported 0 persisted posts after writing a non-empty batch. The database write path is not behaving as expected."
    }
    Write-ProgressStep -Label "Fetched posts" -Current $persistedPostCount -Total $resolvedMaxPosts -Every $progressEvery
  }

  $pageCount += 1
  Set-RunStateValue -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Key "fetchCursor" -Value $cursor
  Set-RunStateValue -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Key "pageCount" -Value ([string]$pageCount)
  Set-RunStateValue -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Key "exportedPosts" -Value ([string]$persistedPostCount)
  Set-RunStateValue -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Key "updatedAt" -Value ([DateTimeOffset]::UtcNow.ToString("o"))
  Set-RunStateValue -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Key "status" -Value "running"
  Set-RunStateValue -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Key "phase" -Value "fetch"
  Save-ArchiveCheckpoint -Path $paths.CheckpointPath -State ([ordered]@{
    phase = "fetch"
    status = "running"
    fetchCursor = $cursor
    pageCount = $pageCount
    exportedPosts = $persistedPostCount
    contextOffset = [int](Get-ObjectPropertyValue -Object $checkpoint -Name "contextOffset" -Default 0)
    metricsOffset = [int](Get-ObjectPropertyValue -Object $checkpoint -Name "metricsOffset" -Default 0)
    avatarOffset = [int](Get-ObjectPropertyValue -Object $checkpoint -Name "avatarOffset" -Default 0)
    mediaOffset = [int](Get-ObjectPropertyValue -Object $checkpoint -Name "mediaOffset" -Default 0)
    phaseStatus = $phaseStatus
    updatedAt = [DateTimeOffset]::UtcNow.ToString("o")
  })
  Write-Info "Fetched page $pageCount, selected $persistedPostCount posts so far. Page ${pageCount}: $pageSelectedCount selected | $pageThreadStartCount thread starts | $pageReplyCount replies."

  if ([string]::IsNullOrWhiteSpace($cursor)) {
    $fetchComplete = $true
    break
  }
  Invoke-SoftPauseIfNeeded -PageCount $pageCount -WaitSettings $waitSettings
}

$newPostsAdded = [Math]::Max(0, (Get-DatabasePostCount -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath) - $databasePostCount)
if ($Update) {
  Write-Info "Update fetch finished. New posts added: $newPostsAdded"
  if ($newPostsAdded -gt 0) {
    if ($resolvedIncludeConversationContext) {
      Set-ObjectPropertyValue -Object $phaseStatus -Name "context" -Value "pending"
      $checkpoint.contextOffset = 0
    }
    Set-ObjectPropertyValue -Object $phaseStatus -Name "metrics" -Value "pending"
    Set-ObjectPropertyValue -Object $phaseStatus -Name "avatars" -Value "pending"
    Set-ObjectPropertyValue -Object $phaseStatus -Name "media" -Value "pending"
    Set-ObjectPropertyValue -Object $phaseStatus -Name "export" -Value "pending"
    if ($resolvedCreateZip) {
      Set-ObjectPropertyValue -Object $phaseStatus -Name "zip" -Value "pending"
    }
    $checkpoint.metricsOffset = 0
    $checkpoint.avatarOffset = 0
    $checkpoint.mediaOffset = 0
  }
}

Set-RunStateValue -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Key "phase" -Value "fetch-complete"
Set-RunStateValue -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Key "status" -Value "running"
Set-RunStateValue -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Key "exportedPosts" -Value ([string](Get-DatabasePostCount -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath))
Set-RunStateValue -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Key "updatedAt" -Value ([DateTimeOffset]::UtcNow.ToString("o"))
Set-ObjectPropertyValue -Object $phaseStatus -Name "fetch" -Value "complete"
$checkpoint = [ordered]@{
  phase = "fetch-complete"
  status = "running"
  fetchCursor = $cursor
  pageCount = $pageCount
  exportedPosts = (Get-DatabasePostCount -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath)
  contextOffset = [int](Get-ObjectPropertyValue -Object $checkpoint -Name "contextOffset" -Default 0)
  metricsOffset = [int](Get-ObjectPropertyValue -Object $checkpoint -Name "metricsOffset" -Default 0)
  avatarOffset = [int](Get-ObjectPropertyValue -Object $checkpoint -Name "avatarOffset" -Default 0)
  mediaOffset = [int](Get-ObjectPropertyValue -Object $checkpoint -Name "mediaOffset" -Default 0)
  phaseStatus = $phaseStatus
  updatedAt = [DateTimeOffset]::UtcNow.ToString("o")
}
Save-ArchiveCheckpoint -Path $paths.CheckpointPath -State $checkpoint

$sessionStateExport = [ordered]@{
  Service = $sessionState.Service
  WaitSettings = $sessionState.WaitSettings
  Session = $sessionState.Session
}
Write-JsonFileUtf8 -Path $paths.SessionPath -Value $sessionStateExport

$batchReadSize = 500
$assetIndex = @{}
$assetList = New-Object System.Collections.Generic.List[object]
$assetPathIndex = @{}

$contextSeedWhereClause = "is_primary_selection = 1 AND author_did = $(ConvertTo-SqliteTextLiteral $sourceDid) AND (thread_parent_uri IS NULL OR thread_parent_uri = '')"
$databasePostCountBeforeContext = Get-DatabasePostCount -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath

if ($resolvedIncludeConversationContext -and [string](Get-ObjectPropertyValue -Object $phaseStatus -Name "context" -Default "pending") -ne "complete") {
  $pendingContextCount = Get-PendingPostCount -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -FlagColumn "has_context" -WhereClause $contextSeedWhereClause
  Write-Info "Hydrating conversation context for $pendingContextCount primary posts."
  $contextProcessed = [int](Get-ObjectPropertyValue -Object $checkpoint -Name "contextOffset" -Default 0)
  while ($true) {
    $seedBatch = @(Get-ArchivePendingPostBatchFromDatabase -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -FlagColumn "has_context" -WhereClause $contextSeedWhereClause -Limit 25)
    if ($seedBatch.Count -eq 0) { break }
    $completedSeedUris = New-Object System.Collections.Generic.List[string]
    foreach ($seedPost in $seedBatch) {
      $seedUri = [string](Get-ObjectPropertyValue -Object $seedPost -Name "uri" -Default "")
      if ([string]::IsNullOrWhiteSpace($seedUri)) {
        continue
      }
      Write-ProgressStep -Label "Conversation context" -Current ([Math]::Min($pendingContextCount, $contextProcessed + $completedSeedUris.Count + 1)) -Total $pendingContextCount -Every 10
      try {
        $threadResponse = Invoke-Atproto -SessionState $sessionState -Endpoint "app.bsky.feed.getPostThread" -Query @{
          uri = $seedUri
          depth = 100
          parentHeight = 100
        }
        $threadPosts = @(Collect-ThreadViewPosts -ThreadNode (Get-ObjectPropertyValue -Object $threadResponse -Name "thread" -Default $null))
        if ($threadPosts.Count -gt 0) {
          $contextEntities = New-Object System.Collections.Generic.List[object]
          foreach ($threadPostView in $threadPosts) {
            $threadPostUri = [string](Get-ObjectPropertyValue -Object $threadPostView -Name "uri" -Default "")
            if ([string]::IsNullOrWhiteSpace($threadPostUri)) {
              continue
            }
            $isPrimary = $threadPostUri -eq $seedUri
            $entity = New-ArchivePostEntityFromPostView -PostView $threadPostView -IsPrimarySelection $isPrimary
            if ($null -ne $entity) {
              $contextEntities.Add($entity) | Out-Null
            }
          }
          if ($contextEntities.Count -gt 0) {
            Upsert-ArchivePostsBatch -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Posts ($contextEntities.ToArray()) | Out-Null
          }
        }
        $completedSeedUris.Add($seedUri) | Out-Null
      } catch {
        Write-Info "Skipping conversation context for ${seedUri}: $($_.Exception.Message)"
      }
    }
    if ($completedSeedUris.Count -gt 0) {
      Update-ArchivePostContextBatch -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Uris ($completedSeedUris.ToArray())
    }
    $contextProcessed = [Math]::Min($pendingContextCount, $contextProcessed + $seedBatch.Count)
    $checkpoint.contextOffset = $contextProcessed
    $checkpoint.phase = "context"
    $checkpoint.status = "running"
    Set-ObjectPropertyValue -Object $phaseStatus -Name "context" -Value "running"
    $checkpoint.phaseStatus = $phaseStatus
    $checkpoint.updatedAt = [DateTimeOffset]::UtcNow.ToString("o")
    Save-ArchiveCheckpoint -Path $paths.CheckpointPath -State $checkpoint
    Write-Info "Conversation context progress: processed=$contextProcessed/$pendingContextCount"
  }
  Set-ObjectPropertyValue -Object $phaseStatus -Name "context" -Value "complete"
  $checkpoint.phaseStatus = $phaseStatus
  $checkpoint.contextOffset = $pendingContextCount
  $checkpoint.updatedAt = [DateTimeOffset]::UtcNow.ToString("o")
  Save-ArchiveCheckpoint -Path $paths.CheckpointPath -State $checkpoint
}

$contextPostsAdded = [Math]::Max(0, (Get-DatabasePostCount -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath) - $databasePostCountBeforeContext)
if ($contextPostsAdded -gt 0) {
  Write-Info "Conversation context added $contextPostsAdded posts. Reopening metrics, avatar, media, and export phases."
  Set-ObjectPropertyValue -Object $phaseStatus -Name "metrics" -Value "pending"
  Set-ObjectPropertyValue -Object $phaseStatus -Name "avatars" -Value "pending"
  Set-ObjectPropertyValue -Object $phaseStatus -Name "media" -Value "pending"
  Set-ObjectPropertyValue -Object $phaseStatus -Name "export" -Value "pending"
  if ($resolvedCreateZip) {
    Set-ObjectPropertyValue -Object $phaseStatus -Name "zip" -Value "pending"
  }
  $checkpoint.metricsOffset = 0
  $checkpoint.avatarOffset = 0
  $checkpoint.mediaOffset = 0
  $checkpoint.phaseStatus = $phaseStatus
  $checkpoint.updatedAt = [DateTimeOffset]::UtcNow.ToString("o")
  Save-ArchiveCheckpoint -Path $paths.CheckpointPath -State $checkpoint
}

if ([string](Get-ObjectPropertyValue -Object $phaseStatus -Name "metrics" -Default "pending") -ne "complete") {
  $pendingMetricsCount = Get-PendingPostCount -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -FlagColumn "has_metrics"
  Write-Info "Hydrating metrics for $pendingMetricsCount pending posts."
  $metricsProcessed = [int](Get-ObjectPropertyValue -Object $checkpoint -Name "metricsOffset" -Default 0)
  $metricBatchSize = 10
  $metricBatchTotal = [int][Math]::Ceiling([Math]::Max(1, $pendingMetricsCount) / $metricBatchSize)
  $metricBatchNumber = [int][Math]::Floor($metricsProcessed / $metricBatchSize)
  while ($true) {
    $readBatch = @(Get-ArchivePendingPostBatchFromDatabase -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -FlagColumn "has_metrics" -Limit $batchReadSize)
    if ($readBatch.Count -eq 0) { break }
    for ($localOffset = 0; $localOffset -lt $readBatch.Count; $localOffset += $metricBatchSize) {
      $metricBatchNumber += 1
      Write-ProgressStep -Label "Hydrating metrics batch" -Current $metricBatchNumber -Total $metricBatchTotal -Every 10
      $localEnd = [Math]::Min($localOffset + $metricBatchSize - 1, $readBatch.Count - 1)
      $batch = @($readBatch[$localOffset..$localEnd])
      $uris = @($batch | ForEach-Object { [string](Get-ObjectPropertyValue -Object $_ -Name "uri" -Default "") } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
      if ($uris.Count -eq 0) { continue }
      $response = Invoke-Atproto -SessionState $sessionState -Endpoint "app.bsky.feed.getPosts" -Query @{ uris = $uris }
      $metricsEntries = New-Object System.Collections.Generic.List[object]
      foreach ($postView in @(Get-ObjectPropertyValue -Object $response -Name "posts" -Default @())) {
        $uri = [string](Get-ObjectPropertyValue -Object $postView -Name "uri" -Default "")
        if ([string]::IsNullOrWhiteSpace($uri)) { continue }
        $target = $batch | Where-Object { [string](Get-ObjectPropertyValue -Object $_ -Name "uri" -Default "") -eq $uri } | Select-Object -First 1
        if ($null -eq $target) { continue }
        $postAuthor = Get-ObjectPropertyValue -Object $postView -Name "author"
        $metricsEntries.Add([ordered]@{
          uri = $uri
          counts = [ordered]@{
            likeCount = [int](Get-ObjectPropertyValue -Object $postView -Name "likeCount" -Default 0)
            replyCount = [int](Get-ObjectPropertyValue -Object $postView -Name "replyCount" -Default 0)
            repostCount = [int](Get-ObjectPropertyValue -Object $postView -Name "repostCount" -Default 0)
            quoteCount = [int](Get-ObjectPropertyValue -Object $postView -Name "quoteCount" -Default 0)
          }
          authorAvatar = [string](Get-ObjectPropertyValue -Object $postAuthor -Name "avatar" -Default ([string](Get-ObjectPropertyValue -Object $target -Name "authorAvatar" -Default "")))
          authorHandle = [string](Get-ObjectPropertyValue -Object $postAuthor -Name "handle" -Default ([string](Get-ObjectPropertyValue -Object $target -Name "authorHandle" -Default "")))
          authorDisplayName = [string](Get-ObjectPropertyValue -Object $postAuthor -Name "displayName" -Default ([string](Get-ObjectPropertyValue -Object $target -Name "authorDisplayName" -Default "")))
          authorDid = [string](Get-ObjectPropertyValue -Object $postAuthor -Name "did" -Default ([string](Get-ObjectPropertyValue -Object $target -Name "authorDid" -Default "")))
        }) | Out-Null
      }
      if ($metricsEntries.Count -gt 0) {
        Update-ArchivePostMetricsBatch -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Entries ($metricsEntries.ToArray())
      }
      $metricsProcessed = [Math]::Min($pendingMetricsCount, $metricsProcessed + $batch.Count)
      $checkpoint.metricsOffset = $metricsProcessed
      $checkpoint.phase = "metrics"
      $checkpoint.status = "running"
      Set-ObjectPropertyValue -Object $phaseStatus -Name "metrics" -Value "running"
      $checkpoint.phaseStatus = $phaseStatus
      $checkpoint.updatedAt = [DateTimeOffset]::UtcNow.ToString("o")
      Save-ArchiveCheckpoint -Path $paths.CheckpointPath -State $checkpoint
    }
  }
  Set-ObjectPropertyValue -Object $phaseStatus -Name "metrics" -Value "complete"
  $checkpoint.phaseStatus = $phaseStatus
  $checkpoint.metricsOffset = $pendingMetricsCount
  $checkpoint.updatedAt = [DateTimeOffset]::UtcNow.ToString("o")
  Save-ArchiveCheckpoint -Path $paths.CheckpointPath -State $checkpoint
}

if ([string](Get-ObjectPropertyValue -Object $phaseStatus -Name "avatars" -Default "pending") -ne "complete") {
  $pendingAvatarCount = Get-PendingPostCount -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -FlagColumn "has_avatar"
  Write-Info "Downloading avatars for $pendingAvatarCount pending posts."
  $avatarProcessed = [int](Get-ObjectPropertyValue -Object $checkpoint -Name "avatarOffset" -Default 0)
  $avatarStats = [ordered]@{
    cached = 0
    downloaded = 0
    missing = 0
  }
  while ($true) {
    $readBatch = @(Get-ArchivePendingPostBatchFromDatabase -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -FlagColumn "has_avatar" -Limit $batchReadSize)
    if ($readBatch.Count -eq 0) { break }
    Seed-AssetCacheFromPosts -Posts $readBatch -OutputDirectory $resolvedOutputDirectory -AssetIndex $assetIndex -AssetList $assetList -AssetPathIndex $assetPathIndex
    $avatarEntries = New-Object System.Collections.Generic.List[object]
    for ($localIndex = 0; $localIndex -lt $readBatch.Count; $localIndex += 1) {
      $post = $readBatch[$localIndex]
      Write-ProgressStep -Label "Avatar pass" -Current ([Math]::Min($pendingAvatarCount, $avatarProcessed + $localIndex + 1)) -Total $pendingAvatarCount -Every 50
      $avatarUrl = [string](Get-ObjectPropertyValue -Object $post -Name "authorAvatar" -Default "")
      $existingAvatarPath = [string](Get-ObjectPropertyValue -Object $post -Name "authorAvatarPath" -Default "")
      $hadExistingAvatarFile = $false
      if (-not [string]::IsNullOrWhiteSpace($existingAvatarPath)) {
        $hadExistingAvatarFile = $null -ne (Get-AssetRecordFromRelativePath -OutputDirectory $resolvedOutputDirectory -RelativePath $existingAvatarPath)
      }
      $hadCachedAvatar = $false
      if (-not $hadExistingAvatarFile -and -not [string]::IsNullOrWhiteSpace($avatarUrl)) {
        $hadCachedAvatar = $null -ne (Get-CachedAsset -AssetIndex $assetIndex -CacheKey $avatarUrl -OutputDirectory $resolvedOutputDirectory)
      }
      $asset = Download-AvatarAsset -Post $post -OutputDirectory $resolvedOutputDirectory -AssetIndex $assetIndex
      Add-AssetToListIfMissing -AssetList $assetList -AssetPathIndex $assetPathIndex -Asset $asset
      if ($null -eq $asset) {
        $avatarStats.missing += 1
      } elseif ($hadExistingAvatarFile -or $hadCachedAvatar) {
        $avatarStats.cached += 1
      } else {
        $avatarStats.downloaded += 1
      }
      $avatarEntries.Add([ordered]@{
        uri = [string](Get-ObjectPropertyValue -Object $post -Name "uri" -Default "")
        authorAvatar = [string](Get-ObjectPropertyValue -Object $post -Name "authorAvatar" -Default "")
        authorAvatarPath = [string](Get-ObjectPropertyValue -Object $post -Name "authorAvatarPath" -Default "")
      }) | Out-Null
    }
    if ($avatarEntries.Count -gt 0) {
      Update-ArchivePostAvatarBatch -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Entries ($avatarEntries.ToArray())
    }
    $avatarProcessed = [Math]::Min($pendingAvatarCount, $avatarProcessed + $readBatch.Count)
    $checkpoint.avatarOffset = $avatarProcessed
    $checkpoint.phase = "avatars"
    $checkpoint.status = "running"
    Set-ObjectPropertyValue -Object $phaseStatus -Name "avatars" -Value "running"
    $checkpoint.phaseStatus = $phaseStatus
    $checkpoint.updatedAt = [DateTimeOffset]::UtcNow.ToString("o")
    Save-ArchiveCheckpoint -Path $paths.CheckpointPath -State $checkpoint
    Write-Info "Avatar stats so far: cached=$($avatarStats.cached) | downloaded=$($avatarStats.downloaded) | missing=$($avatarStats.missing)"
  }
  Set-ObjectPropertyValue -Object $phaseStatus -Name "avatars" -Value "complete"
  $checkpoint.phaseStatus = $phaseStatus
  $checkpoint.avatarOffset = $pendingAvatarCount
  $checkpoint.updatedAt = [DateTimeOffset]::UtcNow.ToString("o")
  Save-ArchiveCheckpoint -Path $paths.CheckpointPath -State $checkpoint
  Write-Info "Avatar pass finished: cached=$($avatarStats.cached) | downloaded=$($avatarStats.downloaded) | missing=$($avatarStats.missing)"
}

if ([string](Get-ObjectPropertyValue -Object $phaseStatus -Name "media" -Default "pending") -ne "complete") {
  $pendingMediaCount = Get-PendingPostCount -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -FlagColumn "has_media"
  Write-Info "Downloading embedded images and link-card thumbnails for $pendingMediaCount pending posts."
  $mediaProcessed = [int](Get-ObjectPropertyValue -Object $checkpoint -Name "mediaOffset" -Default 0)
  $mediaStats = [ordered]@{
    imageCached = 0
    imageDownloaded = 0
    imageMissing = 0
    thumbCached = 0
    thumbDownloaded = 0
    thumbMissing = 0
  }
  while ($true) {
    $readBatch = @(Get-ArchivePendingPostBatchFromDatabase -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -FlagColumn "has_media" -Limit $batchReadSize)
    if ($readBatch.Count -eq 0) { break }
    Seed-AssetCacheFromPosts -Posts $readBatch -OutputDirectory $resolvedOutputDirectory -AssetIndex $assetIndex -AssetList $assetList -AssetPathIndex $assetPathIndex
    $mediaEntries = New-Object System.Collections.Generic.List[object]
    for ($localIndex = 0; $localIndex -lt $readBatch.Count; $localIndex += 1) {
      $post = $readBatch[$localIndex]
      Write-ProgressStep -Label "Media pass" -Current ([Math]::Min($pendingMediaCount, $mediaProcessed + $localIndex + 1)) -Total $pendingMediaCount -Every 25
      $images = @(Get-ObjectPropertyValue -Object $post -Name "sourceImages" -Default @())
      $externalCard = Get-ObjectPropertyValue -Object $post -Name "externalCard" -Default $null
      $collected = @()
      $postSkippedImageCount = 0
      $imageIndex = 0
      foreach ($image in $images) {
        $imageIndex += 1
        $cid = [string](Get-ObjectPropertyValue -Object $image -Name "cid" -Default "")
        if ([string]::IsNullOrWhiteSpace($cid)) {
          $postSkippedImageCount += 1
          $mediaStats.imageMissing += 1
          $postUriValue = [string](Get-ObjectPropertyValue -Object $post -Name "uri" -Default "")
          Append-LineUtf8 -Path $paths.MediaFailuresPath -Line (ConvertTo-CompactJson ([ordered]@{
            type = "image"
            reason = "missing-cid"
            postUri = $postUriValue
            authorDid = [string](Get-ObjectPropertyValue -Object $post -Name "authorDid" -Default "")
            authorHandle = [string](Get-ObjectPropertyValue -Object $post -Name "authorHandle" -Default "")
            imageIndex = $imageIndex
            imageMeta = $image
            error = "No CID found in sourceImages entry."
            loggedAt = [DateTimeOffset]::UtcNow.ToString("o")
          }))
          Write-Info "Skipping image for ${postUriValue}: no CID found in sourceImages entry."
          continue
        }
        try {
          $imageAssetResult = Try-DownloadPostImageAsset -SessionState $sessionState -Post $post -Image $image -Cid $cid -ImageIndex $imageIndex -OutputDirectory $resolvedOutputDirectory -AssetIndex $assetIndex
          $asset = Get-ObjectPropertyValue -Object $imageAssetResult -Name "asset" -Default $null
          if ($null -eq $asset) {
            throw "Image asset could not be resolved after blob and CDN fallback attempts."
          }
          $assetSource = [string](Get-ObjectPropertyValue -Object $imageAssetResult -Name "source" -Default "")
          $remoteUrl = [string](Get-ObjectPropertyValue -Object $imageAssetResult -Name "remoteUrl" -Default "")
          if ($assetSource -eq "cache") {
            $mediaStats.imageCached += 1
          } else {
            $mediaStats.imageDownloaded += 1
          }
          Add-AssetToListIfMissing -AssetList $assetList -AssetPathIndex $assetPathIndex -Asset $asset
          $collected += [ordered]@{
            path = $asset.path
            alt = [string](Get-ObjectPropertyValue -Object $image -Name "alt" -Default "")
            width = [int](Get-ObjectPropertyValue -Object $image -Name "width" -Default 0)
            height = [int](Get-ObjectPropertyValue -Object $image -Name "height" -Default 0)
            sourceDid = [string](Get-ObjectPropertyValue -Object $post -Name "authorDid" -Default "")
            sourceCid = $cid
            remoteUrl = $remoteUrl
            mimeType = $asset.type
            sizeBytes = $asset.sizeBytes
          }
        } catch {
          $postSkippedImageCount += 1
          $mediaStats.imageMissing += 1
          $postUriValue = [string](Get-ObjectPropertyValue -Object $post -Name "uri" -Default "")
          $blobUrl = Build-PdsBlobUrl -Did ([string](Get-ObjectPropertyValue -Object $post -Name "authorDid" -Default "")) -Cid $cid
          $cdnUrl = Build-CdnBlobImageUrl -Did ([string](Get-ObjectPropertyValue -Object $post -Name "authorDid" -Default "")) -Cid $cid
          Append-LineUtf8 -Path $paths.MediaFailuresPath -Line (ConvertTo-CompactJson ([ordered]@{
            type = "image"
            postUri = $postUriValue
            authorDid = [string](Get-ObjectPropertyValue -Object $post -Name "authorDid" -Default "")
            authorHandle = [string](Get-ObjectPropertyValue -Object $post -Name "authorHandle" -Default "")
            cid = $cid
            blobUrl = $blobUrl
            cdnUrl = $cdnUrl
            error = $_.Exception.Message
            loggedAt = [DateTimeOffset]::UtcNow.ToString("o")
          }))
          Write-Info "Skipping image for ${postUriValue}: $($_.Exception.Message)"
        }
      }
      if ($null -ne $externalCard) {
        $thumbUrl = [string](Get-ObjectPropertyValue -Object $externalCard -Name "thumb" -Default "")
        $thumbCid = [string](Get-ObjectPropertyValue -Object $externalCard -Name "thumbCid" -Default "")
      if (-not [string]::IsNullOrWhiteSpace($thumbUrl) -or -not [string]::IsNullOrWhiteSpace($thumbCid)) {
        try {
          $thumbCacheKey = if (-not [string]::IsNullOrWhiteSpace($thumbCid)) {
            Get-BlobAssetCacheKey -Did ([string](Get-ObjectPropertyValue -Object $post -Name "authorDid" -Default "")) -Cid $thumbCid
          } else {
            Get-UrlAssetCacheKey -Url $thumbUrl
          }
          $cachedThumbAsset = if (-not [string]::IsNullOrWhiteSpace($thumbCacheKey)) {
            Get-CachedAsset -AssetIndex $assetIndex -CacheKey $thumbCacheKey -OutputDirectory $resolvedOutputDirectory
          } else {
            $null
          }
          $thumbAsset = Try-DownloadLinkCardThumbnailAsset -SessionState $sessionState -Post $post -ThumbCid $thumbCid -ThumbUrl $thumbUrl -OutputDirectory $resolvedOutputDirectory -AssetIndex $assetIndex
          if ($thumbAsset) {
            if ($null -ne $cachedThumbAsset) {
              $mediaStats.thumbCached += 1
            } else {
              $mediaStats.thumbDownloaded += 1
            }
            Add-AssetToListIfMissing -AssetList $assetList -AssetPathIndex $assetPathIndex -Asset $thumbAsset
            Set-ObjectPropertyValue -Object $externalCard -Name "thumbPath" -Value $thumbAsset.path
            Set-ObjectPropertyValue -Object $externalCard -Name "thumbLoadFailed" -Value $false
            Set-ObjectPropertyValue -Object $externalCard -Name "thumbLoadAttempts" -Value 1
          }
        } catch {
          $mediaStats.thumbMissing += 1
          Set-ObjectPropertyValue -Object $externalCard -Name "thumbLoadFailed" -Value $true
          Set-ObjectPropertyValue -Object $externalCard -Name "thumbLoadAttempts" -Value 1
          $postUriValue = [string](Get-ObjectPropertyValue -Object $post -Name "uri" -Default "")
          Write-Info "Skipping link-card thumbnail for ${postUriValue}: $($_.Exception.Message)"
        }
        }
      }
      $mediaEntries.Add([ordered]@{
        uri = [string](Get-ObjectPropertyValue -Object $post -Name "uri" -Default "")
        images = @($collected)
        externalCard = $externalCard
        mediaSkippedCount = $postSkippedImageCount
      }) | Out-Null
    }
    if ($mediaEntries.Count -gt 0) {
      Update-ArchivePostMediaBatch -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Entries ($mediaEntries.ToArray())
    }
    $mediaProcessed = [Math]::Min($pendingMediaCount, $mediaProcessed + $readBatch.Count)
    $checkpoint.mediaOffset = $mediaProcessed
    $checkpoint.phase = "media"
    $checkpoint.status = "running"
    Set-ObjectPropertyValue -Object $phaseStatus -Name "media" -Value "running"
    $checkpoint.phaseStatus = $phaseStatus
    $checkpoint.updatedAt = [DateTimeOffset]::UtcNow.ToString("o")
    Save-ArchiveCheckpoint -Path $paths.CheckpointPath -State $checkpoint
    Write-Info "Media stats so far: imageCached=$($mediaStats.imageCached) | imageDownloaded=$($mediaStats.imageDownloaded) | imageMissing=$($mediaStats.imageMissing) | thumbCached=$($mediaStats.thumbCached) | thumbDownloaded=$($mediaStats.thumbDownloaded) | thumbMissing=$($mediaStats.thumbMissing)"
  }
  Set-ObjectPropertyValue -Object $phaseStatus -Name "media" -Value "complete"
  $checkpoint.phaseStatus = $phaseStatus
  $checkpoint.mediaOffset = $pendingMediaCount
  $checkpoint.updatedAt = [DateTimeOffset]::UtcNow.ToString("o")
  Save-ArchiveCheckpoint -Path $paths.CheckpointPath -State $checkpoint
  Write-Info "Media pass finished: imageCached=$($mediaStats.imageCached) | imageDownloaded=$($mediaStats.imageDownloaded) | imageMissing=$($mediaStats.imageMissing) | thumbCached=$($mediaStats.thumbCached) | thumbDownloaded=$($mediaStats.thumbDownloaded) | thumbMissing=$($mediaStats.thumbMissing)"
}

Set-ObjectPropertyValue -Object $phaseStatus -Name "export" -Value "running"
$checkpoint.phase = "export"
$checkpoint.phaseStatus = $phaseStatus
$checkpoint.updatedAt = [DateTimeOffset]::UtcNow.ToString("o")
Save-ArchiveCheckpoint -Path $paths.CheckpointPath -State $checkpoint

Export-ArchiveFromDatabase -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Paths $paths -SourceProfile $sourceProfile -Filters $filters -PageCount $pageCount -CreatePostsJson $resolvedCreatePostsJson -Warning $warning

Set-ObjectPropertyValue -Object $phaseStatus -Name "export" -Value "complete"
$checkpoint.phaseStatus = $phaseStatus

if ($resolvedCreateZip) {
  Set-ObjectPropertyValue -Object $phaseStatus -Name "zip" -Value "running"
  $checkpoint.phase = "zip"
  $checkpoint.phaseStatus = $phaseStatus
  $checkpoint.updatedAt = [DateTimeOffset]::UtcNow.ToString("o")
  Save-ArchiveCheckpoint -Path $paths.CheckpointPath -State $checkpoint
  $zipName = ([System.IO.Path]::GetFileName($resolvedOutputDirectory.TrimEnd('\', '/'))) + ".zip"
  $zipPath = Join-Path (Split-Path -Parent $resolvedOutputDirectory) $zipName
  Write-Info "Writing ZIP archive to $zipPath"
  [void](Write-ArchiveZip -SourceDirectory $resolvedOutputDirectory -ZipPath $zipPath)
  Set-ObjectPropertyValue -Object $phaseStatus -Name "zip" -Value "complete"
  $checkpoint.phaseStatus = $phaseStatus
}

$checkpoint.phase = "completed"
$checkpoint.status = "completed"
$checkpoint.exportedPosts = (Get-DatabasePostCount -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath)
$checkpoint.updatedAt = [DateTimeOffset]::UtcNow.ToString("o")
Save-ArchiveCheckpoint -Path $paths.CheckpointPath -State $checkpoint
Set-RunStateValue -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Key "phase" -Value "completed"
Set-RunStateValue -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Key "status" -Value "completed"
Set-RunStateValue -SqliteExe $resolvedSqliteExePath -DatabasePath $paths.DatabasePath -Key "updatedAt" -Value ([DateTimeOffset]::UtcNow.ToString("o"))

Write-Info "SQLite archive complete. Database: $($paths.DatabasePath)"
