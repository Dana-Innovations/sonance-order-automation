# Sonance Order Automation - Vercel Deployment Script
# Run this script in PowerShell to deploy to Vercel

Write-Host "🚀 Deploying Order Automation to Vercel (Sonance Team)..." -ForegroundColor Cyan

# Change to project directory
Set-Location -Path $PSScriptRoot

# Deploy to Vercel on sonance-vercel team
Write-Host "`n📦 Starting deployment..." -ForegroundColor Yellow
vercel --scope sonance-vercel

Write-Host "`n✅ Deployment complete!" -ForegroundColor Green
Write-Host "`nNow add environment variables:" -ForegroundColor Cyan
Write-Host "vercel env add DISABLE_AUTH" -ForegroundColor White
Write-Host "vercel env add NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor White
Write-Host "vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor White
Write-Host "vercel env add SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor White
Write-Host "vercel env add SHAREPOINT_CLIENT_ID" -ForegroundColor White
Write-Host "vercel env add SHAREPOINT_CLIENT_SECRET" -ForegroundColor White
Write-Host "vercel env add SHAREPOINT_TENANT_ID" -ForegroundColor White
Write-Host "vercel env add SHAREPOINT_SITE_ID" -ForegroundColor White
Write-Host "vercel env add ANTHROPIC_API_KEY" -ForegroundColor White
Write-Host "vercel env add OPENAI_API_KEY" -ForegroundColor White
Write-Host "vercel env add NEXT_PUBLIC_SUPABASE_BUCKET_PROMPT_BUILDER" -ForegroundColor White
