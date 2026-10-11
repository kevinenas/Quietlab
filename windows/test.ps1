param([string]$Executable = '')
$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path $PSScriptRoot -Parent
if (!$Executable) { $Executable = Join-Path $projectDirectory 'release/QuietLab.exe' }
$Executable = [IO.Path]::GetFullPath($Executable)
$readyFile = Join-Path ([IO.Path]::GetTempPath()) ('quietlab-test-' + [Guid]::NewGuid().ToString('N') + '.txt')
$process = Start-Process -FilePath $Executable -ArgumentList @('--headless','--port','0','--ready-file',('"' + $readyFile + '"')) -WindowStyle Hidden -PassThru
try {
    for ($i=0; $i -lt 60 -and !(Test-Path -LiteralPath $readyFile); $i++) { Start-Sleep -Milliseconds 100; if ($process.HasExited) { throw 'Launcher exited before becoming ready.' } }
    if (!(Test-Path -LiteralPath $readyFile)) { throw 'Launcher readiness timed out.' }
    $baseUrl = (Get-Content -LiteralPath $readyFile -Raw).Trim()
    foreach ($asset in @('index.html','style.css','app.js','model.js','thermal.js','rotor3d.js')) {
        $response = Invoke-WebRequest -UseBasicParsing -Uri ($baseUrl + $asset)
        $expected = [IO.File]::ReadAllBytes((Join-Path $projectDirectory ('dist/' + $asset)))
        $actual = $response.RawContentStream.ToArray()
        if ($response.StatusCode -ne 200 -or [Convert]::ToBase64String($actual) -ne [Convert]::ToBase64String($expected)) { throw ('Embedded asset mismatch: ' + $asset) }
        Write-Output ('PASS embedded asset ' + $asset)
    }
    $root = Invoke-WebRequest -UseBasicParsing -Uri $baseUrl
    if (!$root.Content.Contains('Fan design studio')) { throw 'Root did not serve the studio.' }
    function Assert-Status([string]$route, [string]$method, [int]$expectedStatus) {
        $status = 0
        try { $status = [int](Invoke-WebRequest -UseBasicParsing -Uri ($baseUrl + $route) -Method $method).StatusCode }
        catch { if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode } else { throw } }
        if ($status -ne $expectedStatus) { throw ('Expected HTTP ' + $expectedStatus + ', got ' + $status + ' for ' + $method + ' ' + $route) }
        Write-Output ('PASS HTTP ' + $expectedStatus + ' for ' + $method + ' ' + $route)
    }
    Assert-Status 'missing.txt' 'GET' 404
    Assert-Status 'index.html' 'POST' 405
    Assert-Status 'index.html' 'HEAD' 200
    Assert-Status 'LICENSE' 'GET' 404
    $uri = [Uri]$baseUrl
    $socket = New-Object Net.Sockets.TcpClient
    try {
        $socket.Connect('127.0.0.1', $uri.Port)
        $stream = $socket.GetStream()
        $request = [Text.Encoding]::ASCII.GetBytes("GET / HTTP/1.1`r`nHost: unrelated.invalid`r`nConnection: close`r`n`r`n")
        $stream.Write($request,0,$request.Length)
        $reader = New-Object IO.StreamReader $stream
        $statusLine = $reader.ReadLine()
        if (!$statusLine.StartsWith('HTTP/1.1 403')) { throw 'Unexpected Host was not rejected.' }
        Write-Output 'PASS unexpected Host rejected'
    } finally { $socket.Dispose() }
    Write-Output 'Windows launcher checks passed.'
}
finally {
    if (!$process.HasExited) { Stop-Process -Id $process.Id }
    if (Test-Path -LiteralPath $readyFile) { Remove-Item -LiteralPath $readyFile }
}
