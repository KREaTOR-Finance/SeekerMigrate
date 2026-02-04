Param(
  # Hero background (#3)
  [string]$HeroJpg = "C:\Users\Buidl\.clawdbot\media\inbound\56d955a5-6513-48b8-a41a-ad919f8ac8ed.jpg",
  # Primary logo/icon (simple crow)
  [string]$LogoJpg = "C:\Users\Buidl\.clawdbot\media\inbound\cf397b60-797a-4438-a1ec-ea354795b62a.jpg",
  # Optional card art sheet
  [string]$CardsJpg = "C:\Users\Buidl\.clawdbot\media\inbound\48f2416f-efe4-496f-9dd6-c9e67da8a8cf.jpg"
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

function Ensure-Dir($p) {
  if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p | Out-Null }
}

function Load-Image($path) {
  if (-not (Test-Path $path)) { throw "Missing image: $path" }
  return [System.Drawing.Image]::FromFile($path)
}

function Save-Png($bmp, $outPath) {
  $dir = Split-Path -Parent $outPath
  Ensure-Dir $dir
  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Save-Jpg($bmp, $outPath, $quality = 92) {
  $dir = Split-Path -Parent $outPath
  Ensure-Dir $dir
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $enc = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $enc.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$quality)
  $bmp.Save($outPath, $codec, $enc)
}

function Crop-CenterSquare($img) {
  $size = [Math]::Min($img.Width, $img.Height)
  $x = [int](($img.Width - $size) / 2)
  $y = [int](($img.Height - $size) / 2)
  $rect = New-Object System.Drawing.Rectangle($x, $y, $size, $size)
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($img, 0, 0, $rect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  return $bmp
}

function Resize($img, $w, $h) {
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($img, 0, 0, $w, $h)
  $g.Dispose()
  return $bmp
}

function Center-CropToAspect($img, [double]$targetW, [double]$targetH) {
  $targetRatio = $targetW / $targetH
  $srcRatio = $img.Width / [double]$img.Height

  if ($srcRatio -gt $targetRatio) {
    # too wide -> crop width
    $newW = [int]([Math]::Round($img.Height * $targetRatio))
    $x = [int](($img.Width - $newW) / 2)
    $rect = New-Object System.Drawing.Rectangle($x, 0, $newW, $img.Height)
  } else {
    # too tall -> crop height
    $newH = [int]([Math]::Round($img.Width / $targetRatio))
    $y = [int](($img.Height - $newH) / 2)
    $rect = New-Object System.Drawing.Rectangle(0, $y, $img.Width, $newH)
  }

  $bmp = New-Object System.Drawing.Bitmap($rect.Width, $rect.Height)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($img, 0, 0, $rect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  return $bmp
}

$RepoRoot = Split-Path -Parent $PSScriptRoot
$MobileAssets = Join-Path $RepoRoot 'apps\mobile\assets\images'
$WebPublic = Join-Path $RepoRoot 'public'

Write-Host "Applying branding assets..." -ForegroundColor Cyan

$heroImg = Load-Image $HeroJpg
$logoImg = Load-Image $LogoJpg
$cardsImg = $null
if (Test-Path $CardsJpg) { $cardsImg = Load-Image $CardsJpg }

try {
  # --- Mobile icons ---
  $logoSquare = Crop-CenterSquare $logoImg
  $icon1024 = Resize $logoSquare 1024 1024
  Save-Png $icon1024 (Join-Path $MobileAssets 'icon.brand.png')
  Save-Png $icon1024 (Join-Path $MobileAssets 'adaptive-icon.brand.png')

  $favicon48 = Resize $logoSquare 48 48
  Save-Png $favicon48 (Join-Path $MobileAssets 'favicon.brand.png')

  # Splash: use hero, crop to portrait-ish and resize
  $splashCrop = Center-CropToAspect $heroImg 1080 1920
  $splash = Resize $splashCrop 1080 1920
  Save-Png $splash (Join-Path $MobileAssets 'splash.brand.png')

  # --- Web assets ---
  # Hero background
  $heroWeb = Center-CropToAspect $heroImg 1600 900
  $heroWebOut = Resize $heroWeb 1600 900
  Save-Jpg $heroWebOut (Join-Path $WebPublic 'hero.jpg') 90

  # Social card (OpenGraph)
  $ogCrop = Center-CropToAspect $heroImg 1200 630
  $og = Resize $ogCrop 1200 630
  Save-Jpg $og (Join-Path $WebPublic 'og.jpg') 90

  # Web favicon + mark
  $fav256 = Resize $logoSquare 256 256
  Save-Png $fav256 (Join-Path $WebPublic 'favicon.png')
  Save-Png (Resize $logoSquare 512 512) (Join-Path $WebPublic 'app-icon.png')

  if ($cardsImg -ne $null) {
    $cardsOut = Center-CropToAspect $cardsImg 1600 900
    $cardsOut2 = Resize $cardsOut 1600 900
    Save-Jpg $cardsOut2 (Join-Path $WebPublic 'cards.jpg') 90
  }

  Write-Host "Branding assets written." -ForegroundColor Green
}
finally {
  $heroImg.Dispose(); $logoImg.Dispose(); if ($cardsImg -ne $null) { $cardsImg.Dispose() }
}
