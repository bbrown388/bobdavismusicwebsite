# autonomous/run.ps1
# Invoked by Windows Task Scheduler (or manually for daytime testing).
# Streams Claude output live to both the console window and run.log.

param(
    [string]$WorkDir = "C:\Users\bobbr\Claude Code Working Folder"
)

$logFile  = Join-Path $WorkDir "autonomous\run.log"
$lockFile = Join-Path $WorkDir "autonomous\run.lock"

function Log([string]$msg) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line -Encoding UTF8
}

# Prevent concurrent runs
if (Test-Path $lockFile) {
    Log "SKIPPED - another run already in progress (lock file exists)"
    exit 0
}
New-Item -Path $lockFile -ItemType File -Force | Out-Null

Log "=== Autonomous run started ==="
Set-Location $WorkDir

$prompt = "Autonomous game director run. CLAUDE.md is loaded - follow it. The session-start hook ran director.js and its output is in context. Execute the EXECUTE or RESUME_TASK action completely: write code, run tests, commit, push, update autonomous/state.json (currentTask null). End with AUTONOMOUS_RUN_COMPLETE."

try {
    $collected = [System.Collections.Generic.List[string]]::new()

    # Stream output live — each line prints to console and appends to log immediately
    "" | & claude --print --permission-mode bypassPermissions --max-budget-usd 3.00 $prompt 2>&1 | ForEach-Object {
        $line = [string]$_
        Write-Host $line
        Add-Content -Path $logFile -Value $line -Encoding UTF8
        $collected.Add($line)
    }

    $outputStr = $collected -join "`n"
    if ($outputStr -match "AUTONOMOUS_RUN_COMPLETE") {
        Log "SUCCESS - task completed"
    } else {
        Log "WARNING - run finished but AUTONOMOUS_RUN_COMPLETE not seen in output"
    }
} catch {
    Log "ERROR - $($_.Exception.Message)"
} finally {
    Remove-Item -Path $lockFile -Force -ErrorAction SilentlyContinue
    Log "=== Autonomous run ended ==="
}
