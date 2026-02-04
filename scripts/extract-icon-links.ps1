Param([string]$Url)

$ErrorActionPreference = 'Stop'

$resp = Invoke-WebRequest -Uri $Url -UseBasicParsing
$html = $resp.Content

$pattern = '<link[^>]+rel=["\''][^"\'']*icon[^"\'']*["\''][^>]*>'
$matches = [regex]::Matches($html, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

$matches | ForEach-Object { $_.Value } | Select-Object -First 50
