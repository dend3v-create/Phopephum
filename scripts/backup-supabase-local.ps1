# scripts/backup-supabase-local.ps1
# สคริปต์สำหรับรันสำรองข้อมูล Supabase บน Windows (PowerShell)

param (
    [string]$DbUrl = $env:SUPABASE_DB_URL
)

if (-not $DbUrl) {
    Write-Host "❌ กรุณาระบุ DB Connection String เช่น:" -ForegroundColor Red
    Write-Host '   .\scripts\backup-supabase-local.ps1 -DbUrl "postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"' -ForegroundColor Yellow
    exit 1
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupDir = Join-Path $PSScriptRoot "..\backups"

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$OutputFile = Join-Path $BackupDir "phopephum_backup_$Timestamp.sql"

Write-Host "⏳ กำลังสำรองข้อมูลฐานข้อมูล Supabase..." -ForegroundColor Cyan
supabase db dump --db-url "$DbUrl" -f "$OutputFile"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ สำรองข้อมูลเรียบร้อยแล้ว: $OutputFile" -ForegroundColor Green
} else {
    Write-Host "❌ เกิดข้อผิดพลาดในการสำรองข้อมูล" -ForegroundColor Red
}
