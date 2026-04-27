# autonomous/schedule-task.ps1
# Run once (as admin or current user) to register the overnight Task Scheduler job.
# After this, the task runs nightly at 2 AM without any manual action.
#
# To remove: Unregister-ScheduledTask -TaskName "BobDavisGameDirector" -Confirm:$false

$taskName   = "BobDavisGameDirector"
$scriptPath = "C:\Users\bobbr\Claude Code Working Folder\autonomous\run.ps1"
$workDir    = "C:\Users\bobbr\Claude Code Working Folder"
$logDir     = "$workDir\autonomous"

# Trigger: nightly at 2 AM
$trigger = New-ScheduledTaskTrigger -Daily -At "02:00AM"

# Action: run PowerShell with the run script
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NonInteractive -ExecutionPolicy Bypass -File `"$scriptPath`"" `
    -WorkingDirectory $workDir

# Settings: 2-hour timeout, start if missed, wake to run
$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
    -StartWhenAvailable `
    -WakeToRun

# Run as current user (no password needed, session must be active OR
# "Run whether user is logged on or not" requires stored credentials)
$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Limited

# Register (or update if already exists)
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
    Set-ScheduledTask -TaskName $taskName -Trigger $trigger -Action $action -Settings $settings
    Write-Host "Updated existing task: $taskName"
} else {
    Register-ScheduledTask `
        -TaskName $taskName `
        -Trigger $trigger `
        -Action $action `
        -Settings $settings `
        -Principal $principal `
        -Description "Runs autonomous Claude Code game director nightly at 2 AM"
    Write-Host "Registered new task: $taskName"
}

Write-Host ""
Write-Host "Task '$taskName' scheduled for 2 AM nightly."
Write-Host "Logs will appear in: $logDir\run.log"
Write-Host ""
Write-Host "To run manually right now for testing:"
Write-Host "  Start-ScheduledTask -TaskName '$taskName'"
Write-Host "  # or"
Write-Host "  powershell -File `"$scriptPath`""
