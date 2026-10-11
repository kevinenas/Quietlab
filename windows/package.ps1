param([string]$OutputDirectory = '')
$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path $PSScriptRoot -Parent
if (!$OutputDirectory) { $OutputDirectory = Join-Path $projectDirectory 'release' }
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
$exePath = Join-Path $OutputDirectory 'QuietLab.exe'
if (!(Test-Path -LiteralPath $exePath)) { throw 'Build QuietLab.exe before packaging.' }
Copy-Item -LiteralPath (Join-Path $projectDirectory 'LICENSE') -Destination (Join-Path $OutputDirectory 'LICENSE')
Copy-Item -LiteralPath (Join-Path $projectDirectory 'docs/RELEASE_NOTES.md') -Destination (Join-Path $OutputDirectory 'README.md')
$zipPath = Join-Path $OutputDirectory 'QuietLab-Windows.zip'
Compress-Archive -Path $exePath,(Join-Path $OutputDirectory 'LICENSE'),(Join-Path $OutputDirectory 'README.md') -DestinationPath $zipPath -Force
$zipHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
$exeHash = (Get-FileHash -LiteralPath $exePath -Algorithm SHA256).Hash.ToLowerInvariant()
$hashLines = @(($zipHash + '  QuietLab-Windows.zip'),($exeHash + '  QuietLab.exe'))
$hashLines | Set-Content -LiteralPath (Join-Path $OutputDirectory 'SHA256SUMS.txt') -Encoding ascii
Write-Output ('Packaged ' + $zipPath)
