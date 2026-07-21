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
  [switch]$CompactWorkingState,
  [switch]$CreateZip,
  [switch]$AllowSvg
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Script:ToolVersion = "0.1.0"
$Script:DefaultService = "https://bsky.social"
$Script:DefaultMaxPosts = 2000
$Script:DefaultPageSize = 100
$Script:UserAgent = "threadline-powershell-archiver/$($Script:ToolVersion)"
$Script:ProgressInlineActive = $false
$Script:ProgressInlineLength = 0

function Write-Info {
  param([string]$Message)
  if ($Script:ProgressInlineActive) {
    Write-Host ""
    $Script:ProgressInlineActive = $false
    $Script:ProgressInlineLength = 0
  }
  Write-Host "[threadline-archiver] $Message"
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
    $message = "[threadline-archiver] $Label $Current / $Total"
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
  try {
    return ConvertFrom-Json -InputObject $text
  } catch {
    $hints = New-Object System.Collections.Generic.List[string]
    if ($text -match '"outputDirectory"\s*:\s*"[A-Za-z]:\\[^\\]') {
      $hints.Add('Windows paths inside JSON need escaped backslashes, for example "C:\\Temp\\threadline-archive", or plain slashes like "C:/Temp/threadline-archive".')
    }
    if ($text -match '"maxPosts"\s*:\s*,') {
      $hints.Add('maxPosts is missing a numeric value. Use something like "maxPosts": 2000.')
    }
    if ($text -match '"(from|to)"\s*:\s*"\d{8}"') {
      $hints.Add('from/to should use ISO dates in the form YYYY-MM-DD, for example "2025-06-01".')
    }
    $message = "Invalid JSON in config file '$Path'."
    if ($hints.Count -gt 0) {
      $message += " " + (($hints | Select-Object -Unique) -join " ")
    } else {
      $message += " " + $_.Exception.Message
    }
    throw $message
  }
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

function ConvertTo-PlainValue {
  param($Value)
  if ($null -eq $Value) {
    return $null
  }
  if ($Value -is [System.Collections.IDictionary]) {
    $result = [ordered]@{}
    foreach ($key in $Value.Keys) {
      $result[$key] = ConvertTo-PlainValue -Value $Value[$key]
    }
    return $result
  }
  if ($Value -is [System.Collections.IEnumerable] -and -not ($Value -is [string])) {
    $items = New-Object System.Collections.Generic.List[object]
    foreach ($item in $Value) {
      $items.Add((ConvertTo-PlainValue -Value $item))
    }
    return $items.ToArray()
  }
  $properties = @($Value.PSObject.Properties)
  if ($Value -is [psobject] -and $properties.Length -gt 0) {
    $result = [ordered]@{}
    foreach ($property in $properties) {
      $result[$property.Name] = ConvertTo-PlainValue -Value $property.Value
    }
    return $result
  }
  return $Value
}

function ConvertTo-ObjectArray {
  param($Value)
  if ($null -eq $Value) {
    return @()
  }
  if ($Value -is [System.Collections.IEnumerable] -and -not ($Value -is [string]) -and -not ($Value -is [System.Collections.IDictionary])) {
    return @($Value)
  }
  return @($Value)
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
  if ($null -eq $property) {
    $Object | Add-Member -NotePropertyName $Name -NotePropertyValue $Value
    return
  }
  $property.Value = $Value
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
  if ($null -eq $property) {
    return $Default
  }
  if ($null -eq $property.Value) {
    return $Default
  }
  return $property.Value
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
  $baseDirectory = if ($ConfigFilePath) {
    Split-Path -Parent $ConfigFilePath
  } else {
    (Get-Location).Path
  }
  return [System.IO.Path]::GetFullPath((Join-Path $baseDirectory $Value))
}

function Normalize-ServiceUrl {
  param([string]$Value)
  $candidate = if ([string]::IsNullOrWhiteSpace($Value)) { $Script:DefaultService } else { $Value.Trim() }
  if ($candidate -notmatch "^https://") {
    throw "Service must start with https://"
  }
  return $candidate.TrimEnd("/")
}

function Normalize-ArchiveDateString {
  param(
    [string]$Value,
    [string]$FieldName
  )
  $candidate = [string]$Value
  if ([string]::IsNullOrWhiteSpace($candidate)) {
    return ""
  }
  $candidate = $candidate.Trim()
  if ($candidate -match "^\d{8}$") {
    return "{0}-{1}-{2}" -f $candidate.Substring(0, 4), $candidate.Substring(4, 2), $candidate.Substring(6, 2)
  }
  if ($candidate -notmatch "^\d{4}-\d{2}-\d{2}$") {
    throw "$FieldName must use YYYY-MM-DD format."
  }
  return $candidate
}

function Get-WaitProfileSettings {
  param([string]$Profile)
  switch ($Profile) {
    "aggressive" {
      return @{
        SoftPauseEveryPages = 0
        SoftPauseMs = 0
        LongPauseEveryPages = 0
        LongPauseMs = 0
        RetryFallbacksMs = @(15000, 30000, 45000, 60000)
      }
    }
    "night" {
      return @{
        SoftPauseEveryPages = 15
        SoftPauseMs = 5000
        LongPauseEveryPages = 60
        LongPauseMs = 15000
        RetryFallbacksMs = @(30000, 60000, 90000, 120000)
      }
    }
    default {
      return @{
        SoftPauseEveryPages = 25
        SoftPauseMs = 3000
        LongPauseEveryPages = 100
        LongPauseMs = 10000
        RetryFallbacksMs = @(30000, 45000, 60000, 60000)
      }
    }
  }
}

function Get-RetryAfterMilliseconds {
  param($Response)
  if ($null -eq $Response) {
    return 0
  }
  $header = $Response.Headers["Retry-After"]
  if ([string]::IsNullOrWhiteSpace($header)) {
    return 0
  }
  $seconds = 0
  if ([int]::TryParse([string]$header, [ref]$seconds)) {
    return [Math]::Max(0, $seconds * 1000)
  }
  try {
    $when = [DateTimeOffset]::Parse([string]$header)
    return [Math]::Max(0, [int][Math]::Ceiling(($when - [DateTimeOffset]::UtcNow).TotalMilliseconds))
  } catch {
    return 0
  }
}

function Get-HttpErrorPayload {
  param($Exception)
  if ($null -eq $Exception) {
    return $null
  }
  $response = $Exception.Response
  if ($null -eq $response) {
    return $null
  }
  try {
    $stream = $response.GetResponseStream()
    if ($null -eq $stream) {
      return $null
    }
    $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8, $true, 1024, $false)
    try {
      $raw = $reader.ReadToEnd()
    } finally {
      $reader.Dispose()
    }
    if ([string]::IsNullOrWhiteSpace($raw)) {
      return $null
    }
    try {
      return ConvertFrom-Json -InputObject $raw
    } catch {
      return [ordered]@{ raw = $raw }
    }
  } catch {
    return $null
  }
}

function ConvertTo-QueryString {
  param([hashtable]$Parameters)
  if ($null -eq $Parameters -or $Parameters.Count -eq 0) {
    return ""
  }
  $pairs = foreach ($entry in $Parameters.GetEnumerator()) {
    if ($entry.Value -is [System.Collections.IEnumerable] -and -not ($entry.Value -is [string])) {
      foreach ($item in $entry.Value) {
        if ($null -eq $item -or [string]::IsNullOrWhiteSpace([string]$item)) {
          continue
        }
        "{0}={1}" -f [Uri]::EscapeDataString([string]$entry.Key), [Uri]::EscapeDataString([string]$item)
      }
      continue
    }
    if ($null -eq $entry.Value -or [string]::IsNullOrWhiteSpace([string]$entry.Value)) {
      continue
    }
    "{0}={1}" -f [Uri]::EscapeDataString([string]$entry.Key), [Uri]::EscapeDataString([string]$entry.Value)
  }
  if (-not $pairs) {
    return ""
  }
  return "?" + ($pairs -join "&")
}

function Invoke-HttpJson {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Uri,
    [hashtable]$Headers,
    $Body,
    [int[]]$RetryFallbacksMs = @(30000, 45000, 60000, 60000),
    [int]$MaxAttempts = 5
  )

  for ($attempt = 0; $attempt -lt $MaxAttempts; $attempt += 1) {
    try {
      $invokeParams = @{
        Method      = $Method
        Uri         = $Uri
        Headers     = $Headers
        UserAgent   = $Script:UserAgent
        ErrorAction = "Stop"
      }
      if ($null -ne $Body) {
        $invokeParams["Body"] = $Body
        $invokeParams["ContentType"] = "application/json"
      }
      return Invoke-RestMethod @invokeParams
    } catch {
      $response = $_.Exception.Response
      $statusCode = if ($response) { [int]$response.StatusCode } else { 0 }
      $shouldRetry = $statusCode -in 429, 502, 503, 504
      if (-not $shouldRetry -or $attempt -ge ($MaxAttempts - 1)) {
        throw
      }
      $retryMs = Get-RetryAfterMilliseconds -Response $response
      if ($retryMs -le 0) {
        $retryMs = $RetryFallbacksMs[[Math]::Min($attempt, $RetryFallbacksMs.Count - 1)]
      }
      $retrySeconds = [Math]::Max(1, [Math]::Ceiling($retryMs / 1000))
      Write-Info "Server asked us to slow down (HTTP $statusCode). Waiting $retrySeconds seconds before retry."
      Start-Sleep -Milliseconds $retryMs
    }
  }
}

function Invoke-HttpBytes {
  param(
    [Parameter(Mandatory = $true)][string]$Uri,
    [hashtable]$Headers
  )
  $response = Invoke-WebRequest -Uri $Uri -Headers $Headers -UserAgent $Script:UserAgent -Method GET -ErrorAction Stop
  $memory = New-Object System.IO.MemoryStream
  $response.RawContentStream.CopyTo($memory)
  return @{
    Bytes = $memory.ToArray()
    ContentType = [string]($response.Headers["Content-Type"] | Select-Object -First 1)
  }
}

function New-AtprotoSession {
  param(
    [Parameter(Mandatory = $true)][string]$Identifier,
    [Parameter(Mandatory = $true)][string]$AppPassword,
    [Parameter(Mandatory = $true)][string]$Service,
    [int[]]$RetryFallbacksMs
  )
  $body = @{
    identifier = $Identifier
    password   = $AppPassword
  } | ConvertTo-Json -Compress
  $session = Invoke-HttpJson -Method POST -Uri "$Service/xrpc/com.atproto.server.createSession" -Body $body -RetryFallbacksMs $RetryFallbacksMs
  if (-not $session.did -or -not $session.accessJwt) {
    throw "Login failed: session response was incomplete."
  }
  return $session
}

function Refresh-AtprotoSession {
  param(
    [Parameter(Mandatory = $true)]$SessionState,
    [int[]]$RetryFallbacksMs
  )
  $headers = @{
    Authorization = "Bearer $($SessionState.Session.refreshJwt)"
  }
  try {
    $refreshed = Invoke-HttpJson -Method POST -Uri "$($SessionState.Service)/xrpc/com.atproto.server.refreshSession" -Headers $headers -RetryFallbacksMs $RetryFallbacksMs
    $SessionState.Session = $refreshed
    return $refreshed
  } catch {
    $payload = Get-HttpErrorPayload -Exception $_.Exception
    $errorCode = [string](Get-ObjectPropertyValue -Object $payload -Name "error" -Default "")
    $statusCode = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
    $shouldRecreateSession = $statusCode -eq 401 -or $errorCode -eq "ExpiredToken"
    if (-not $shouldRecreateSession) {
      throw
    }
    Write-Info "Refresh token expired. Creating a new session."
    $newSession = New-AtprotoSession -Identifier ([string]$SessionState.Identifier) -AppPassword ([string]$SessionState.AppPassword) -Service ([string]$SessionState.Service) -RetryFallbacksMs $RetryFallbacksMs
    $SessionState.Session = $newSession
    return $newSession
  }
}

function Invoke-Atproto {
  param(
    [Parameter(Mandatory = $true)]$SessionState,
    [Parameter(Mandatory = $true)][string]$Endpoint,
    [ValidateSet("GET", "POST")]
    [string]$Method = "GET",
    [hashtable]$Query,
    $Body = $null
  )

  $retrySettings = $SessionState.WaitSettings.RetryFallbacksMs

  for ($attempt = 0; $attempt -lt 2; $attempt += 1) {
    $headers = @{
      Authorization = "Bearer $($SessionState.Session.accessJwt)"
    }
    $uri = "$($SessionState.Service)/xrpc/$Endpoint$(ConvertTo-QueryString -Parameters $Query)"
    try {
      return Invoke-HttpJson -Method $Method -Uri $uri -Headers $headers -Body $Body -RetryFallbacksMs $retrySettings
    } catch {
      $response = $_.Exception.Response
      $statusCode = if ($response) { [int]$response.StatusCode } else { 0 }
      $payload = Get-HttpErrorPayload -Exception $_.Exception
      $errorCode = [string](Get-ObjectPropertyValue -Object $payload -Name "error" -Default "")
      if (($statusCode -eq 401 -or $errorCode -eq "ExpiredToken") -and $attempt -eq 0) {
        Write-Info "Access token expired. Refreshing session."
        Refresh-AtprotoSession -SessionState $SessionState -RetryFallbacksMs $retrySettings | Out-Null
        continue
      }
      throw
    }
  }
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
  foreach ($service in @($document.service)) {
    if ($service.type -eq "AtprotoPersonalDataServer" -or [string]$service.id -like "*#atproto_pds") {
      $endpoint = [string]$service.serviceEndpoint
      if (-not [string]::IsNullOrWhiteSpace($endpoint)) {
        return $endpoint.TrimEnd("/")
      }
    }
  }
  throw "Could not resolve PDS endpoint for DID $Did"
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

function Parse-AtUri {
  param([string]$Uri)
  if ([string]::IsNullOrWhiteSpace($Uri) -or $Uri -notmatch "^at://([^/]+)/([^/]+)/([^/?#]+)") {
    return @{
      did = ""
      collection = ""
      rkey = ""
    }
  }
  return @{
    did = $Matches[1]
    collection = $Matches[2]
    rkey = $Matches[3]
  }
}

function Get-ArchiveRootUri {
  param($Record, [string]$FallbackUri)
  $rootUri = ""
  $reply = Get-ObjectPropertyValue -Object $Record -Name "reply"
  $root = Get-ObjectPropertyValue -Object $reply -Name "root"
  $rootUriValue = Get-ObjectPropertyValue -Object $root -Name "uri"
  if (-not [string]::IsNullOrWhiteSpace([string]$rootUriValue)) {
    $rootUri = [string]$rootUriValue
  } elseif ($root) {
    $rootUri = [string]$root
  }
  if ([string]::IsNullOrWhiteSpace($rootUri)) {
    return $FallbackUri
  }
  return $rootUri
}

function Get-ArchiveParentUri {
  param($Record)
  $parentUri = ""
  $reply = Get-ObjectPropertyValue -Object $Record -Name "reply"
  $parent = Get-ObjectPropertyValue -Object $reply -Name "parent"
  $parentUriValue = Get-ObjectPropertyValue -Object $parent -Name "uri"
  if (-not [string]::IsNullOrWhiteSpace([string]$parentUriValue)) {
    $parentUri = [string]$parentUriValue
  } elseif ($parent) {
    $parentUri = [string]$parent
  }
  return $parentUri
}

function Test-ArchivePostIsReply {
  param($Post)
  $thread = Get-ObjectPropertyValue -Object $Post -Name "thread" -Default $null
  $parentUri = [string](Get-ObjectPropertyValue -Object $thread -Name "parentUri" -Default "")
  return -not [string]::IsNullOrWhiteSpace($parentUri)
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
    if ($timestamp -lt $yearStart) {
      return $true
    }
  }
  if ($Filters.scope -eq "range" -and -not [string]::IsNullOrWhiteSpace($Filters.from)) {
    $fromStart = [datetime]::ParseExact("$($Filters.from)T00:00:00Z", "yyyy-MM-ddTHH:mm:ssZ", [System.Globalization.CultureInfo]::InvariantCulture, [System.Globalization.DateTimeStyles]::AssumeUniversal)
    if ($timestamp -lt $fromStart) {
      return $true
    }
  }
  return $false
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
      if ([string]::IsNullOrWhiteSpace($Filters.year)) {
        return $true
      }
      return $timestamp.Year -eq [int]$Filters.year
    }
    "range" {
      if (-not [string]::IsNullOrWhiteSpace($Filters.from)) {
        $fromStart = [datetime]::ParseExact("$($Filters.from)T00:00:00Z", "yyyy-MM-ddTHH:mm:ssZ", [System.Globalization.CultureInfo]::InvariantCulture, [System.Globalization.DateTimeStyles]::AssumeUniversal)
        if ($timestamp -lt $fromStart) {
          return $false
        }
      }
      if (-not [string]::IsNullOrWhiteSpace($Filters.to)) {
        $toEnd = [datetime]::ParseExact("$($Filters.to)T23:59:59Z", "yyyy-MM-ddTHH:mm:ssZ", [System.Globalization.CultureInfo]::InvariantCulture, [System.Globalization.DateTimeStyles]::AssumeUniversal)
        if ($timestamp -gt $toEnd) {
          return $false
        }
      }
      return $true
    }
    default {
      return $true
    }
  }
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
  if ($null -eq $embed) {
    return @()
  }
  $images = Get-ObjectPropertyValue -Object $embed -Name "images"
  if ($images -is [System.Collections.IEnumerable]) {
    return @($images) | Select-Object -First 10
  }
  $items = Get-ObjectPropertyValue -Object $embed -Name "items"
  if ($items -is [System.Collections.IEnumerable]) {
    return @($items | Where-Object { (Get-ObjectPropertyValue -Object $_ -Name "image") }) | Select-Object -First 10
  }
  $media = Get-ObjectPropertyValue -Object $embed -Name "media"
  if ($media) {
    return Get-EmbedImages -Record @{ embed = $media }
  }
  return @()
}

function Get-EmbedImageRefs {
  param($Record)
  $items = New-Object System.Collections.Generic.List[object]
  foreach ($image in @(Get-EmbedImages -Record $Record)) {
    $cid = Get-BlobCidFromRef -Image $image
    if ([string]::IsNullOrWhiteSpace($cid)) {
      continue
    }
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

function Get-ExternalCardFromRecord {
  param($Record)
  $embed = Get-ObjectPropertyValue -Object $Record -Name "embed"
  if ($null -eq $embed) {
    return $null
  }
  $external = Get-ObjectPropertyValue -Object $embed -Name "external"
  $media = Get-ObjectPropertyValue -Object $embed -Name "media"
  if ($null -eq $external -and $media) {
    $external = Get-ObjectPropertyValue -Object $media -Name "external"
  }
  if ($null -eq $external) {
    return $null
  }
  $thumbRef = Get-ObjectPropertyValue -Object $external -Name "thumb"
  if ($null -eq $thumbRef) {
    $thumbRef = Get-ObjectPropertyValue -Object $external -Name "thumbnail"
  }
  if ($null -eq $thumbRef) {
    $thumbRef = Get-ObjectPropertyValue -Object $external -Name "image"
  }
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
    $Counts = @{
      likeCount = 0
      replyCount = 0
      repostCount = 0
      quoteCount = 0
    }
  }
  return [pscustomobject][ordered]@{
    uri = $Uri
    cid = $Cid
    rkey = $parsed.rkey
    createdAt = [string](Get-ObjectPropertyValue -Object $Record -Name "createdAt" -Default "")
    text = [string](Get-ObjectPropertyValue -Object $Record -Name "text" -Default "")
    langs = @((Get-ObjectPropertyValue -Object $Record -Name "langs" -Default @()))
    facets = @((Get-ObjectPropertyValue -Object $Record -Name "facets" -Default @()))
    reply = Get-ObjectPropertyValue -Object $Record -Name "reply"
    thread = [pscustomobject]@{
      rootUri = Get-ArchiveRootUri -Record $Record -FallbackUri $Uri
      parentUri = Get-ArchiveParentUri -Record $Record
    }
    counts = [pscustomobject]@{
      likeCount = [int]($Counts.likeCount)
      replyCount = [int]($Counts.replyCount)
      repostCount = [int]($Counts.repostCount)
      quoteCount = [int]($Counts.quoteCount)
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
  }
}

function Merge-ArchivePost {
  param(
    $Existing,
    $Incoming
  )
  foreach ($key in @("cid", "rkey", "createdAt", "text", "reply", "permalink", "authorHandle", "authorDisplayName", "authorDid", "authorAvatar", "authorAvatarPath", "externalCard")) {
    $incomingValue = Get-ObjectPropertyValue -Object $Incoming -Name $key
    if ($null -ne $incomingValue -and -not [string]::IsNullOrWhiteSpace([string]$incomingValue)) {
      Set-ObjectPropertyValue -Object $Existing -Name $key -Value $incomingValue
    }
  }
  $incomingLangs = @(Get-ObjectPropertyValue -Object $Incoming -Name "langs" -Default @())
  if ($incomingLangs.Count -gt 0) {
    Set-ObjectPropertyValue -Object $Existing -Name "langs" -Value $incomingLangs
  }
  $incomingFacets = @(Get-ObjectPropertyValue -Object $Incoming -Name "facets" -Default @())
  if ($incomingFacets.Count -gt 0) {
    Set-ObjectPropertyValue -Object $Existing -Name "facets" -Value $incomingFacets
  }
  $incomingSourceImages = @(Get-ObjectPropertyValue -Object $Incoming -Name "sourceImages" -Default @())
  if ($incomingSourceImages.Count -gt 0) {
    Set-ObjectPropertyValue -Object $Existing -Name "sourceImages" -Value $incomingSourceImages
  }
  $existingThread = Get-ObjectPropertyValue -Object $Existing -Name "thread" -Default ([pscustomobject]@{ rootUri = ""; parentUri = "" })
  $incomingThread = Get-ObjectPropertyValue -Object $Incoming -Name "thread" -Default $null
  if ($null -ne $incomingThread) {
    $incomingRootUri = [string](Get-ObjectPropertyValue -Object $incomingThread -Name "rootUri" -Default "")
    $incomingParentUri = [string](Get-ObjectPropertyValue -Object $incomingThread -Name "parentUri" -Default "")
    if ($incomingRootUri) {
      Set-ObjectPropertyValue -Object $existingThread -Name "rootUri" -Value $incomingRootUri
    }
    if ($incomingParentUri) {
      Set-ObjectPropertyValue -Object $existingThread -Name "parentUri" -Value $incomingParentUri
    }
    Set-ObjectPropertyValue -Object $Existing -Name "thread" -Value $existingThread
  }
  $incomingCounts = Get-ObjectPropertyValue -Object $Incoming -Name "counts" -Default $null
  if ($null -ne $incomingCounts) {
    Set-ObjectPropertyValue -Object $Existing -Name "counts" -Value $incomingCounts
  }
}

function Normalize-ArchivePostForWorkingState {
  param([Parameter(Mandatory = $true)]$Post)
  $sourceImages = @(Get-ObjectPropertyValue -Object $Post -Name "sourceImages" -Default @())
  if ($sourceImages.Count -eq 0) {
    $rawRecord = Get-ObjectPropertyValue -Object $Post -Name "rawRecord" -Default $null
    if ($null -ne $rawRecord) {
      Set-ObjectPropertyValue -Object $Post -Name "sourceImages" -Value @(Get-EmbedImageRefs -Record $rawRecord)
    }
  }
  $externalCard = Get-ObjectPropertyValue -Object $Post -Name "externalCard" -Default $null
  if ($null -ne $externalCard) {
    $thumbCid = [string](Get-ObjectPropertyValue -Object $externalCard -Name "thumbCid" -Default "")
    if ([string]::IsNullOrWhiteSpace($thumbCid)) {
      $thumbRef = Get-ObjectPropertyValue -Object $externalCard -Name "thumbRef" -Default $null
      if ($null -ne $thumbRef) {
        Set-ObjectPropertyValue -Object $externalCard -Name "thumbCid" -Value ([string](Get-BlobCidFromRef -Image $thumbRef))
      }
    }
    $thumbPath = [string](Get-ObjectPropertyValue -Object $externalCard -Name "thumbPath" -Default "")
    if (-not [string]::IsNullOrWhiteSpace($thumbPath)) {
      Set-ObjectPropertyValue -Object $externalCard -Name "thumbRef" -Value $null
    }
    Set-ObjectPropertyValue -Object $Post -Name "externalCard" -Value $externalCard
  }
  if ($Post.PSObject.Properties["rawRecord"]) {
    $Post.PSObject.Properties.Remove("rawRecord")
  }
}

function Invoke-CompactWorkingPostStore {
  param([Parameter(Mandatory = $true)]$Paths)
  if (-not (Test-Path $Paths.WorkingPostsPath)) {
    throw "No working post store found at '$($Paths.WorkingPostsPath)'."
  }
  Write-Info "Compacting working post store without starting an archive run."
  $posts = New-Object System.Collections.Generic.List[object]
  $needsCompaction = $false
  $progressState = [ordered]@{
    nextMark = 5000
  }
  $loadedPostTotal = Invoke-NdjsonEntries -Path $Paths.WorkingPostsPath -Label "working post store" -ProgressByBytes -OnEntry {
    param($post, $entryNumber)
    if ($entryNumber -eq 1 -or $entryNumber -ge $progressState.nextMark) {
      $message = "[threadline-archiver] Compacting post store $entryNumber posts loaded"
      $paddingLength = [Math]::Max(0, $Script:ProgressInlineLength - $message.Length)
      $padding = if ($paddingLength -gt 0) { " " * $paddingLength } else { "" }
      Write-Host -NoNewline ("`r" + $message + $padding)
      $Script:ProgressInlineActive = $true
      $Script:ProgressInlineLength = $message.Length
      $progressState.nextMark = $entryNumber + 5000
    }
    $externalCard = Get-ObjectPropertyValue -Object $post -Name "externalCard" -Default $null
    if ($post.PSObject.Properties["rawRecord"] -or (($null -ne $externalCard) -and (Get-ObjectPropertyValue -Object $externalCard -Name "thumbRef" -Default $null))) {
      $needsCompaction = $true
    }
    Normalize-ArchivePostForWorkingState -Post $post
    $posts.Add($post)
  }
  if ($Script:ProgressInlineActive) {
    Write-Host ""
    $Script:ProgressInlineActive = $false
    $Script:ProgressInlineLength = 0
  }
  Write-Info "Working post store scanned: $loadedPostTotal posts."
  if (-not $needsCompaction) {
    Write-Info "Working post store is already in compact form."
    return
  }
  Rewrite-NdjsonFile -Path $Paths.WorkingPostsPath -Entries ($posts.ToArray()) -Label "working post store"
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

function Test-IsSvgMimeType {
  param([string]$MimeType)
  $value = [string]$MimeType
  return $value -match "image/svg|svg\+xml"
}

function Get-ArchivePlaceholderImageBytes {
  $base64 = "iVBORw0KGgoAAAANSUhEUgAAAGAAAABICAYAAAAJZ/BjAAAAvUlEQVR4nO3XMRUCQRAFwVWEHNwgBj/EKLn8yJDA3NIVdD7vVzTr/bydmmtNH1DvC3AeL/0wAADaAQDQDgCAdgAAtAMAoB0AAO0AAGgHoAbwuK+tAgAAAAAAAAAAAAAAAAAAAAAAAABgWwABuFQAALQDAKAdAADtAPwLwPTHOh0AAPMjAAgHAMD8CADCAQAwPwKAcADqAAKwZQAAtAMAoB0AAO0AAGgHAEA7AADaAQDQDgCAdgCuBqCZAAz3AYEOqDkEidkXAAAAAElFTkSuQmCC"
  return [Convert]::FromBase64String($base64)
}

function Normalize-ArchiveImageAsset {
  param(
    [Parameter(Mandatory = $true)][byte[]]$Bytes,
    [Parameter(Mandatory = $true)][string]$ContentType
  )
  if ($AllowSvg -or -not (Test-IsSvgMimeType -MimeType $ContentType)) {
    return [ordered]@{
      Bytes = $Bytes
      ContentType = if ([string]::IsNullOrWhiteSpace($ContentType)) { "application/octet-stream" } else { $ContentType }
    }
  }
  return [ordered]@{
    Bytes = Get-ArchivePlaceholderImageBytes
    ContentType = "image/png"
  }
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
  if (-not (Test-Path -LiteralPath $fullPath)) {
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
  $AssetList.Add($Asset)
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
  if (-not [string]::IsNullOrWhiteSpace($ThumbCid)) {
    try {
      $download = Download-BlobAsset -SessionState $SessionState -Did ([string]$Post.authorDid) -Cid $ThumbCid
      $downloadSource = "blob"
    } catch {
      if (-not [string]::IsNullOrWhiteSpace($ThumbUrl)) {
        Write-Info "Blob thumbnail lookup failed for $($Post.uri). Falling back to thumbnail URL."
      } else {
        throw
      }
    }
  }
  if ($null -eq $download -and -not [string]::IsNullOrWhiteSpace($ThumbUrl)) {
    $download = Invoke-HttpBytes -Uri $ThumbUrl -Headers @{}
    $downloadSource = "url"
  }
  if ($null -eq $download) {
    return $null
  }

  $normalizedAsset = Normalize-ArchiveImageAsset -Bytes $download.Bytes -ContentType $download.ContentType
  $extension = Get-AssetExtensionFromMimeType -MimeType $normalizedAsset.ContentType
  $authorSlug = ([string]$Post.authorHandle, [string]$Post.authorDid -join "-").Replace(":", "-").Replace("/", "-")
  $authorSlug = ($authorSlug -replace "[^\w.-]+", "-").Trim("-")
  if ([string]::IsNullOrWhiteSpace($authorSlug)) {
    $authorSlug = "author"
  }
  $relativePath = "link-cards/$authorSlug-$($Post.rkey).$extension"
  $asset = Save-ByteAsset -OutputDirectory $OutputDirectory -RelativePath $relativePath -Bytes $normalizedAsset.Bytes -ContentType $normalizedAsset.ContentType
  Set-CachedAsset -AssetIndex $AssetIndex -CacheKey $thumbCacheKey -Asset $asset
  if ($downloadSource -eq "url") {
    $urlCacheKey = Get-UrlAssetCacheKey -Url $ThumbUrl
    Set-CachedAsset -AssetIndex $AssetIndex -CacheKey $urlCacheKey -Asset $asset
  }
  return $asset
}

function Download-AvatarAsset {
  param(
    [Parameter(Mandatory = $true)]$Post,
    [Parameter(Mandatory = $true)][string]$OutputDirectory,
    [Parameter(Mandatory = $true)][hashtable]$AssetIndex
  )
  $avatarUrl = [string]$Post.authorAvatar
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
    $Post.authorAvatarPath = $AssetIndex[$avatarUrl].path
    return $AssetIndex[$avatarUrl]
  }
  try {
    $download = Invoke-HttpBytes -Uri $avatarUrl -Headers @{}
    $normalizedAsset = Normalize-ArchiveImageAsset -Bytes $download.Bytes -ContentType $download.ContentType
    $extension = Get-AssetExtensionFromMimeType -MimeType $normalizedAsset.ContentType
    $slug = ([string]$Post.authorHandle, [string]$Post.authorDid -join "-").Replace(":", "-").Replace("/", "-")
    $slug = ($slug -replace "[^\w.-]+", "-").Trim("-")
    if ([string]::IsNullOrWhiteSpace($slug)) {
      $slug = "account"
    }
    $relativePath = "avatars/$slug.$extension"
    $asset = Save-ByteAsset -OutputDirectory $OutputDirectory -RelativePath $relativePath -Bytes $normalizedAsset.Bytes -ContentType $normalizedAsset.ContentType
    $AssetIndex[$avatarUrl] = $asset
    $Post.authorAvatarPath = $asset.path
    return $asset
  } catch {
    Write-Info "Skipping avatar download for $($Post.authorHandle): $($_.Exception.Message)"
    return $null
  }
}

function Download-BlobAsset {
  param(
    [Parameter(Mandatory = $true)]$SessionState,
    [Parameter(Mandatory = $true)][string]$Did,
    [Parameter(Mandatory = $true)][string]$Cid
  )
  $pds = Resolve-PdsForDid -Did $Did
  $uri = "$pds/xrpc/com.atproto.sync.getBlob?did=$([Uri]::EscapeDataString($Did))&cid=$([Uri]::EscapeDataString($Cid))"
  $retrySettings = $SessionState.WaitSettings.RetryFallbacksMs
  for ($attempt = 0; $attempt -lt 2; $attempt += 1) {
    $headers = @{
      Authorization = "Bearer $($SessionState.Session.accessJwt)"
    }
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

function Get-WorkingPaths {
  param([Parameter(Mandatory = $true)][string]$OutputDirectory)
  $metaDir = Join-Path $OutputDirectory "_meta"
  $workDir = Join-Path $OutputDirectory "_work"
  return [ordered]@{
    MetaDir = $metaDir
    WorkDir = $workDir
    RunStatePath = Join-Path $workDir "run-state.json"
    WorkingPostsPath = Join-Path $workDir "posts.ndjson"
    MetricsDeltaPath = Join-Path $workDir "metrics.ndjson"
    AvatarDeltaPath = Join-Path $workDir "avatars.ndjson"
    MediaDeltaPath = Join-Path $workDir "media.ndjson"
    FinalManifestPath = Join-Path $OutputDirectory "manifest.json"
    FinalPostsPath = Join-Path $OutputDirectory "posts.json"
    FinalSessionPath = Join-Path $metaDir "session-state.json"
  }
}

function Ensure-WorkingLayout {
  param([Parameter(Mandatory = $true)]$Paths)
  Ensure-Directory -Path $Paths.MetaDir
  Ensure-Directory -Path $Paths.WorkDir
}

function Write-RunState {
  param(
    [Parameter(Mandatory = $true)]$Paths,
    [Parameter(Mandatory = $true)]$State
  )
  Ensure-WorkingLayout -Paths $Paths
  Write-JsonFileUtf8 -Path $Paths.RunStatePath -Value $State
}

function Load-RunState {
  param([Parameter(Mandatory = $true)]$Paths)
  if (-not (Test-Path $Paths.RunStatePath)) {
    return $null
  }
  return ConvertTo-PlainValue -Value (Read-JsonFileUtf8 -Path $Paths.RunStatePath)
}

function Test-ArchiveStateExists {
  param([Parameter(Mandatory = $true)]$Paths)
  return (Test-Path $Paths.RunStatePath) -or ((Test-Path $Paths.FinalManifestPath) -and (Test-Path $Paths.FinalPostsPath))
}

function Test-WorkingArchiveStateExists {
  param([Parameter(Mandatory = $true)]$Paths)
  return (Test-Path $Paths.RunStatePath) -and (Test-Path $Paths.WorkingPostsPath)
}

function Initialize-RunState {
  param(
    [Parameter(Mandatory = $true)][string]$Service,
    [Parameter(Mandatory = $true)][hashtable]$Filters,
    [Parameter(Mandatory = $true)][string]$SourceDid,
    [Parameter(Mandatory = $true)][string]$SourceHandle,
    [string]$Warning = ""
  )
  return [ordered]@{
    schemaVersion = 1
    toolVersion = $Script:ToolVersion
    service = $Service
    filters = $Filters
    sourceDid = $SourceDid
    sourceHandle = $SourceHandle
    warning = $Warning
    phase = "fetch"
    status = "running"
    exportedPosts = 0
    imageCount = 0
    skippedImageCount = 0
    pageCount = 0
    nextCursor = ""
    metricsOffset = 0
    avatarOffset = 0
    mediaOffset = 0
    phaseStatus = [ordered]@{
      fetch = "running"
      metrics = "pending"
      avatars = "pending"
      media = "pending"
      finalize = "pending"
      zip = "pending"
    }
    finalizeOffset = 0
    finalizeArrayClosed = $false
    zipOffset = 0
    zipPath = ""
    updatedAt = [DateTimeOffset]::UtcNow.ToString("o")
  }
}

function Append-WorkingPosts {
  param(
    [Parameter(Mandatory = $true)]$Paths,
    [Parameter(Mandatory = $true)]$Posts
  )
  Ensure-WorkingLayout -Paths $Paths
  Append-NdjsonEntries -Path $Paths.WorkingPostsPath -Entries $Posts
}

function Rewrite-NdjsonFile {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)]$Entries,
    [string]$Label = "ndjson file"
  )
  $directory = [System.IO.Path]::GetDirectoryName($Path)
  if ($directory) {
    Ensure-Directory -Path $directory
  }
  $tempPath = "$Path.tmp"
  if (Test-Path -LiteralPath $tempPath) {
    Remove-Item -LiteralPath $tempPath -Force
  }
  $utf8 = [System.Text.UTF8Encoding]::new($false)
  $stream = [System.IO.File]::Open($tempPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
  $writer = New-Object System.IO.StreamWriter($stream, $utf8)
  try {
    foreach ($entry in @($Entries)) {
      $writer.WriteLine(($entry | ConvertTo-Json -Compress -Depth 100))
    }
  } finally {
    $writer.Dispose()
    $stream.Dispose()
  }
  Move-Item -LiteralPath $tempPath -Destination $Path -Force
  Write-Info "$Label rewritten in compact form."
}

function Append-NdjsonEntries {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)]$Entries
  )
  $utf8 = [System.Text.UTF8Encoding]::new($false)
  $stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::Append, [System.IO.FileAccess]::Write, [System.IO.FileShare]::Read)
  $writer = New-Object System.IO.StreamWriter($stream, $utf8)
  try {
    foreach ($entry in @($Entries)) {
      $writer.WriteLine(($entry | ConvertTo-Json -Compress -Depth 100))
    }
  } finally {
    $writer.Dispose()
    $stream.Dispose()
  }
}

function Load-WorkingPosts {
  param([Parameter(Mandatory = $true)]$Paths)
  return Load-NdjsonEntries -Path $Paths.WorkingPostsPath -Label "working post store" -ProgressByBytes
}

function Invoke-NdjsonEntries {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [string]$Label = "ndjson store",
    [switch]$ProgressByBytes,
    [Parameter(Mandatory = $true)][scriptblock]$OnEntry
  )
  if (-not (Test-Path $Path)) {
    return 0
  }
  $fileInfo = Get-Item -LiteralPath $Path
  $totalBytes = [double]$fileInfo.Length
  $nextProgressMark = 0.1
  $processedCount = 0
  Write-Info "Opening $Label at $Path"
  $utf8 = [System.Text.UTF8Encoding]::new($false)
  $stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
  $reader = New-Object System.IO.StreamReader($stream, $utf8, $true)
  try {
    while (-not $reader.EndOfStream) {
      $line = $reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($line)) {
        continue
      }
      $entry = ConvertFrom-Json -InputObject $line
      $processedCount += 1
      & $OnEntry $entry $processedCount
      if ($ProgressByBytes -and $totalBytes -gt 0) {
        $progress = $stream.Position / $totalBytes
        if ($progress -ge $nextProgressMark) {
          $percent = [int][Math]::Min(100, [Math]::Floor($progress * 100))
          Write-Info "Loading ${Label}: $percent% ($processedCount entries reconstructed)"
          $nextProgressMark += 0.1
        }
      }
    }
  } finally {
    $reader.Dispose()
    $stream.Dispose()
  }
  Write-Info "$Label loaded: $processedCount entries reconstructed."
  return $processedCount
}

function Load-NdjsonEntries {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [string]$Label = "ndjson store",
    [switch]$ProgressByBytes
  )
  if (-not (Test-Path $Path)) {
    return @()
  }
  $entries = New-Object System.Collections.Generic.List[object]
  Invoke-NdjsonEntries -Path $Path -Label $Label -ProgressByBytes:$ProgressByBytes -OnEntry {
    param($entry)
    $entries.Add($entry)
  } | Out-Null
  return $entries.ToArray()
}

function ConvertTo-FinalArchivePost {
  param([Parameter(Mandatory = $true)]$Post)
  $externalCard = Get-ObjectPropertyValue -Object $Post -Name "externalCard" -Default $null
  $finalExternalCard = $null
  if ($null -ne $externalCard) {
    $finalExternalCard = [ordered]@{
      url = [string](Get-ObjectPropertyValue -Object $externalCard -Name "url" -Default "")
      title = [string](Get-ObjectPropertyValue -Object $externalCard -Name "title" -Default "")
      description = [string](Get-ObjectPropertyValue -Object $externalCard -Name "description" -Default "")
      thumb = [string](Get-ObjectPropertyValue -Object $externalCard -Name "thumb" -Default "")
      thumbPath = [string](Get-ObjectPropertyValue -Object $externalCard -Name "thumbPath" -Default "")
      thumbLoadFailed = [bool](Get-ObjectPropertyValue -Object $externalCard -Name "thumbLoadFailed" -Default $false)
      thumbLoadAttempts = [int](Get-ObjectPropertyValue -Object $externalCard -Name "thumbLoadAttempts" -Default 0)
    }
  }
  return [ordered]@{
    uri = [string]$Post.uri
    cid = [string]$Post.cid
    rkey = [string]$Post.rkey
    createdAt = [string]$Post.createdAt
    text = [string]$Post.text
    langs = @($Post.langs)
    facets = @($Post.facets)
    reply = $Post.reply
    thread = $Post.thread
    counts = $Post.counts
    permalink = [string]$Post.permalink
    authorHandle = [string]$Post.authorHandle
    authorDisplayName = [string]$Post.authorDisplayName
    authorDid = [string]$Post.authorDid
    authorAvatar = [string]$Post.authorAvatar
    authorAvatarPath = [string]$Post.authorAvatarPath
    externalCard = $finalExternalCard
    images = @($Post.images)
  }
}

function Initialize-FinalPostsJsonFile {
  param(
    [Parameter(Mandatory = $true)]$Paths,
    [int]$Offset = 0
  )
  $utf8 = [System.Text.UTF8Encoding]::new($false)
  if ($Offset -le 0) {
    [System.IO.File]::WriteAllText($Paths.FinalPostsPath, "[", $utf8)
    return
  }
  if (-not (Test-Path $Paths.FinalPostsPath)) {
    throw "Final posts.json is missing although finalizeOffset is already greater than zero."
  }
}

function Close-FinalPostsJsonFile {
  param([Parameter(Mandatory = $true)]$Paths)
  $utf8 = [System.Text.UTF8Encoding]::new($false)
  $stream = [System.IO.File]::Open($Paths.FinalPostsPath, [System.IO.FileMode]::Append, [System.IO.FileAccess]::Write, [System.IO.FileShare]::Read)
  $writer = New-Object System.IO.StreamWriter($stream, $utf8)
  try {
    $writer.Write("`n]")
  } finally {
    $writer.Dispose()
    $stream.Dispose()
  }
}

function Write-FinalArchiveMeta {
  param(
    [Parameter(Mandatory = $true)]$Paths,
    [Parameter(Mandatory = $true)]$Manifest,
    [Parameter(Mandatory = $true)]$SessionState
  )
  Ensure-WorkingLayout -Paths $Paths
  Write-Info "Writing final manifest.json"
  Write-JsonFileUtf8 -Path $Paths.FinalManifestPath -Value $Manifest
  Write-Info "Writing final session-state.json"
  Write-JsonFileUtf8 -Path $Paths.FinalSessionPath -Value (Get-PersistedSessionState -SessionState $SessionState)
  Write-Info "Final archive files written."
}

function Get-PersistedSessionState {
  param([Parameter(Mandatory = $true)]$SessionState)
  return [ordered]@{
    Service = $SessionState.Service
    WaitSettings = $SessionState.WaitSettings
    Session = $SessionState.Session
  }
}

function Apply-MetricsDeltaEntries {
  param(
    [Parameter(Mandatory = $true)]$Entries,
    [Parameter(Mandatory = $true)][hashtable]$PostIndex
  )
  $entryArray = @($Entries)
  $totalEntries = $entryArray.Count
  $progressEvery = Get-ProgressInterval -Total $totalEntries -TargetUpdates 20
  Write-Info "Applying metrics delta entries: $totalEntries items."
  for ($entryIndex = 0; $entryIndex -lt $totalEntries; $entryIndex += 1) {
    $entry = $entryArray[$entryIndex]
    Write-ProgressStep -Label "Applying metrics delta" -Current ($entryIndex + 1) -Total $totalEntries -Every $progressEvery
    $uri = [string](Get-ObjectPropertyValue -Object $entry -Name "uri" -Default "")
    if ([string]::IsNullOrWhiteSpace($uri) -or -not $PostIndex.ContainsKey($uri)) {
      continue
    }
    $post = $PostIndex[$uri]
    $counts = Get-ObjectPropertyValue -Object $entry -Name "counts" -Default $null
    if ($null -ne $counts) {
      Set-ObjectPropertyValue -Object $post -Name "counts" -Value $counts
    }
    foreach ($field in @("authorAvatar", "authorHandle", "authorDisplayName", "authorDid")) {
      $value = [string](Get-ObjectPropertyValue -Object $entry -Name $field -Default "")
      if (-not [string]::IsNullOrWhiteSpace($value)) {
        Set-ObjectPropertyValue -Object $post -Name $field -Value $value
      }
    }
  }
  Write-Info "Metrics delta apply finished."
}

function Apply-MetricsDeltaFromPath {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][hashtable]$PostIndex
  )
  if (-not (Test-Path $Path)) {
    return
  }
  $fileInfo = Get-Item -LiteralPath $Path
  $totalBytes = [double]$fileInfo.Length
  $nextProgressMark = 0.1
  Write-Info "Applying metrics delta entries from stream."
  Write-Info "Opening metrics delta store at $Path"
  $processedCount = 0
  $utf8 = [System.Text.UTF8Encoding]::new($false)
  $stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
  $reader = New-Object System.IO.StreamReader($stream, $utf8, $true)
  $regex = New-Object System.Text.RegularExpressions.Regex '"uri":"(?<uri>[^"]+)".*?"likeCount":(?<like>\d+),"replyCount":(?<reply>\d+),"repostCount":(?<repost>\d+),"quoteCount":(?<quote>\d+)' 
  try {
    while (-not $reader.EndOfStream) {
      $line = $reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($line)) {
        return
      }
      $processedCount += 1
      $match = $regex.Match($line)
      if ($match.Success) {
        $uri = $match.Groups["uri"].Value
        if (-not [string]::IsNullOrWhiteSpace($uri) -and $PostIndex.ContainsKey($uri)) {
          $post = $PostIndex[$uri]
          Set-ObjectPropertyValue -Object $post -Name "counts" -Value ([pscustomobject]@{
            likeCount = [int]$match.Groups["like"].Value
            replyCount = [int]$match.Groups["reply"].Value
            repostCount = [int]$match.Groups["repost"].Value
            quoteCount = [int]$match.Groups["quote"].Value
          })
        }
      }
      if ($totalBytes -gt 0) {
        $progress = $stream.Position / $totalBytes
        if ($progress -ge $nextProgressMark) {
          $percent = [int][Math]::Min(100, [Math]::Floor($progress * 100))
          Write-Info "Applying metrics delta: $percent% ($processedCount entries processed)"
          $nextProgressMark += 0.1
        }
      }
    }
  } finally {
    $reader.Dispose()
    $stream.Dispose()
  }
  Write-Info "metrics delta store loaded: $processedCount entries reconstructed."
  Write-Info "Metrics delta apply finished ($processedCount entries processed)."
}

function Apply-AvatarDeltaEntries {
  param(
    [Parameter(Mandatory = $true)]$Entries,
    [Parameter(Mandatory = $true)][hashtable]$PostIndex,
    [hashtable]$AssetIndex = $null
  )
  $entryArray = @($Entries)
  $totalEntries = $entryArray.Count
  $progressEvery = Get-ProgressInterval -Total $totalEntries -TargetUpdates 20
  Write-Info "Applying avatar delta entries: $totalEntries items."
  for ($entryIndex = 0; $entryIndex -lt $totalEntries; $entryIndex += 1) {
    $entry = $entryArray[$entryIndex]
    Write-ProgressStep -Label "Applying avatar delta" -Current ($entryIndex + 1) -Total $totalEntries -Every $progressEvery
    $uri = [string](Get-ObjectPropertyValue -Object $entry -Name "uri" -Default "")
    if ([string]::IsNullOrWhiteSpace($uri) -or -not $PostIndex.ContainsKey($uri)) {
      continue
    }
    $path = [string](Get-ObjectPropertyValue -Object $entry -Name "authorAvatarPath" -Default "")
    if (-not [string]::IsNullOrWhiteSpace($path)) {
      Set-ObjectPropertyValue -Object $PostIndex[$uri] -Name "authorAvatarPath" -Value $path
    }
    if ($null -ne $AssetIndex) {
      $avatarUrl = [string](Get-ObjectPropertyValue -Object $entry -Name "authorAvatar" -Default "")
      if (-not [string]::IsNullOrWhiteSpace($avatarUrl) -and -not [string]::IsNullOrWhiteSpace($path)) {
        $AssetIndex[$avatarUrl] = [ordered]@{
          path = $path.Replace("\", "/")
          type = "application/octet-stream"
          sizeBytes = 0
        }
      }
    }
  }
  Write-Info "Avatar delta apply finished."
}

function Apply-AvatarDeltaFromPath {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][hashtable]$PostIndex,
    [hashtable]$AssetIndex = $null
  )
  if (-not (Test-Path $Path)) {
    return
  }
  $fileInfo = Get-Item -LiteralPath $Path
  $totalBytes = [double]$fileInfo.Length
  $nextProgressMark = 0.1
  Write-Info "Applying avatar delta entries from stream."
  Write-Info "Opening avatar delta store at $Path"
  $processedCount = 0
  $utf8 = [System.Text.UTF8Encoding]::new($false)
  $stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
  $reader = New-Object System.IO.StreamReader($stream, $utf8, $true)
  $regex = New-Object System.Text.RegularExpressions.Regex '"uri":"(?<uri>[^"]+)".*?"authorAvatarPath":"(?<path>[^"]*)"'
  try {
    while (-not $reader.EndOfStream) {
      $line = $reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($line)) {
        continue
      }
      $processedCount += 1
      $match = $regex.Match($line)
      if ($match.Success) {
        $uri = $match.Groups["uri"].Value
        $pathValue = $match.Groups["path"].Value
        if (-not [string]::IsNullOrWhiteSpace($uri) -and $PostIndex.ContainsKey($uri)) {
          $post = $PostIndex[$uri]
          if (-not [string]::IsNullOrWhiteSpace($pathValue)) {
            Set-ObjectPropertyValue -Object $post -Name "authorAvatarPath" -Value $pathValue
          }
          if ($null -ne $AssetIndex) {
            $avatarUrl = [string](Get-ObjectPropertyValue -Object $post -Name "authorAvatar" -Default "")
            if (-not [string]::IsNullOrWhiteSpace($avatarUrl) -and -not [string]::IsNullOrWhiteSpace($pathValue)) {
              $AssetIndex[$avatarUrl] = [ordered]@{
                path = $pathValue.Replace("\", "/")
                type = "application/octet-stream"
                sizeBytes = 0
              }
            }
          }
        }
      }
      if ($totalBytes -gt 0) {
        $progress = $stream.Position / $totalBytes
        if ($progress -ge $nextProgressMark) {
          $percent = [int][Math]::Min(100, [Math]::Floor($progress * 100))
          Write-Info "Applying avatar delta: $percent% ($processedCount entries processed)"
          $nextProgressMark += 0.1
        }
      }
    }
  } finally {
    $reader.Dispose()
    $stream.Dispose()
  }
  Write-Info "avatar delta store loaded: $processedCount entries reconstructed."
  Write-Info "Avatar delta apply finished ($processedCount entries processed)."
}

function Apply-MediaDeltaEntries {
  param(
    [Parameter(Mandatory = $true)]$Entries,
    [Parameter(Mandatory = $true)][hashtable]$PostIndex,
    [hashtable]$AssetIndex = $null
  )
  $entryArray = @($Entries)
  $totalEntries = $entryArray.Count
  $progressEvery = Get-ProgressInterval -Total $totalEntries -TargetUpdates 20
  Write-Info "Applying media delta entries: $totalEntries items."
  for ($entryIndex = 0; $entryIndex -lt $totalEntries; $entryIndex += 1) {
    $entry = $entryArray[$entryIndex]
    Write-ProgressStep -Label "Applying media delta" -Current ($entryIndex + 1) -Total $totalEntries -Every $progressEvery
    $uri = [string](Get-ObjectPropertyValue -Object $entry -Name "uri" -Default "")
    if ([string]::IsNullOrWhiteSpace($uri) -or -not $PostIndex.ContainsKey($uri)) {
      continue
    }
    $post = $PostIndex[$uri]
    Set-ObjectPropertyValue -Object $post -Name "images" -Value @(Get-ObjectPropertyValue -Object $entry -Name "images" -Default @())
    $externalCard = Get-ObjectPropertyValue -Object $entry -Name "externalCard" -Default $null
    if ($null -ne $externalCard) {
      Set-ObjectPropertyValue -Object $post -Name "externalCard" -Value $externalCard
    }
    Set-ObjectPropertyValue -Object $post -Name "mediaSkippedCount" -Value ([int](Get-ObjectPropertyValue -Object $entry -Name "mediaSkippedCount" -Default 0))
    if ($null -ne $AssetIndex) {
      foreach ($image in @(Get-ObjectPropertyValue -Object $entry -Name "images" -Default @())) {
        $sourceDid = [string](Get-ObjectPropertyValue -Object $image -Name "sourceDid" -Default "")
        $sourceCid = [string](Get-ObjectPropertyValue -Object $image -Name "sourceCid" -Default "")
        $path = [string](Get-ObjectPropertyValue -Object $image -Name "path" -Default "")
        $mimeType = [string](Get-ObjectPropertyValue -Object $image -Name "mimeType" -Default "application/octet-stream")
        $cacheKey = Get-BlobAssetCacheKey -Did $sourceDid -Cid $sourceCid
        if (-not [string]::IsNullOrWhiteSpace($cacheKey) -and -not [string]::IsNullOrWhiteSpace($path)) {
          $AssetIndex[$cacheKey] = [ordered]@{
            path = $path.Replace("\", "/")
            type = $mimeType
            sizeBytes = [int64](Get-ObjectPropertyValue -Object $image -Name "sizeBytes" -Default 0)
          }
        }
      }
      if ($null -ne $externalCard) {
        $thumbPath = [string](Get-ObjectPropertyValue -Object $externalCard -Name "thumbPath" -Default "")
        $thumbUrl = [string](Get-ObjectPropertyValue -Object $externalCard -Name "thumb" -Default "")
        $thumbCid = [string](Get-ObjectPropertyValue -Object $externalCard -Name "thumbCid" -Default "")
        $thumbCacheKey = if (-not [string]::IsNullOrWhiteSpace($thumbCid)) {
          Get-BlobAssetCacheKey -Did ([string](Get-ObjectPropertyValue -Object $post -Name "authorDid" -Default "")) -Cid $thumbCid
        } else {
          Get-UrlAssetCacheKey -Url $thumbUrl
        }
        if (-not [string]::IsNullOrWhiteSpace($thumbCacheKey) -and -not [string]::IsNullOrWhiteSpace($thumbPath)) {
          $AssetIndex[$thumbCacheKey] = [ordered]@{
            path = $thumbPath.Replace("\", "/")
            type = "application/octet-stream"
            sizeBytes = 0
          }
        }
      }
    }
  }
  Write-Info "Media delta apply finished."
}

function Apply-MediaDeltaFromPath {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][hashtable]$PostIndex,
    [hashtable]$AssetIndex = $null
  )
  Write-Info "Applying media delta entries from stream."
  $processedCount = Invoke-NdjsonEntries -Path $Path -Label "media delta store" -ProgressByBytes -OnEntry {
    param($entry, $entryNumber)
    $uri = [string](Get-ObjectPropertyValue -Object $entry -Name "uri" -Default "")
    if ([string]::IsNullOrWhiteSpace($uri) -or -not $PostIndex.ContainsKey($uri)) {
      return
    }
    $post = $PostIndex[$uri]
    Set-ObjectPropertyValue -Object $post -Name "images" -Value @(Get-ObjectPropertyValue -Object $entry -Name "images" -Default @())
    $externalCard = Get-ObjectPropertyValue -Object $entry -Name "externalCard" -Default $null
    if ($null -ne $externalCard) {
      Set-ObjectPropertyValue -Object $post -Name "externalCard" -Value $externalCard
    }
    Set-ObjectPropertyValue -Object $post -Name "mediaSkippedCount" -Value ([int](Get-ObjectPropertyValue -Object $entry -Name "mediaSkippedCount" -Default 0))
    if ($null -ne $AssetIndex) {
      foreach ($image in @(Get-ObjectPropertyValue -Object $entry -Name "images" -Default @())) {
        $sourceDid = [string](Get-ObjectPropertyValue -Object $image -Name "sourceDid" -Default "")
        $sourceCid = [string](Get-ObjectPropertyValue -Object $image -Name "sourceCid" -Default "")
        $pathValue = [string](Get-ObjectPropertyValue -Object $image -Name "path" -Default "")
        $mimeType = [string](Get-ObjectPropertyValue -Object $image -Name "mimeType" -Default "application/octet-stream")
        $cacheKey = Get-BlobAssetCacheKey -Did $sourceDid -Cid $sourceCid
        if (-not [string]::IsNullOrWhiteSpace($cacheKey) -and -not [string]::IsNullOrWhiteSpace($pathValue)) {
          $AssetIndex[$cacheKey] = [ordered]@{
            path = $pathValue.Replace("\", "/")
            type = $mimeType
            sizeBytes = [int64](Get-ObjectPropertyValue -Object $image -Name "sizeBytes" -Default 0)
          }
        }
      }
      if ($null -ne $externalCard) {
        $thumbPath = [string](Get-ObjectPropertyValue -Object $externalCard -Name "thumbPath" -Default "")
        $thumbUrl = [string](Get-ObjectPropertyValue -Object $externalCard -Name "thumb" -Default "")
        $thumbCid = [string](Get-ObjectPropertyValue -Object $externalCard -Name "thumbCid" -Default "")
        $thumbCacheKey = if (-not [string]::IsNullOrWhiteSpace($thumbCid)) {
          Get-BlobAssetCacheKey -Did ([string](Get-ObjectPropertyValue -Object $post -Name "authorDid" -Default "")) -Cid $thumbCid
        } else {
          Get-UrlAssetCacheKey -Url $thumbUrl
        }
        if (-not [string]::IsNullOrWhiteSpace($thumbCacheKey) -and -not [string]::IsNullOrWhiteSpace($thumbPath)) {
          $AssetIndex[$thumbCacheKey] = [ordered]@{
            path = $thumbPath.Replace("\", "/")
            type = "application/octet-stream"
            sizeBytes = 0
          }
        }
      }
    }
  }
  Write-Info "Media delta apply finished ($processedCount entries processed)."
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
    appVersion = "powershell-archiver/$($Script:ToolVersion)"
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
  $files = Get-ChildItem -LiteralPath $sourceRoot -Recurse -File | Where-Object {
    $fullName = [System.IO.Path]::GetFullPath($_.FullName)
    $relativePath = $fullName.Substring($sourceRoot.Length).TrimStart('\', '/')
    $normalized = $relativePath.Replace('\', '/')
    if ([string]::IsNullOrWhiteSpace($normalized)) {
      return $false
    }
    return -not ($normalized -like '_work/*')
  }
  return @($files | Sort-Object FullName)
}

function Write-ArchiveZip {
  param(
    [Parameter(Mandatory = $true)][string]$SourceDirectory,
    [Parameter(Mandatory = $true)][string]$ZipPath,
    [int]$StartIndex = 0,
    [scriptblock]$OnProgress = $null
  )
  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $fileArray = @(Get-ZipExportFiles -SourceDirectory $SourceDirectory)
  $totalFiles = $fileArray.Count
  $progressEvery = Get-ProgressInterval -Total $totalFiles -TargetUpdates 20
  if ($StartIndex -le 0 -and (Test-Path $ZipPath)) {
    Remove-Item -LiteralPath $ZipPath -Force
  }
  $mode = if ($StartIndex -gt 0 -and (Test-Path $ZipPath)) { [System.IO.Compression.ZipArchiveMode]::Update } else { [System.IO.Compression.ZipArchiveMode]::Create }
  $sourceRoot = [System.IO.Path]::GetFullPath($SourceDirectory)
  $zipArchive = [System.IO.Compression.ZipFile]::Open($ZipPath, $mode)
  try {
    Write-Info "Packing ZIP payload: $totalFiles files."
    for ($fileIndex = $StartIndex; $fileIndex -lt $totalFiles; $fileIndex += 1) {
      $displayIndex = $fileIndex + 1
      Write-ProgressStep -Label "ZIP files" -Current $displayIndex -Total $totalFiles -Every $progressEvery
      $file = $fileArray[$fileIndex]
      $fullName = [System.IO.Path]::GetFullPath($file.FullName)
      $relativePath = $fullName.Substring($sourceRoot.Length).TrimStart('\', '/').Replace('\', '/')
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zipArchive, $fullName, $relativePath, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
      if ($null -ne $OnProgress) {
        & $OnProgress $displayIndex $totalFiles
      }
    }
    Write-Info "ZIP payload assembled."
  } finally {
    $zipArchive.Dispose()
  }
  return $totalFiles
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
$resolvedCreateZip = if ($PSBoundParameters.ContainsKey("CreateZip")) { $CreateZip.IsPresent } else { [bool](Get-ConfigValue -Config $config -Name "createZip" -Default $false) }

if ([string]::IsNullOrWhiteSpace($resolvedOutputDirectory)) {
  throw "OutputDirectory is required."
}

$resolvedOutputDirectory = [System.IO.Path]::GetFullPath($resolvedOutputDirectory)
Ensure-Directory -Path $resolvedOutputDirectory
$workingPaths = Get-WorkingPaths -OutputDirectory $resolvedOutputDirectory
Ensure-WorkingLayout -Paths $workingPaths

if ($CompactWorkingState) {
  if (-not (Test-WorkingArchiveStateExists -Paths $workingPaths)) {
    throw "No existing working archive state was found in '$resolvedOutputDirectory'."
  }
  Invoke-CompactWorkingPostStore -Paths $workingPaths
  return
}

if ([string]::IsNullOrWhiteSpace($resolvedIdentifier)) {
  throw "Identifier is required."
}
if ([string]::IsNullOrWhiteSpace($resolvedAppPassword)) {
  throw "AppPassword is required."
}

$hasExistingArchiveState = Test-ArchiveStateExists -Paths $workingPaths
if ($Resume) {
  if (-not (Test-WorkingArchiveStateExists -Paths $workingPaths)) {
    throw "No existing archive state was found in '$resolvedOutputDirectory'. Start without -Resume to create a new archive."
  }
} elseif ($hasExistingArchiveState) {
  throw "Existing archive state found in '$resolvedOutputDirectory'. Use -Resume to continue that archive or choose a different outputDirectory."
}

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
  $warning = "This first PowerShell version currently maps contentMode '$resolvedContentMode' to the base post selection logic."
}
if ($resolvedIncludeConversationContext) {
  if ($warning) {
    $warning += " "
  }
  $warning += "includeConversationContext is stored in the manifest but not expanded yet by this first PowerShell version."
}

$runState = Initialize-RunState -Service $resolvedService -Filters $filters -SourceDid $sourceDid -SourceHandle $sourceHandle -Warning $warning
$runState["nextCursor"] = ""
$runState["pageCount"] = 0
$runState["exportedPosts"] = 0
$runState["updatedAt"] = [DateTimeOffset]::UtcNow.ToString("o")

$sessionFileState = $null
$postIndex = @{}
$posts = New-Object System.Collections.Generic.List[object]
$assetIndex = @{}
$cursor = ""
$pageCount = 0

if ($Resume) {
  Write-Info "Loading existing archive state from disk."
  $loadedRunState = Load-RunState -Paths $workingPaths
  if (-not $loadedRunState) {
    throw "Existing archive state was detected in '$resolvedOutputDirectory', but _work\\run-state.json could not be loaded."
  }
  $runState = $loadedRunState
  Write-Info "Resuming from existing checkpoint."
  Write-Info "Streaming working post store into memory and rebuilding post index."
  $reconstructedImageCount = 0
  $reconstructedSkippedImageCount = 0
  $workingPostNeedsCompaction = $false
  $workingPostProgressState = [ordered]@{
    nextMark = 5000
  }
  $loadedPostTotal = Invoke-NdjsonEntries -Path $workingPaths.WorkingPostsPath -Label "working post store" -ProgressByBytes -OnEntry {
    param($post, $entryNumber)
    if ($entryNumber -eq 1 -or $entryNumber -ge $workingPostProgressState.nextMark) {
      $message = "[threadline-archiver] Rebuilding post index $entryNumber posts loaded"
      $paddingLength = [Math]::Max(0, $Script:ProgressInlineLength - $message.Length)
      $padding = if ($paddingLength -gt 0) { " " * $paddingLength } else { "" }
      Write-Host -NoNewline ("`r" + $message + $padding)
      $Script:ProgressInlineActive = $true
      $Script:ProgressInlineLength = $message.Length
      $workingPostProgressState.nextMark = $entryNumber + 5000
    }
    $externalCard = Get-ObjectPropertyValue -Object $post -Name "externalCard" -Default $null
    if ($Post.PSObject.Properties["rawRecord"] -or (($null -ne $externalCard) -and (Get-ObjectPropertyValue -Object $externalCard -Name "thumbRef" -Default $null))) {
      $workingPostNeedsCompaction = $true
    }
    Normalize-ArchivePostForWorkingState -Post $post
    $posts.Add($post)
    $postIndex[[string]$post.uri] = $post
    $reconstructedImageCount += @((Get-ObjectPropertyValue -Object $post -Name "images" -Default @())).Count
    $reconstructedSkippedImageCount += [int](Get-ObjectPropertyValue -Object $post -Name "mediaSkippedCount" -Default 0)
  }
  if ($Script:ProgressInlineActive) {
    Write-Host ""
    $Script:ProgressInlineActive = $false
    $Script:ProgressInlineLength = 0
  }
  Write-Info "Post index rebuilt from checkpoint: $loadedPostTotal posts."
  if ($workingPostNeedsCompaction) {
    Write-Info "Existing working post store still uses the older heavy format. Rewriting compact posts.ndjson for future resumes."
    Rewrite-NdjsonFile -Path $workingPaths.WorkingPostsPath -Entries ($posts.ToArray()) -Label "working post store"
  }
  Apply-MetricsDeltaFromPath -Path $workingPaths.MetricsDeltaPath -PostIndex $postIndex
  Apply-AvatarDeltaFromPath -Path $workingPaths.AvatarDeltaPath -PostIndex $postIndex -AssetIndex $assetIndex
  Apply-MediaDeltaFromPath -Path $workingPaths.MediaDeltaPath -PostIndex $postIndex -AssetIndex $assetIndex
  Write-Info "Cached image counters reconstructed."
  Set-ObjectPropertyValue -Object $runState -Name "imageCount" -Value $reconstructedImageCount
  Set-ObjectPropertyValue -Object $runState -Name "skippedImageCount" -Value $reconstructedSkippedImageCount
  $cursor = [string](Get-ConfigValue -Config $runState -Name "nextCursor" -Default "")
  $pageCount = [int](Get-ConfigValue -Config $runState -Name "pageCount" -Default 0)
  $resumePhase = [string](Get-ConfigValue -Config $runState -Name "phase" -Default "unknown")
  Write-Info "Loaded $($posts.Count) posts from checkpoint. Last recorded phase: $resumePhase. Last fetched page: $pageCount."
} else {
  Write-RunState -Paths $workingPaths -State $runState
}

$useOwnRepo = $sourceDid -eq [string]$sessionState.Session.did
$pageSize = [Math]::Min($Script:DefaultPageSize, [Math]::Max(25, $resolvedMaxPosts))
$stopScan = $false
$phaseStatus = Get-ObjectPropertyValue -Object $runState -Name "phaseStatus" -Default @{}
$fetchAlreadyComplete = [string](Get-ObjectPropertyValue -Object $phaseStatus -Name "fetch" -Default "") -eq "complete"

while ((-not $fetchAlreadyComplete) -and (-not $stopScan) -and $posts.Count -lt $resolvedMaxPosts) {
  $pageSelectedCount = 0
  $pageReplyCount = 0
  $pageThreadStartCount = 0
  $pageMergedCount = 0
  if ($useOwnRepo) {
    $page = Invoke-Atproto -SessionState $sessionState -Endpoint "com.atproto.repo.listRecords" -Query @{
      repo = $sourceDid
      collection = "app.bsky.feed.post"
      limit = $pageSize
      cursor = $cursor
    }
    $cursor = [string](Get-ObjectPropertyValue -Object $page -Name "cursor" -Default "")
    foreach ($entry in @(Get-ObjectPropertyValue -Object $page -Name "records" -Default @())) {
      $record = $entry.value
      $createdAt = [string](Get-ObjectPropertyValue -Object $record -Name "createdAt" -Default "")
      if (Test-ShouldStopScan -CreatedAt $createdAt -Filters $filters) {
        $stopScan = $true
        break
      }
      if (-not (Test-RecordInSelection -Record $record -Filters $filters -SourceDid $sourceDid -FallbackUri ([string]$entry.uri))) {
        continue
      }
      $post = New-ArchivePostEntity -Uri ([string]$entry.uri) -Cid ([string]$entry.cid) -Record $record -AuthorHandle $sourceHandle -AuthorDid $sourceDid -AuthorDisplayName ([string]$sourceProfile.displayName) -AuthorAvatar ([string]$sourceProfile.avatar) -Counts $null
      $pageSelectedCount += 1
      if (Test-ArchivePostIsReply -Post $post) {
        $pageReplyCount += 1
      } else {
        $pageThreadStartCount += 1
      }
      if ($postIndex.ContainsKey($post.uri)) {
        $pageMergedCount += 1
        Merge-ArchivePost -Existing $postIndex[$post.uri] -Incoming $post
      } else {
        $posts.Add($post)
        $postIndex[$post.uri] = $post
      }
      if ($posts.Count -ge $resolvedMaxPosts) {
        break
      }
    }
  } else {
    $query = @{
      actor = $sourceDid
      limit = $pageSize
    }
    if (-not [string]::IsNullOrWhiteSpace($cursor)) {
      $query["cursor"] = $cursor
    }
    $page = Invoke-Atproto -SessionState $sessionState -Endpoint "app.bsky.feed.getAuthorFeed" -Query $query
    $cursor = [string](Get-ObjectPropertyValue -Object $page -Name "cursor" -Default "")
    foreach ($item in @(Get-ObjectPropertyValue -Object $page -Name "feed" -Default @())) {
      $postView = $item.post
      $postAuthor = Get-ObjectPropertyValue -Object $postView -Name "author"
      if ([string](Get-ObjectPropertyValue -Object $postAuthor -Name "did" -Default "") -ne $sourceDid) {
        continue
      }
      $record = $postView.record
      $createdAt = [string](Get-ObjectPropertyValue -Object $record -Name "createdAt" -Default "")
      if (Test-ShouldStopScan -CreatedAt $createdAt -Filters $filters) {
        $stopScan = $true
        break
      }
      if (-not (Test-RecordInSelection -Record $record -Filters $filters -SourceDid $sourceDid -FallbackUri ([string]$postView.uri))) {
        continue
      }
      $counts = @{
        likeCount = [int](Get-ObjectPropertyValue -Object $postView -Name "likeCount" -Default 0)
        replyCount = [int](Get-ObjectPropertyValue -Object $postView -Name "replyCount" -Default 0)
        repostCount = [int](Get-ObjectPropertyValue -Object $postView -Name "repostCount" -Default 0)
        quoteCount = [int](Get-ObjectPropertyValue -Object $postView -Name "quoteCount" -Default 0)
      }
      $post = New-ArchivePostEntity -Uri ([string](Get-ObjectPropertyValue -Object $postView -Name "uri" -Default "")) -Cid ([string](Get-ObjectPropertyValue -Object $postView -Name "cid" -Default "")) -Record $record -AuthorHandle ([string](Get-ObjectPropertyValue -Object $postAuthor -Name "handle" -Default "")) -AuthorDid ([string](Get-ObjectPropertyValue -Object $postAuthor -Name "did" -Default "")) -AuthorDisplayName ([string](Get-ObjectPropertyValue -Object $postAuthor -Name "displayName" -Default "")) -AuthorAvatar ([string](Get-ObjectPropertyValue -Object $postAuthor -Name "avatar" -Default "")) -Counts $counts
      $pageSelectedCount += 1
      if (Test-ArchivePostIsReply -Post $post) {
        $pageReplyCount += 1
      } else {
        $pageThreadStartCount += 1
      }
      if ($postIndex.ContainsKey($post.uri)) {
        $pageMergedCount += 1
        Merge-ArchivePost -Existing $postIndex[$post.uri] -Incoming $post
      } else {
        $posts.Add($post)
        $postIndex[$post.uri] = $post
      }
      if ($posts.Count -ge $resolvedMaxPosts) {
        break
      }
    }
  }

  $pageCount += 1
  $pageNewCount = [Math]::Max(0, $pageSelectedCount - $pageMergedCount)
  Write-Info "Fetched page $pageCount, selected $($posts.Count) posts so far. Page ${pageCount}: $pageSelectedCount selected | $pageNewCount new | $pageThreadStartCount thread starts | $pageReplyCount replies."

  $previousExportedPosts = [int](Get-ConfigValue -Config $runState -Name "exportedPosts" -Default 0)
  $newPostCount = [Math]::Max(0, $posts.Count - $previousExportedPosts)
  $latestPosts = @()
  if ($newPostCount -gt 0) {
    $latestPosts = @($posts | Select-Object -Last $newPostCount)
  }
  if ($latestPosts.Count -gt 0) {
    Append-WorkingPosts -Paths $workingPaths -Posts $latestPosts
  }
  $fetchStatus = if ([string]::IsNullOrWhiteSpace($cursor)) { "completed-fetch" } else { "partial-fetch" }
  $fetchPhaseStatus = if ([string]::IsNullOrWhiteSpace($cursor)) { "complete" } else { "running" }
  Set-ObjectPropertyValue -Object $runState -Name "status" -Value $fetchStatus
  Set-ObjectPropertyValue -Object $runState -Name "nextCursor" -Value $cursor
  Set-ObjectPropertyValue -Object $runState -Name "pageCount" -Value $pageCount
  Set-ObjectPropertyValue -Object $runState -Name "exportedPosts" -Value $posts.Count
  Set-ObjectPropertyValue -Object $runState -Name "phase" -Value "fetch"
  $phaseStatus = Get-ObjectPropertyValue -Object $runState -Name "phaseStatus" -Default ([ordered]@{})
  Set-ObjectPropertyValue -Object $phaseStatus -Name "fetch" -Value $fetchPhaseStatus
  Set-ObjectPropertyValue -Object $runState -Name "phaseStatus" -Value $phaseStatus
  Set-ObjectPropertyValue -Object $runState -Name "updatedAt" -Value ([DateTimeOffset]::UtcNow.ToString("o"))
  Write-RunState -Paths $workingPaths -State $runState

  if ([string]::IsNullOrWhiteSpace($cursor)) {
    break
  }
  Invoke-SoftPauseIfNeeded -PageCount $pageCount -WaitSettings $waitSettings
}

if ($fetchAlreadyComplete) {
  Write-Info "Fetch phase already completed in working state. Skipping network scan."
}

Write-Info "Sorting $($posts.Count) posts by timestamp. This can take a while for large archives."
$orderedPosts = @($posts | Sort-Object { [DateTimeOffset]::Parse($_.createdAt) } -Descending)
Write-Info "Post sorting finished."

if ([string](Get-ObjectPropertyValue -Object $phaseStatus -Name "metrics" -Default "") -ne "complete") {
  Set-ObjectPropertyValue -Object $runState -Name "phase" -Value "metrics"
  Set-ObjectPropertyValue -Object $phaseStatus -Name "metrics" -Value "running"
  Set-ObjectPropertyValue -Object $runState -Name "phaseStatus" -Value $phaseStatus
  Set-ObjectPropertyValue -Object $runState -Name "updatedAt" -Value ([DateTimeOffset]::UtcNow.ToString("o"))
  Write-RunState -Paths $workingPaths -State $runState
  Write-Info "Hydrating metrics for $($orderedPosts.Count) posts."
  $metricsOffset = [Math]::Max(0, [int](Get-ConfigValue -Config $runState -Name "metricsOffset" -Default 0))
  $metricBatchTotal = [int][Math]::Ceiling($orderedPosts.Count / 25)
  $metricBatchNumber = [int][Math]::Floor($metricsOffset / 25)
  for ($offset = $metricsOffset; $offset -lt $orderedPosts.Count; $offset += 25) {
    $metricBatchNumber += 1
    Write-ProgressStep -Label "Hydrating metrics batch" -Current $metricBatchNumber -Total $metricBatchTotal -Every 10
    $batch = @($orderedPosts[$offset..([Math]::Min($offset + 24, $orderedPosts.Count - 1))])
    $response = Invoke-Atproto -SessionState $sessionState -Endpoint "app.bsky.feed.getPosts" -Query @{
      uris = @($batch | ForEach-Object { [string]$_.uri })
    }
    $metricsDeltaBatch = New-Object System.Collections.Generic.List[object]
    foreach ($postView in @($response.posts)) {
      $target = $postIndex[[string]$postView.uri]
      if ($null -eq $target) {
        continue
      }
      $countsValue = [pscustomobject]@{
        likeCount = [int](Get-ObjectPropertyValue -Object $postView -Name "likeCount" -Default 0)
        replyCount = [int](Get-ObjectPropertyValue -Object $postView -Name "replyCount" -Default 0)
        repostCount = [int](Get-ObjectPropertyValue -Object $postView -Name "repostCount" -Default 0)
        quoteCount = [int](Get-ObjectPropertyValue -Object $postView -Name "quoteCount" -Default 0)
      }
      Set-ObjectPropertyValue -Object $target -Name "counts" -Value $countsValue
      $postAuthor = Get-ObjectPropertyValue -Object $postView -Name "author"
      $authorAvatar = Get-ObjectPropertyValue -Object $postAuthor -Name "avatar"
      $authorHandle = Get-ObjectPropertyValue -Object $postAuthor -Name "handle"
      $authorDisplayName = Get-ObjectPropertyValue -Object $postAuthor -Name "displayName"
      $authorDid = Get-ObjectPropertyValue -Object $postAuthor -Name "did"
      if ($authorAvatar) { Set-ObjectPropertyValue -Object $target -Name "authorAvatar" -Value ([string]$authorAvatar) }
      if ($authorHandle) { Set-ObjectPropertyValue -Object $target -Name "authorHandle" -Value ([string]$authorHandle) }
      if ($authorDisplayName) { Set-ObjectPropertyValue -Object $target -Name "authorDisplayName" -Value ([string]$authorDisplayName) }
      if ($authorDid) { Set-ObjectPropertyValue -Object $target -Name "authorDid" -Value ([string]$authorDid) }
      $metricsDeltaBatch.Add([ordered]@{
        uri = [string]$target.uri
        counts = $countsValue
        authorAvatar = [string](Get-ObjectPropertyValue -Object $target -Name "authorAvatar" -Default "")
        authorHandle = [string](Get-ObjectPropertyValue -Object $target -Name "authorHandle" -Default "")
        authorDisplayName = [string](Get-ObjectPropertyValue -Object $target -Name "authorDisplayName" -Default "")
        authorDid = [string](Get-ObjectPropertyValue -Object $target -Name "authorDid" -Default "")
      })
    }
    if ($metricsDeltaBatch.Count -gt 0) {
      Append-NdjsonEntries -Path $workingPaths.MetricsDeltaPath -Entries ($metricsDeltaBatch.ToArray())
    }
    Set-ObjectPropertyValue -Object $runState -Name "metricsOffset" -Value ([Math]::Min($orderedPosts.Count, $offset + $batch.Count))
    Set-ObjectPropertyValue -Object $runState -Name "updatedAt" -Value ([DateTimeOffset]::UtcNow.ToString("o"))
    Write-RunState -Paths $workingPaths -State $runState
  }
  Set-ObjectPropertyValue -Object $phaseStatus -Name "metrics" -Value "complete"
  Set-ObjectPropertyValue -Object $runState -Name "phaseStatus" -Value $phaseStatus
  Set-ObjectPropertyValue -Object $runState -Name "metricsOffset" -Value $orderedPosts.Count
  Set-ObjectPropertyValue -Object $runState -Name "updatedAt" -Value ([DateTimeOffset]::UtcNow.ToString("o"))
  Write-RunState -Paths $workingPaths -State $runState
} else {
  Write-Info "Metrics phase already completed in working state. Skipping metric hydration."
}

$assetList = New-Object System.Collections.Generic.List[object]
$assetPathIndex = @{}
$imageCount = 0
$skippedImageCount = 0

if ([string](Get-ObjectPropertyValue -Object $phaseStatus -Name "avatars" -Default "") -ne "complete") {
  Set-ObjectPropertyValue -Object $runState -Name "phase" -Value "avatars"
  Set-ObjectPropertyValue -Object $phaseStatus -Name "avatars" -Value "running"
  Set-ObjectPropertyValue -Object $runState -Name "phaseStatus" -Value $phaseStatus
  Set-ObjectPropertyValue -Object $runState -Name "updatedAt" -Value ([DateTimeOffset]::UtcNow.ToString("o"))
  Write-RunState -Paths $workingPaths -State $runState
  Write-Info "Downloading avatars for $($orderedPosts.Count) posts."
  $avatarOffset = [Math]::Max(0, [int](Get-ConfigValue -Config $runState -Name "avatarOffset" -Default 0))
  $avatarProgressIndex = $avatarOffset
  $avatarFlushEvery = 250
  $avatarDeltaBatch = New-Object System.Collections.Generic.List[object]
  for ($avatarIndex = $avatarOffset; $avatarIndex -lt $orderedPosts.Count; $avatarIndex += 1) {
    $post = $orderedPosts[$avatarIndex]
    $avatarProgressIndex += 1
    Write-ProgressStep -Label "Avatar pass" -Current $avatarProgressIndex -Total $orderedPosts.Count -Every 50
    $asset = Download-AvatarAsset -Post $post -OutputDirectory $resolvedOutputDirectory -AssetIndex $assetIndex
    Add-AssetToListIfMissing -AssetList $assetList -AssetPathIndex $assetPathIndex -Asset $asset
    $avatarDeltaBatch.Add([ordered]@{
      uri = [string]$post.uri
      authorAvatar = [string](Get-ObjectPropertyValue -Object $post -Name "authorAvatar" -Default "")
      authorAvatarPath = [string](Get-ObjectPropertyValue -Object $post -Name "authorAvatarPath" -Default "")
    }) | Out-Null
    $shouldFlushAvatarState = ($avatarDeltaBatch.Count -ge $avatarFlushEvery) -or ($avatarIndex -eq ($orderedPosts.Count - 1))
    if ($shouldFlushAvatarState) {
      Append-NdjsonEntries -Path $workingPaths.AvatarDeltaPath -Entries ($avatarDeltaBatch.ToArray())
      $avatarDeltaBatch.Clear()
      Set-ObjectPropertyValue -Object $runState -Name "avatarOffset" -Value ($avatarIndex + 1)
      Set-ObjectPropertyValue -Object $runState -Name "updatedAt" -Value ([DateTimeOffset]::UtcNow.ToString("o"))
      Write-RunState -Paths $workingPaths -State $runState
    }
  }
  Set-ObjectPropertyValue -Object $phaseStatus -Name "avatars" -Value "complete"
  Set-ObjectPropertyValue -Object $runState -Name "phaseStatus" -Value $phaseStatus
  Set-ObjectPropertyValue -Object $runState -Name "avatarOffset" -Value $orderedPosts.Count
  Set-ObjectPropertyValue -Object $runState -Name "updatedAt" -Value ([DateTimeOffset]::UtcNow.ToString("o"))
  Write-RunState -Paths $workingPaths -State $runState
  Write-Info "Avatar pass finished."
} else {
  Write-Info "Avatar phase already completed in working state. Skipping avatar downloads."
}

if ([string](Get-ObjectPropertyValue -Object $phaseStatus -Name "media" -Default "") -ne "complete") {
  Set-ObjectPropertyValue -Object $runState -Name "phase" -Value "media"
  Set-ObjectPropertyValue -Object $phaseStatus -Name "media" -Value "running"
  Set-ObjectPropertyValue -Object $runState -Name "phaseStatus" -Value $phaseStatus
  Set-ObjectPropertyValue -Object $runState -Name "updatedAt" -Value ([DateTimeOffset]::UtcNow.ToString("o"))
  Write-RunState -Paths $workingPaths -State $runState
  Write-Info "Downloading embedded images and link-card thumbnails for $($orderedPosts.Count) posts."
  $mediaOffset = [Math]::Max(0, [int](Get-ConfigValue -Config $runState -Name "mediaOffset" -Default 0))
  $imageProgressIndex = $mediaOffset
  $mediaFlushEvery = 100
  $mediaDeltaBatch = New-Object System.Collections.Generic.List[object]
  for ($mediaIndex = $mediaOffset; $mediaIndex -lt $orderedPosts.Count; $mediaIndex += 1) {
    $post = $orderedPosts[$mediaIndex]
    $imageProgressIndex += 1
    Write-ProgressStep -Label "Media pass" -Current $imageProgressIndex -Total $orderedPosts.Count -Every 25
    $images = @(Get-ObjectPropertyValue -Object $post -Name "sourceImages" -Default @())
    $externalCard = $post.externalCard
    $hasThumbCandidate = ($null -ne $externalCard) -and ((-not [string]::IsNullOrWhiteSpace([string](Get-ObjectPropertyValue -Object $externalCard -Name "thumbCid" -Default ""))) -or (-not [string]::IsNullOrWhiteSpace([string]$externalCard.thumb)))
    if ($images.Count -eq 0 -and -not $hasThumbCandidate) {
      Set-ObjectPropertyValue -Object $post -Name "images" -Value @()
      Set-ObjectPropertyValue -Object $post -Name "mediaSkippedCount" -Value 0
      $mediaDeltaBatch.Add([ordered]@{
        uri = [string]$post.uri
        images = @()
        externalCard = $post.externalCard
        mediaSkippedCount = 0
      }) | Out-Null
      $shouldFlushEmptyMediaState = ($mediaDeltaBatch.Count -ge $mediaFlushEvery) -or ($mediaIndex -eq ($orderedPosts.Count - 1))
      if ($shouldFlushEmptyMediaState) {
        Append-NdjsonEntries -Path $workingPaths.MediaDeltaPath -Entries ($mediaDeltaBatch.ToArray())
        $mediaDeltaBatch.Clear()
        Set-ObjectPropertyValue -Object $runState -Name "mediaOffset" -Value ($mediaIndex + 1)
        Set-ObjectPropertyValue -Object $runState -Name "imageCount" -Value $imageCount
        Set-ObjectPropertyValue -Object $runState -Name "skippedImageCount" -Value $skippedImageCount
        Set-ObjectPropertyValue -Object $runState -Name "updatedAt" -Value ([DateTimeOffset]::UtcNow.ToString("o"))
        Write-RunState -Paths $workingPaths -State $runState
      }
      continue
    }
    $collected = @()
    $imageIndex = 0
    $postSkippedImageCount = 0
    foreach ($image in $images) {
      $imageIndex += 1
      $cid = [string](Get-ObjectPropertyValue -Object $image -Name "cid" -Default "")
      if ([string]::IsNullOrWhiteSpace($cid)) {
        $skippedImageCount += 1
        $postSkippedImageCount += 1
        continue
      }
      $imageCacheKey = Get-BlobAssetCacheKey -Did ([string]$post.authorDid) -Cid $cid
      try {
        $asset = Get-CachedAsset -AssetIndex $assetIndex -CacheKey $imageCacheKey -OutputDirectory $resolvedOutputDirectory
        if ($null -eq $asset) {
          $download = Download-BlobAsset -SessionState $sessionState -Did ([string]$post.authorDid) -Cid $cid
          $normalizedAsset = Normalize-ArchiveImageAsset -Bytes $download.Bytes -ContentType $download.ContentType
          $extension = Get-AssetExtensionFromMimeType -MimeType $normalizedAsset.ContentType
          $authorSlug = ([string]$post.authorHandle, [string]$post.authorDid -join "-").Replace(":", "-").Replace("/", "-")
          $authorSlug = ($authorSlug -replace "[^\w.-]+", "-").Trim("-")
          if ([string]::IsNullOrWhiteSpace($authorSlug)) {
            $authorSlug = "author"
          }
          $yearPart = if ($post.createdAt) { ([string]$post.createdAt).Substring(0, 4) } else { "misc" }
          $relativePath = "images/$yearPart/$authorSlug-$($post.rkey)-$imageIndex.$extension"
          $asset = Save-ByteAsset -OutputDirectory $resolvedOutputDirectory -RelativePath $relativePath -Bytes $normalizedAsset.Bytes -ContentType $normalizedAsset.ContentType
          Set-CachedAsset -AssetIndex $assetIndex -CacheKey $imageCacheKey -Asset $asset
        }
        Add-AssetToListIfMissing -AssetList $assetList -AssetPathIndex $assetPathIndex -Asset $asset
        $imageCount += 1
        $collected += [ordered]@{
          path = $asset.path
          alt = [string](Get-ObjectPropertyValue -Object $image -Name "alt" -Default "")
          width = [int](Get-ObjectPropertyValue -Object $image -Name "width" -Default 0)
          height = [int](Get-ObjectPropertyValue -Object $image -Name "height" -Default 0)
          sourceDid = [string]$post.authorDid
          sourceCid = $cid
          remoteUrl = ""
          mimeType = $asset.type
          sizeBytes = $asset.sizeBytes
        }
      } catch {
        $skippedImageCount += 1
        $postSkippedImageCount += 1
        Write-Info "Skipping image for $($post.uri): $($_.Exception.Message)"
      }
    }
    $post.images = $collected
    Set-ObjectPropertyValue -Object $post -Name "mediaSkippedCount" -Value $postSkippedImageCount

    if ($hasThumbCandidate) {
      try {
        $thumbUrl = [string]$externalCard.thumb
        $thumbCid = [string](Get-ObjectPropertyValue -Object $externalCard -Name "thumbCid" -Default "")
        $asset = Try-DownloadLinkCardThumbnailAsset -SessionState $sessionState -Post $post -ThumbCid $thumbCid -ThumbUrl $thumbUrl -OutputDirectory $resolvedOutputDirectory -AssetIndex $assetIndex
        if ($asset) {
          Add-AssetToListIfMissing -AssetList $assetList -AssetPathIndex $assetPathIndex -Asset $asset
          $externalCard.thumbPath = $asset.path
          $externalCard.thumbLoadFailed = $false
          $externalCard.thumbLoadAttempts = 1
        }
      } catch {
        $externalCard.thumbLoadFailed = $true
        $externalCard.thumbLoadAttempts = 1
        Write-Info "Skipping link-card thumbnail for $($post.uri): $($_.Exception.Message)"
      }
    }
    $mediaDeltaBatch.Add([ordered]@{
      uri = [string]$post.uri
      images = @($post.images)
      externalCard = $post.externalCard
      mediaSkippedCount = [int](Get-ObjectPropertyValue -Object $post -Name "mediaSkippedCount" -Default 0)
    }) | Out-Null
    $shouldFlushMediaState = ($mediaDeltaBatch.Count -ge $mediaFlushEvery) -or ($mediaIndex -eq ($orderedPosts.Count - 1))
    if ($shouldFlushMediaState) {
      Append-NdjsonEntries -Path $workingPaths.MediaDeltaPath -Entries ($mediaDeltaBatch.ToArray())
      $mediaDeltaBatch.Clear()
      Set-ObjectPropertyValue -Object $runState -Name "mediaOffset" -Value ($mediaIndex + 1)
      Set-ObjectPropertyValue -Object $runState -Name "imageCount" -Value $imageCount
      Set-ObjectPropertyValue -Object $runState -Name "skippedImageCount" -Value $skippedImageCount
      Set-ObjectPropertyValue -Object $runState -Name "updatedAt" -Value ([DateTimeOffset]::UtcNow.ToString("o"))
      Write-RunState -Paths $workingPaths -State $runState
    }
  }
  Set-ObjectPropertyValue -Object $phaseStatus -Name "media" -Value "complete"
  Set-ObjectPropertyValue -Object $runState -Name "phaseStatus" -Value $phaseStatus
  Set-ObjectPropertyValue -Object $runState -Name "mediaOffset" -Value $orderedPosts.Count
  Set-ObjectPropertyValue -Object $runState -Name "imageCount" -Value $imageCount
  Set-ObjectPropertyValue -Object $runState -Name "skippedImageCount" -Value $skippedImageCount
  Set-ObjectPropertyValue -Object $runState -Name "updatedAt" -Value ([DateTimeOffset]::UtcNow.ToString("o"))
  Write-RunState -Paths $workingPaths -State $runState
  Write-Info "Media pass finished. Downloaded $imageCount images, skipped $skippedImageCount."
} else {
  $imageCount = [int](Get-ConfigValue -Config $runState -Name "imageCount" -Default 0)
  $skippedImageCount = [int](Get-ConfigValue -Config $runState -Name "skippedImageCount" -Default 0)
  Write-Info "Media phase already completed in working state. Skipping media downloads."
}

$finalManifest = New-ArchiveManifest -SourceProfile $sourceProfile -Filters $filters -PostCount $orderedPosts.Count -ImageCount $imageCount -SkippedImageCount $skippedImageCount -PageCount $pageCount -Phase "completed" -Warning $warning
$finalState = [ordered]@{
  status = "completed"
  nextCursor = $cursor
  pageCount = $pageCount
  exportedPosts = $orderedPosts.Count
  exportedImages = $imageCount
  skippedImages = $skippedImageCount
  phase = "completed"
  toolVersion = $Script:ToolVersion
}

if ([string](Get-ObjectPropertyValue -Object $phaseStatus -Name "finalize" -Default "") -ne "complete") {
  Set-ObjectPropertyValue -Object $runState -Name "phase" -Value "finalize"
  Set-ObjectPropertyValue -Object $phaseStatus -Name "finalize" -Value "running"
  Set-ObjectPropertyValue -Object $runState -Name "phaseStatus" -Value $phaseStatus
  Set-ObjectPropertyValue -Object $runState -Name "updatedAt" -Value ([DateTimeOffset]::UtcNow.ToString("o"))
  Write-RunState -Paths $workingPaths -State $runState
  $finalizeOffset = [Math]::Max(0, [int](Get-ConfigValue -Config $runState -Name "finalizeOffset" -Default 0))
  Initialize-FinalPostsJsonFile -Paths $workingPaths -Offset $finalizeOffset
  $finalPostTotal = $orderedPosts.Count
  $finalProgressEvery = Get-ProgressInterval -Total $finalPostTotal -TargetUpdates 25
  Write-Info "Building final posts.json payload for $finalPostTotal posts."
  $utf8 = [System.Text.UTF8Encoding]::new($false)
  $stream = [System.IO.File]::Open($workingPaths.FinalPostsPath, [System.IO.FileMode]::Append, [System.IO.FileAccess]::Write, [System.IO.FileShare]::Read)
  $writer = New-Object System.IO.StreamWriter($stream, $utf8)
  try {
    for ($finalIndex = $finalizeOffset; $finalIndex -lt $finalPostTotal; $finalIndex += 1) {
      $displayIndex = $finalIndex + 1
      Write-ProgressStep -Label "Final posts payload" -Current $displayIndex -Total $finalPostTotal -Every $finalProgressEvery
      $finalPost = ConvertTo-FinalArchivePost -Post $orderedPosts[$finalIndex]
      if ($finalIndex -gt 0) {
        $writer.Write(",`n")
      } else {
        $writer.Write("`n")
      }
      $writer.Write(($finalPost | ConvertTo-Json -Compress -Depth 100))
      if (($displayIndex % $finalProgressEvery) -eq 0 -or $displayIndex -eq $finalPostTotal) {
        $writer.Flush()
      }
      Set-ObjectPropertyValue -Object $runState -Name "finalizeOffset" -Value $displayIndex
      Set-ObjectPropertyValue -Object $runState -Name "updatedAt" -Value ([DateTimeOffset]::UtcNow.ToString("o"))
      Write-RunState -Paths $workingPaths -State $runState
    }
  } finally {
    $writer.Dispose()
    $stream.Dispose()
  }
  if (-not [bool](Get-ConfigValue -Config $runState -Name "finalizeArrayClosed" -Default $false)) {
    Close-FinalPostsJsonFile -Paths $workingPaths
    Set-ObjectPropertyValue -Object $runState -Name "finalizeArrayClosed" -Value $true
  }
  Write-FinalArchiveMeta -Paths $workingPaths -Manifest $finalManifest -SessionState $finalState
  Set-ObjectPropertyValue -Object $phaseStatus -Name "finalize" -Value "complete"
  Set-ObjectPropertyValue -Object $runState -Name "phaseStatus" -Value $phaseStatus
  Set-ObjectPropertyValue -Object $runState -Name "finalizeOffset" -Value $finalPostTotal
  Set-ObjectPropertyValue -Object $runState -Name "updatedAt" -Value ([DateTimeOffset]::UtcNow.ToString("o"))
  Write-RunState -Paths $workingPaths -State $runState
} else {
  Write-Info "Finalize phase already completed in working state. Skipping final posts.json rebuild."
}

if ($resolvedCreateZip) {
  $zipName = "threadline-archive-$($sourceHandle -replace '[^\w.-]+', '-')-$((Get-Date).ToString('yyyy-MM-dd')).zip"
  $zipPath = Join-Path (Split-Path -Parent $resolvedOutputDirectory) $zipName
  if ([string](Get-ObjectPropertyValue -Object $phaseStatus -Name "zip" -Default "") -ne "complete") {
    Set-ObjectPropertyValue -Object $runState -Name "phase" -Value "zip"
    Set-ObjectPropertyValue -Object $phaseStatus -Name "zip" -Value "running"
    Set-ObjectPropertyValue -Object $runState -Name "phaseStatus" -Value $phaseStatus
    Set-ObjectPropertyValue -Object $runState -Name "zipPath" -Value $zipPath
    Set-ObjectPropertyValue -Object $runState -Name "updatedAt" -Value ([DateTimeOffset]::UtcNow.ToString("o"))
    Write-RunState -Paths $workingPaths -State $runState
    $zipOffset = [Math]::Max(0, [int](Get-ConfigValue -Config $runState -Name "zipOffset" -Default 0))
    Write-Info "Creating ZIP archive at $zipPath"
    $zipTotalFiles = Write-ArchiveZip -SourceDirectory $resolvedOutputDirectory -ZipPath $zipPath -StartIndex $zipOffset -OnProgress {
      param($completedCount, $totalCount)
      Set-ObjectPropertyValue -Object $runState -Name "zipOffset" -Value $completedCount
      Set-ObjectPropertyValue -Object $runState -Name "updatedAt" -Value ([DateTimeOffset]::UtcNow.ToString("o"))
      Write-RunState -Paths $workingPaths -State $runState
    }
    Set-ObjectPropertyValue -Object $runState -Name "zipOffset" -Value $zipTotalFiles
    Set-ObjectPropertyValue -Object $phaseStatus -Name "zip" -Value "complete"
    Set-ObjectPropertyValue -Object $runState -Name "phaseStatus" -Value $phaseStatus
    Set-ObjectPropertyValue -Object $runState -Name "updatedAt" -Value ([DateTimeOffset]::UtcNow.ToString("o"))
    Write-RunState -Paths $workingPaths -State $runState
  } else {
    Write-Info "ZIP phase already completed in working state. Skipping ZIP creation."
  }
} else {
  Set-ObjectPropertyValue -Object $phaseStatus -Name "zip" -Value "skipped"
  Set-ObjectPropertyValue -Object $runState -Name "phaseStatus" -Value $phaseStatus
}

Set-ObjectPropertyValue -Object $runState -Name "phase" -Value "completed"
Set-ObjectPropertyValue -Object $runState -Name "status" -Value "completed"
Set-ObjectPropertyValue -Object $runState -Name "imageCount" -Value $imageCount
Set-ObjectPropertyValue -Object $runState -Name "skippedImageCount" -Value $skippedImageCount
Set-ObjectPropertyValue -Object $runState -Name "updatedAt" -Value ([DateTimeOffset]::UtcNow.ToString("o"))
Write-RunState -Paths $workingPaths -State $runState

Write-Info "Done. Archive written to $resolvedOutputDirectory"
