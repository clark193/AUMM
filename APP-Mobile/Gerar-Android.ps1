$ErrorActionPreference = 'Stop'
$toolsDirectory = Join-Path $env:USERPROFILE '.cache\aumm-mobile-tools'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand -and (Test-Path -LiteralPath (Join-Path $toolsDirectory 'node.exe'))) {
    $env:PATH = $toolsDirectory + ';' + $env:PATH
}
if (-not $env:JAVA_HOME -and (Test-Path -LiteralPath $toolsDirectory)) {
    $javaDirectory = Get-ChildItem -LiteralPath $toolsDirectory -Directory | Where-Object Name -Like 'jdk-21*' | Select-Object -First 1
    if ($javaDirectory) { $env:JAVA_HOME = $javaDirectory.FullName }
}
if (-not $env:ANDROID_HOME -and (Test-Path -LiteralPath (Join-Path $toolsDirectory 'android-sdk'))) {
    $env:ANDROID_HOME = Join-Path $toolsDirectory 'android-sdk'
}
Push-Location -LiteralPath $PSScriptRoot
try {
    & npm.cmd run android:build
    if ($LASTEXITCODE -ne 0) { throw 'A compilação falhou. Consulte a mensagem acima.' }
} finally {
    Pop-Location
}
