# autonomous/run.ps1
# Invoked by Windows Task Scheduler (or manually for daytime testing).
# Uses --output-format stream-json so Claude flushes each event immediately.

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

function LogLive([string]$msg) {
    Write-Host $msg
    Add-Content -Path $logFile -Value $msg -Encoding UTF8
}

# Prevent concurrent runs
if (Test-Path $lockFile) {
    Log "SKIPPED - another run already in progress (lock file exists)"
    exit 0
}
New-Item -Path $lockFile -ItemType File -Force | Out-Null

Log "=== Autonomous run started ==="
Set-Location $WorkDir

# Update website status immediately so it shows Running
$startPatch = '{"currentTask":{"action":"starting","context":"Director session starting — reading feedback and deciding next action"},"lastRunAt":"' + (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ") + '"}'
& node "$WorkDir\autonomous\update-status.js" $startPatch 2>&1 | ForEach-Object { Log $_ }

$prompt = "Autonomous game director run. CLAUDE.md is loaded - follow it. The session-start hook ran director.js and its output is in context. Execute the EXECUTE or RESUME_TASK action completely: write code, run tests, commit, push, update autonomous/state.json (currentTask null). End with AUTONOMOUS_RUN_COMPLETE."

try {
    $rawLines = [System.Collections.Generic.List[string]]::new()

    "" | & claude --print --permission-mode bypassPermissions --max-budget-usd 3.00 --output-format stream-json $prompt 2>&1 | ForEach-Object {
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
                    $input = $obj.tool_use.input
                    $detail = switch ($obj.tool_use.name) {
                        'Bash'      { $input.command }
                        'Read'      { $input.file_path }
                        'Edit'      { $input.file_path }
                        'Write'     { $input.file_path }
                        'Glob'      { $input.pattern }
                        'Grep'      { "$($input.pattern) in $($input.path)" }
                        default     { '' }
                    }
                    $msg = "[Tool: $($obj.tool_use.name)] $detail".TrimEnd()
                    LogLive $msg
                }
                'result' {
                    if ($obj.result) { LogLive $obj.result }
                }
            }
        } catch {
            # Non-JSON line (warnings, etc.) — pass through as-is
            if ($raw.Trim()) { LogLive $raw }
        }
    }

    $fullText = $rawLines -join "`n"
    if ($fullText -match "AUTONOMOUS_RUN_COMPLETE") {
        Log "SUCCESS - task completed"
    } else {
        Log "WARNING - run finished but AUTONOMOUS_RUN_COMPLETE not seen in output"
    }
} catch {
    Log "ERROR - $($_.Exception.Message)"
    $errPatch = '{"currentTask":null,"lastRunResult":"error","lastRunSummary":"Run failed: ' + $_.Exception.Message.Replace('"',"'") + '"}'
    & node "$WorkDir\autonomous\update-status.js" $errPatch 2>&1 | ForEach-Object { Log $_ }
} finally {
    Remove-Item -Path $lockFile -Force -ErrorAction SilentlyContinue
    Log "=== Autonomous run ended ==="
}
