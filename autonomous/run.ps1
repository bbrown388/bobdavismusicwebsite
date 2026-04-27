# autonomous/run.ps1
# Invoked by Windows Task Scheduler (or manually for daytime testing).
# Loops - builds games back-to-back until the budget/org limit is hit.

param(
    [string]$WorkDir = "C:\Users\bobbr\Claude Code Working Folder"
)

$logFile      = Join-Path $WorkDir "autonomous\run.log"
$lockFile     = Join-Path $WorkDir "autonomous\run.lock"
$patchFile    = Join-Path $WorkDir "autonomous\.status-patch.json"
$feedbackFile = Join-Path $WorkDir "autonomous\pending-feedback.json"

function Log([string]$msg) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line -Encoding UTF8
}

function LogLive([string]$msg) {
    Write-Host $msg
    Add-Content -Path $logFile -Value $msg -Encoding UTF8
}

function WriteStatusPatch([hashtable]$patch) {
    $json = $patch | ConvertTo-Json -Compress
    [System.IO.File]::WriteAllText($patchFile, $json, [System.Text.UTF8Encoding]::new($false))
    try {
        & node "$WorkDir\autonomous\update-status.js" $patchFile 2>&1 | ForEach-Object { Log $_ }
    } catch {
        Log "WARN - status update failed (non-fatal): $($_.Exception.Message)"
    }
}

# Stream a claude call, logging output live. Returns the full text.
function RunClaude([string]$claudePrompt) {
    $rawLines = [System.Collections.Generic.List[string]]::new()

    "" | & claude --print --verbose --permission-mode bypassPermissions --output-format stream-json $claudePrompt 2>&1 | ForEach-Object {
        $raw = [string]$_
        $rawLines.Add($raw)

        try {
            $obj = ConvertFrom-Json $raw -ErrorAction Stop
            switch ($obj.type) {
                'assistant' {
                    foreach ($block in $obj.message.content) {
                        if ($block.type -eq 'text' -and $block.text.Trim()) {
                            LogLive $block.text.Trim()
                        }
                    }
                }
                'tool_use' {
                    $inp = $obj.tool_use.input
                    $detail = switch ($obj.tool_use.name) {
                        'Bash'  { $inp.command }
                        'Read'  { $inp.file_path }
                        'Edit'  { $inp.file_path }
                        'Write' { $inp.file_path }
                        'Glob'  { $inp.pattern }
                        'Grep'  { "$($inp.pattern) in $($inp.path)" }
                        default { '' }
                    }
                    LogLive "[Tool: $($obj.tool_use.name)] $detail".TrimEnd()
                }
                'result' {
                    if ($obj.result) { LogLive $obj.result }
                    if ($obj.cost_usd) {
                        $script:sessionSpent += [double]$obj.cost_usd
                        Log "Cost: `$$([math]::Round($obj.cost_usd, 4)) | Session total: `$$([math]::Round($script:sessionSpent, 4)) / `$$sessionBudgetUsd"
                    }
                }
            }
        } catch {
            if ($raw.Trim()) { LogLive $raw }
        }
    }

    return $rawLines -join "`n"
}

# Prevent concurrent runs - treat lock files older than 4 hours as stale
if (Test-Path $lockFile) {
    $lockAge = (Get-Date) - (Get-Item $lockFile).LastWriteTime
    if ($lockAge.TotalHours -lt 4) {
        Log "SKIPPED - another run already in progress (lock age: $([math]::Round($lockAge.TotalMinutes, 1)) min)"
        exit 0
    }
    Log "Removing stale lock file (age: $([math]::Round($lockAge.TotalHours, 1)) hours)"
    Remove-Item -Path $lockFile -Force
}
New-Item -Path $lockFile -ItemType File -Force | Out-Null

# Clean up lock on unexpected termination (Ctrl+C, process kill, pipeline crash)
trap {
    Remove-Item -Path $lockFile -Force -ErrorAction SilentlyContinue
    Log "TRAP - unexpected exit: $($_.Exception.Message)"
    break
}

Log "=== Autonomous session started ==="
Set-Location $WorkDir

WriteStatusPatch @{
    currentTask = @{ action = "starting"; context = "Director session starting - reading feedback and deciding next action" }
    lastRunAt   = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
}

$maxGames        = 10     # safety cap per session
$sessionBudgetUsd = 40.00  # total spend cap across all games this session
$gamesDone  = 0
$sessionSpent = 0.0
$keepGoing  = $true

try {
    # --- Feedback processing step ---
    # director.js writes any new feedback to pending-feedback.json.
    # Run a dedicated Claude session to process it before the main game loop.
    if (Test-Path $feedbackFile) {
        $feedbackJson = Get-Content $feedbackFile -Raw
        $feedbackItems = ConvertFrom-Json $feedbackJson
        if ($feedbackItems.Count -gt 0) {
            Log "--- Processing $($feedbackItems.Count) feedback item(s) before game loop ---"
            Log "Feedback: $feedbackJson"

            $feedbackPrompt = @"
You are the autonomous game director for Bob Davis's music website. You have received feedback that needs to be processed before the next game session begins.

Read autonomous/status.json to see the current game queue and state.

Here is the feedback to process:
$feedbackJson

Process each item exactly as you would if Bob had typed it to you directly in chat. For example:
- Queue order changes ("do X next", "do X after Y", "skip X") -> update gameQueue in autonomous/status.json, director-status.json, and status.html, then commit and push
- Fix requests -> note them (the next session will handle them via the director)
- General direction feedback -> note it for the next game design

After processing all items, delete autonomous/pending-feedback.json, then output FEEDBACK_PROCESSED.
"@

            $feedbackResult = RunClaude $feedbackPrompt

            if ($feedbackResult -match "FEEDBACK_PROCESSED") {
                Log "Feedback processed successfully"
            } elseif ($feedbackResult -match "usage limit|spending limit|budget exceeded|rate limit") {
                Log "LIMIT HIT during feedback processing - stopping"
                $keepGoing = $false
            } else {
                Log "WARNING - feedback session ended without FEEDBACK_PROCESSED"
            }
        } else {
            Remove-Item $feedbackFile -Force -ErrorAction SilentlyContinue
        }
    }

    # --- Main game loop ---
    $gamePrompt = "Autonomous game director run. CLAUDE.md is loaded - follow it. The session-start hook ran director.js and its output is in context. Execute the EXECUTE or RESUME_TASK action completely: write code, run tests, commit, push, update autonomous/state.json (currentTask null). End with AUTONOMOUS_RUN_COMPLETE."

    while ($keepGoing -and $gamesDone -lt $maxGames) {
        $gamesDone++
        Log "--- Starting game $gamesDone of this session ---"

        $fullText = RunClaude $gamePrompt

        if ($fullText -match "AUTONOMOUS_RUN_COMPLETE") {
            Log "SUCCESS - game $gamesDone complete (session spent: `$$([math]::Round($sessionSpent, 4)))"
            if ($sessionSpent -ge $sessionBudgetUsd) {
                Log "SESSION BUDGET REACHED (`$$([math]::Round($sessionSpent, 4)) >= `$$sessionBudgetUsd) - stopping"
                $keepGoing = $false
            }
        } elseif ($fullText -match "usage limit|spending limit|budget exceeded|rate limit") {
            Log "LIMIT HIT - stopping after $gamesDone game(s) this session"
            $keepGoing = $false
        } else {
            Log "WARNING - game $gamesDone finished without AUTONOMOUS_RUN_COMPLETE - stopping loop"
            $keepGoing = $false
        }
    }

    if ($gamesDone -ge $maxGames) {
        Log "Safety cap reached ($maxGames games) - stopping"
    }

} catch {
    Log "ERROR - $($_.Exception.Message)"
    WriteStatusPatch @{ currentTask = $null; lastRunResult = "error"; lastRunSummary = "Session failed: $($_.Exception.Message)" }
} finally {
    Remove-Item -Path $lockFile -Force -ErrorAction SilentlyContinue
    Log "=== Autonomous session ended - $gamesDone game(s) completed ==="
}
