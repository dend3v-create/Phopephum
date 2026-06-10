#!/bin/bash
set -e

echo "🚀 Phopephum Deploy Script"
echo "=========================="

# 1. Push to GitHub (main + phopephum)
echo ""
echo "📤 Pushing to GitHub..."
git push origin main
git push origin main:phopephum
echo "✅ GitHub: main & phopephum updated"

# 2. Build
echo ""
echo "🔨 Building..."
pnpm build
echo "✅ Build complete"

# 3. Deploy to Cloudflare Pages (production = phopephum branch)
echo ""
echo "☁️  Deploying to Cloudflare Pages..."
cd apps/web
npx wrangler pages deploy build/client \
  --project-name phopephum-web \
  --branch phopephum \
  --commit-dirty=true
cd ../..

echo ""
echo "✅ Deploy complete!"
