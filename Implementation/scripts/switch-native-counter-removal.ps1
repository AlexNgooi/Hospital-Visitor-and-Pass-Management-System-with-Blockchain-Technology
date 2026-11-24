param(
    [Parameter(Mandatory = $true)]
    [string]$RuntimeRoot
)

$ErrorActionPreference = 'Stop'
$source = Split-Path -Parent $PSScriptRoot
$runtime = (Resolve-Path -LiteralPath $RuntimeRoot).Path
$launcher = Join-Path $PSScriptRoot 'manual-demo.mjs'
$state = Join-Path $runtime 'tmp/manual-demo-native'
$backupRoot = Join-Path $state 'backups'

# Check the prepared release before asking the existing launcher to create a backup.
$requiredFiles = @(
    'backend/target/hsaas-backend-0.0.1-SNAPSHOT.jar',
    'backend/target/manual-demo-classpath.txt',
    'frontend/node_modules/vite/bin/vite.js'
)
foreach ($file in $requiredFiles) {
    if (!(Test-Path -LiteralPath (Join-Path $source $file) -PathType Leaf)) {
        throw "Prepare the V12 release first. Missing $file"
    }
}
$nodeExecutable = (Get-Command node -CommandType Application).Source
$jarExecutable = (Get-Command jar -CommandType Application).Source
$archiveEntries = & $jarExecutable tf (Join-Path $source $requiredFiles[0])
if ($LASTEXITCODE -ne 0 -or
    'BOOT-INF/classes/db/migration/V12__remove_counter_entity.sql' -notin $archiveEntries) {
    throw 'The prepared backend archive does not contain the expected V12 migration.'
}

# Confirm the exact database and applied version before requesting any state change.
$version = & $nodeExecutable $launcher schema-version --runtime-root $runtime
if ($LASTEXITCODE -ne 0 -or $version -ne 'hsaas_manual_native 11 1') {
    throw 'Expected a successful V11 on hsaas_manual_native. Inspect the existing migration history before continuing.'
}

# The existing launcher handles credentials and connects only to its owned local control port.
$backupResult = & $nodeExecutable $launcher backup --runtime-root $runtime
if ($LASTEXITCODE -ne 0) {
    throw 'Backup failed. The current application has not been stopped.'
}
if ($backupResult -notmatch '^Backup saved: (.+)$') { throw 'The launcher did not return a backup path.' }

# Match the completed directory returned by this backup request.
$completed = Get-Item -LiteralPath $Matches[1]
$expectedParent = (Resolve-Path -LiteralPath $backupRoot).Path
if (!$completed.PSIsContainer -or $completed.Parent.FullName -ne $expectedParent) {
    throw 'The returned backup path is outside the native backup directory.'
}
foreach ($file in @('complete.json', 'database.sql', 'keys.json')) {
    $artifact = Get-Item -LiteralPath (Join-Path $completed.FullName $file)
    if ($artifact.PSIsContainer -or $artifact.Length -le 0) {
        throw "Backup is incomplete. Check $($completed.Name)."
    }
}
$marker = Get-Content -LiteralPath (Join-Path $completed.FullName 'complete.json') -Raw | ConvertFrom-Json
if ($marker.owner -ne 'hsaas-manual-native-v1') { throw 'Backup owner does not match the native demonstration.' }
Write-Host "Verified backup bundle $($completed.Name)"

& $nodeExecutable $launcher stop --runtime-root $runtime
if ($LASTEXITCODE -ne 0) { throw 'The existing launcher did not acknowledge the stop request.' }

# Stop acknowledges before the owned processes and launcher lock are fully released.
$deadline = [DateTime]::UtcNow.AddSeconds(20)
$lock = Join-Path $state 'launcher.lock'
while (Test-Path -LiteralPath $lock) {
    if ([DateTime]::UtcNow -ge $deadline) { throw 'The old launcher still owns the application. Inspect its state before starting.' }
    Start-Sleep -Milliseconds 250
}

& $nodeExecutable $launcher check --runtime-root $runtime
if ($LASTEXITCODE -ne 0) { throw 'V12 startup prerequisites failed after the stop. The verified backup is available.' }

# Keep the normal launch in the foreground. Flyway records V12 during backend startup.
& $nodeExecutable $launcher start --runtime-root $runtime
if ($LASTEXITCODE -ne 0) { throw 'V12 startup failed. Inspect the native backend log and verified backup before retrying.' }
