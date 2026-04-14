# auto-push.ps1 - מבצע git push אוטומטי אחרי כל שינוי של Cursor
$null = [Console]::In.ReadToEnd()

$changes = git status --porcelain 2>&1
if ($changes) {
    git add .
    $date = Get-Date -Format "dd/MM/yyyy HH:mm"
    git commit -m "עדכון אוטומטי - $date"
    git push origin main
}

exit 0
