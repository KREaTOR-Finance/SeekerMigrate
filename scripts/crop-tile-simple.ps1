Param(
  [Parameter(Mandatory=$true)][string]$Src,
  [Parameter(Mandatory=$true)][string]$Dst,
  [Parameter(Mandatory=$true)][int]$X,
  [Parameter(Mandatory=$true)][int]$Y,
  [Parameter(Mandatory=$true)][int]$W,
  [Parameter(Mandatory=$true)][int]$H
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Image]::FromFile($Src)
try {
  $rect = New-Object System.Drawing.Rectangle($X, $Y, $W, $H)
  $bmp = New-Object System.Drawing.Bitmap($rect.Width, $rect.Height)
  try {
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    try {
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.DrawImage($img, 0, 0, $rect, [System.Drawing.GraphicsUnit]::Pixel)
    } finally {
      $g.Dispose()
    }

    $dir = Split-Path -Parent $Dst
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

    $bmp.Save($Dst, [System.Drawing.Imaging.ImageFormat]::Jpeg)
  } finally {
    $bmp.Dispose()
  }
} finally {
  $img.Dispose()
}
