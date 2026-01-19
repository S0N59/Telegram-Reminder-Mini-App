#!/bin/bash

echo "🚀 Vercel Deployment Setup"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    echo "   cd backend && ./deploy.sh"
    exit 1
fi

echo "Step 1: Login to Vercel"
echo "This will open your browser for authentication..."
echo ""
read -p "Press Enter to continue..."
npx vercel login

echo ""
echo "Step 2: Deploy to Vercel"
echo "Follow the prompts:"
echo "  - Set up and deploy? Yes"
echo "  - Link to existing project? No"
echo "  - Project name? telegram-reminders-backend"
echo "  - Directory? ./"
echo ""
read -p "Press Enter to start deployment..."
npx vercel

echo ""
echo "✅ Deployment started!"
echo ""
echo "📝 IMPORTANT: After deployment, you MUST:"
echo "  1. Go to Vercel Dashboard: https://vercel.com/dashboard"
echo "  2. Select your project"
echo "  3. Go to Settings → Environment Variables"
echo "  4. Add these variables:"
echo "     - SUPABASE_URL"
echo "     - SUPABASE_ANON_KEY"
echo "     - TELEGRAM_BOT_TOKEN"
echo "     - SCHEDULER_API_KEY"
echo "  5. Redeploy (automatic when you add env vars)"
echo ""
echo "See VERCEL_SETUP.md for detailed instructions"
