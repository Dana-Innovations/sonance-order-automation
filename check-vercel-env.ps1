# Script to check Vercel environment variables
# Run this script to see your production environment variables

Write-Host "Checking Vercel environment variables..." -ForegroundColor Cyan
Write-Host ""

# First, link the project
Write-Host "Step 1: Linking to Vercel project..." -ForegroundColor Yellow
$linkOutput = vercel link --scope sonance-vercel --project sonance-order-automation --yes 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Project linked successfully" -ForegroundColor Green
    Write-Host ""

    # Now pull the environment variables
    Write-Host "Step 2: Pulling production environment variables..." -ForegroundColor Yellow
    vercel env pull --environment production --yes .env.vercel.production 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Environment variables pulled successfully" -ForegroundColor Green
        Write-Host ""
        Write-Host "Checking critical variables:" -ForegroundColor Cyan
        Write-Host ""

        # Check for DISABLE_AUTH
        $envContent = Get-Content .env.vercel.production -Raw

        if ($envContent -match 'DISABLE_AUTH=(.+)') {
            $disableAuthValue = $matches[1].Trim()
            if ($disableAuthValue -eq 'true') {
                Write-Host "❌ PROBLEM FOUND: DISABLE_AUTH=$disableAuthValue" -ForegroundColor Red
                Write-Host "   This should NOT be set to 'true' in production!" -ForegroundColor Red
            } else {
                Write-Host "✓ DISABLE_AUTH=$disableAuthValue (OK)" -ForegroundColor Green
            }
        } else {
            Write-Host "✓ DISABLE_AUTH is not set (OK)" -ForegroundColor Green
        }

        # Check Supabase URL
        if ($envContent -match 'NEXT_PUBLIC_SUPABASE_URL=(.+)') {
            Write-Host "✓ NEXT_PUBLIC_SUPABASE_URL is set" -ForegroundColor Green
        } else {
            Write-Host "❌ NEXT_PUBLIC_SUPABASE_URL is NOT set" -ForegroundColor Red
        }

        # Check Supabase anon key
        if ($envContent -match 'NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)') {
            Write-Host "✓ NEXT_PUBLIC_SUPABASE_ANON_KEY is set" -ForegroundColor Green
        } else {
            Write-Host "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is NOT set" -ForegroundColor Red
        }

        Write-Host ""
        Write-Host "Full environment file saved to: .env.vercel.production" -ForegroundColor Cyan

    } else {
        Write-Host "✗ Failed to pull environment variables" -ForegroundColor Red
        Write-Host "Error: $linkOutput" -ForegroundColor Red
    }
} else {
    Write-Host "✗ Failed to link project" -ForegroundColor Red
    Write-Host "Error: $linkOutput" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try running manually:" -ForegroundColor Yellow
    Write-Host "  vercel link --scope sonance-vercel" -ForegroundColor White
}
