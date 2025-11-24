#!/bin/bash

# Deployment Configuration Checker
echo "🔍 Checking Learnova Deployment Configuration..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

echo "✅ Project root directory found"
echo ""

# Check frontend files
echo "📦 Checking Frontend Configuration..."

if [ -f "apps/frontend/.env.production" ]; then
    echo "✅ .env.production exists"
    cat apps/frontend/.env.production
else
    echo "⚠️  .env.production missing - creating it..."
    echo "VITE_API_URL=https://learnova-srwb.onrender.com" > apps/frontend/.env.production
    echo "✅ Created .env.production"
fi

echo ""

if [ -f "apps/frontend/vercel.json" ]; then
    echo "✅ vercel.json exists"
else
    echo "❌ vercel.json missing!"
fi

echo ""

# Check if axios is used in SavedContentPage
echo "🔍 Checking SavedContentPage.tsx..."
if grep -q "import axios" apps/frontend/src/pages/SavedContentPage.tsx; then
    echo "✅ SavedContentPage uses axios"
else
    echo "❌ SavedContentPage missing axios import!"
fi

echo ""

# Check if axios is used in SaveContentModal
echo "🔍 Checking SaveContentModal.tsx..."
if grep -q "import axios" apps/frontend/src/components/SaveContentModal.tsx; then
    echo "✅ SaveContentModal uses axios"
else
    echo "❌ SaveContentModal missing axios import!"
fi

echo ""
echo "📋 Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Backend URL: https://learnova-srwb.onrender.com"
echo "Frontend URL: https://learnova-olive-eight.vercel.app"
echo ""
echo "Next Steps:"
echo "1. Commit and push changes: git add . && git commit -m 'Fix deployment' && git push"
echo "2. Set VITE_API_URL in Vercel environment variables"
echo "3. Set FRONTEND_URL in Render environment variables"
echo "4. Redeploy both services"
echo ""
echo "📖 See DEPLOYMENT_FIX.md for detailed instructions"
