$ErrorActionPreference = 'Stop'
$appDirectory = $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodeExecutable = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache\aumm-mobile-tools\node.exe' }
if (-not (Test-Path -LiteralPath $nodeExecutable)) { throw 'Instale o Node.js 22 ou superior para abrir a prévia.' }
$viteScript = Join-Path $appDirectory 'node_modules\vite\bin\vite.js'
if (-not (Test-Path -LiteralPath $viteScript)) { throw 'Execute npm ci dentro da pasta APP-Mobile primeiro.' }
$running = Get-NetTCPConnection -LocalPort 5174 -State Listen -ErrorAction SilentlyContinue
if (-not $running) {
    Start-Process -FilePath $nodeExecutable -ArgumentList @(('"' + $viteScript + '"'), '--host', '127.0.0.1', '--port', '5174', '--strictPort') -WorkingDirectory $appDirectory -WindowStyle Hidden | Out-Null
    Start-Sleep -Seconds 3
}
Start-Process 'http://127.0.0.1:5174/preview-celular.html'
