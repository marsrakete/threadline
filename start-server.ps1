param(
  [int]$Port = 5002
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()

Write-Host "Threadline laeuft auf http://localhost:$Port/"
Write-Host "Zum Beenden Strg+C druecken."

$contentTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".js" = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".webmanifest" = "application/manifest+json; charset=utf-8"
  ".svg" = "image/svg+xml"
  ".png" = "image/png"
  ".ps1" = "text/plain; charset=utf-8"
}

try {
  while ($listener.IsListening) {
    $pendingContext = $listener.BeginGetContext($null, $null)
    while ($listener.IsListening -and -not $pendingContext.AsyncWaitHandle.WaitOne(200)) {
    }
    if (-not $listener.IsListening) {
      break
    }
    $context = $listener.EndGetContext($pendingContext)
    $requestPath = $context.Request.Url.AbsolutePath.TrimStart("/")

    if ([string]::IsNullOrWhiteSpace($requestPath)) {
      $requestPath = "index.html"
    }

    $safePath = $requestPath.Replace("/", "\")
    $filePath = Join-Path $root $safePath

    if (-not (Test-Path $filePath -PathType Leaf)) {
      $context.Response.StatusCode = 404
      $bytes = [System.Text.Encoding]::UTF8.GetBytes("404 - Datei nicht gefunden")
      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      $context.Response.Close()
      continue
    }

    $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
    $contentType = $contentTypes[$extension]
    if (-not $contentType) {
      $contentType = "application/octet-stream"
    }

    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $context.Response.ContentType = $contentType
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $context.Response.Close()
  }
}
finally {
  $listener.Stop()
  $listener.Close()
}
