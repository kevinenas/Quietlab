param([string]$OutputDirectory = '')
$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path $PSScriptRoot -Parent
if (!$OutputDirectory) { $OutputDirectory = Join-Path $projectDirectory 'release' }
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
if (!(Test-Path -LiteralPath $compiler)) { $compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework/v4.0.30319/csc.exe' }
if (!(Test-Path -LiteralPath $compiler)) { throw 'The .NET Framework C# compiler is required to build QuietLab.exe.' }

# Generate a small original studio icon from simple geometry.
Add-Type -AssemblyName System.Drawing
$bitmap = New-Object Drawing.Bitmap 64, 64
$graphics = [Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = 'AntiAlias'
$graphics.Clear([Drawing.Color]::FromArgb(23,43,52))
$brush = New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(136,216,182))
for ($i = 0; $i -lt 7; $i++) {
    $graphics.ResetTransform()
    $graphics.TranslateTransform(32,32)
    $graphics.RotateTransform([single]($i * 360 / 7))
    $graphics.FillEllipse($brush,0,-8,24,12)
}
$graphics.ResetTransform()
$graphics.FillEllipse((New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(23,43,52))),24,24,16,16)
$iconPath = Join-Path $OutputDirectory 'QuietLab.ico'
$icon = [Drawing.Icon]::FromHandle($bitmap.GetHicon())
$iconStream = [IO.File]::Create($iconPath)
$icon.Save($iconStream)
$iconStream.Dispose(); $graphics.Dispose(); $bitmap.Dispose(); $brush.Dispose()

$exePath = Join-Path $OutputDirectory 'QuietLab.exe'
$compilerArguments = @('/nologo','/target:winexe','/platform:anycpu','/optimize+',('/out:' + $exePath),('/win32icon:' + $iconPath),'/reference:System.Windows.Forms.dll','/reference:System.Drawing.dll')
foreach ($asset in @('index.html','style.css','app.js','model.js','thermal.js','rotor3d.js')) {
    $assetPath = Join-Path $projectDirectory ('dist/' + $asset)
    $compilerArguments += '/resource:' + $assetPath + ',QuietLab.Web.' + $asset
}
$compilerArguments += Join-Path $PSScriptRoot 'QuietLab.cs'
& $compiler @compilerArguments
if ($LASTEXITCODE -ne 0) { throw 'Executable compilation failed.' }
Write-Output ('Built ' + $exePath)
