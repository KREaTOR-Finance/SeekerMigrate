$p = 'C:\Users\Buidl\Desktop\SeekerMigrate\SeekerMigrate\public\index.html'
$c = [System.IO.File]::ReadAllText($p)
# Replace the accidental embedded NULL between 4 and 6
$c2 = $c -replace "4`0`6", "4-6"
if ($c2 -ne $c) {
  [System.IO.File]::WriteAllText($p, $c2)
  Write-Output 'patched'
} else {
  Write-Output 'nochange'
}
