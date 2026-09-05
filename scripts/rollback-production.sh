#!/bin/bash
# ==============================================================================
# 🏛️ PHOPEPHUM V3 — PRODUCTION ROLLBACK STANDARD OPERATING PROCEDURE (SOP)
# ==============================================================================
# Usage:
#   bash scripts/rollback-production.sh [DEPLOYMENT_ID]
#
# If DEPLOYMENT_ID is not specified, this script lists recent deployments
# and guides the operator to select the target rollback artifact.

set -e

PROJECT_NAME="phopephum-web"
TARGET_URL="https://phopephum.com"

echo "================================================================================"
echo "🚨 PHOPEPHUM V3 — EMERGENCY PRODUCTION ROLLBACK"
echo "================================================================================"
echo "Project: $PROJECT_NAME"
echo "Target:  $TARGET_URL"
echo ""

# 1. Check Wrangler CLI availability
if ! command -v wrangler &> /dev/null && ! command -v npx &> /dev/null; then
  echo "❌ Error: wrangler / npx is not available in PATH."
  exit 1
fi

TARGET_DEPLOYMENT_ID="$1"

if [ -z "$TARGET_DEPLOYMENT_ID" ]; then
  echo "📋 Fetching recent production deployments from Cloudflare Pages..."
  echo ""
  npx wrangler pages deployment list --project-name="$PROJECT_NAME" --environment=production
  echo ""
  echo "--------------------------------------------------------------------------------"
  echo "💡 To rollback to a specific deployment, re-run with the Deployment ID:"
  echo "   bash scripts/rollback-production.sh <DEPLOYMENT_ID>"
  echo "--------------------------------------------------------------------------------"
  exit 0
fi

echo "🔄 Initiating rollback to Deployment: $TARGET_DEPLOYMENT_ID..."
echo ""

# In Cloudflare Pages, rollback is executed by aliasing/promoting the specific deployment ID
npx wrangler pages deployment rollback "$TARGET_DEPLOYMENT_ID" --project-name="$PROJECT_NAME"

echo ""
echo "✅ Cloudflare Pages rollback command executed."
echo "⏳ Waiting 5 seconds for global edge propagation..."
sleep 5

echo ""
echo "🏥 Executing Gate 7 Post-Rollback Health & Telemetry Verification..."
pnpm exec tsx scripts/ci-post-deploy-verify.ts --url "$TARGET_URL"

echo ""
echo "🏆 ROLLBACK PROCEDURE COMPLETED & PRODUCTION RECOVERED TO HEALTHY STATE."
