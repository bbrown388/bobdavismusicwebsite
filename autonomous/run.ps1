# autonomous/run.ps1
# Invoked by Windows Task Scheduler (or manually for daytime testing).
# Starts a non-interactive Claude Code session that reads CLAUDE.md,
# sees the session-start hook output, and executes the director action.

param(
    [string]$WorkDir = "C:\Users\bobbr\Claude Code Working Folder"
)

$logFile = "$WorkDir\autonomous\run.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

function Log($msg) {
    $line = "[$timestamp] $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

Log "=== Autonomous run started ==="

Set-Location $WorkDir

# Run claude in non-interactive print mode.
# --permission-mode bypassPermissions: auto-approves file edits, Bash, git push.
# --max-budget-usd 2.00: hard cap per run (adjust as needed).
# The session-start hook fires director.js; CLAUDE.md tells Claude what to do.
$prompt = @"
You are running as the autonomous game director for bobdavismusic.com.
CLAUDE.md has been loaded — follow it exactly.
The session-start hook has already run director.js and its output is in your context.
Act on the EXECUTE or RESUME_TASK signal completely:
- Write all code, run all tests, commit, and push before finishing.
- When done, update autonomous/state.json (currentTask: null).
- End your response with AUTONOMOUS_RUN_COMPLETE so the log captures success.
"@

try {
    $output = claude --print `
        --permission-mode bypassPermissions `
        --max-budget-usd 2.00 `
        $prompt 2>&1

    Add-Content -Path $logFile -Value $output

    if ($output -match "AUTONOMOUS_RUN_COMPLETE") {
        Log "SUCCESS — task completed"
    } else {
        Log "WARNING — run finished but AUTONOMOUS_RUN_COMPLETE not found in output"
    }
} catch {
    Log "ERROR — $($_.Exception.Message)"
}

Log "=== Autonomous run ended ==="
