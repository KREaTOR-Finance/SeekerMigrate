$ErrorActionPreference = 'SilentlyContinue'

$candidates = @(
  'favicon.ico','favicon.png','favicon.svg',
  'apple-touch-icon.png','apple-touch-icon-precomposed.png',
  'icon.png','icons/icon-512x512.png',
  'favicon-32x32.png','favicon-16x16.png',
  'site.webmanifest'
)

function Find-FirstIconUrl([string]$base) {
  $base = $base.TrimEnd('/')
  foreach ($p in $candidates) {
    $u = "$base/$p"
    try {
      $r = Invoke-WebRequest -Uri $u -Method Head -MaximumRedirection 5 -TimeoutSec 10
      if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) {
        return $u
      }
    } catch {}
  }
  return $null
}

$sites = @(
  'https://solanamobile.com',
  'https://docs.solanamobile.com',
  'https://expo.dev'
)

foreach ($s in $sites) {
  $found = Find-FirstIconUrl $s
  "$s => $found"
}
