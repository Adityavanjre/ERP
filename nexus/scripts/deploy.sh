#!/bin/bash

# DEV-005: Automated Deployment Sequence
# Strictly follows DEPLOYMENT_PLAYBOOK.md (Phase A -> Phase B -> Phase C)
# Usage: ./deploy.sh
# Requires environment variables:
# RENDER_API_KEY: Your Render API authentication token

set -e

# Default to empty strings if not set in environment
RENDER_API_KEY=${RENDER_API_KEY:-""}

# Optional: Replace these with your actual Render Service IDs if known
SRV_BACKEND=${SRV_BACKEND:-"srv-backend-placeholder"}
SRV_AGENCY_BACKEND=${SRV_AGENCY_BACKEND:-"srv-agency-backend-placeholder"}
SRV_FRONTEND=${SRV_FRONTEND:-"srv-frontend-placeholder"}
SRV_AGENCY_VIEWER=${SRV_AGENCY_VIEWER:-"srv-agency-viewer-placeholder"}
SRV_AGENCY_FRONTEND=${SRV_AGENCY_FRONTEND:-"srv-agency-frontend-placeholder"}
SRV_GATEWAY=${SRV_GATEWAY:-"srv-gateway-placeholder"}

trigger_deploy() {
  local service_name=$1
  local service_id=$2
  echo "[Deploy] Triggering $service_name ($service_id)..."
  
  if [ -z "$RENDER_API_KEY" ]; then
    echo "  -> (Dry Run): curl -X POST https://api.render.com/v1/services/$service_id/deploys -H 'Authorization: Bearer ***'"
    # Simulating deploy delay for dry run
    sleep 2
  else
    response=$(curl -s -w "\n%{http_code}" -X POST "https://api.render.com/v1/services/$service_id/deploys" \
      -H "Accept: application/json" \
      -H "Authorization: Bearer $RENDER_API_KEY")
    
    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" != "201" ] && [ "$http_code" != "200" ]; then
      echo "  -> [ERROR] Failed to trigger $service_name. HTTP Code: $http_code"
      echo "$response"
      exit 1
    fi
    echo "  -> Successfully triggered. Waiting 30s to allow initialization..."
    sleep 30
  fi
}

echo "==========================================="
echo "   NEXUS ERP - AUTOMATED DEPLOY CYCLE      "
echo "==========================================="

if [ -z "$RENDER_API_KEY" ]; then
  echo "WARNING: RENDER_API_KEY not set. Running in DRY RUN mode."
fi

echo ""
echo "--- PHASE A: Core Infrastructure ---"
# klypso-backend (Triggers migrations)
trigger_deploy "Nexus Backend" "$SRV_BACKEND"

# klypso-agency-backend (Admin/MongoDB initialization)
trigger_deploy "Agency Backend" "$SRV_AGENCY_BACKEND"
echo "Phase A complete. Allowing backends to stabilize..."
sleep 15

echo ""
echo "--- PHASE B: Frontend Surfaces ---"
trigger_deploy "Nexus ERP Frontend" "$SRV_FRONTEND"
trigger_deploy "Agency Marketing Site" "$SRV_AGENCY_VIEWER"
trigger_deploy "Agency Admin Portal" "$SRV_AGENCY_FRONTEND"
echo "Phase B complete."

echo ""
echo "--- PHASE C: Routing (Final Step) ---"
trigger_deploy "Nginx Gateway" "$SRV_GATEWAY"
echo "Phase C complete."

echo ""
echo "==========================================="
echo " DEPLOYMENT TRIGGERED SUCCESSFULLY"
echo "==========================================="
echo "Please verify forensic health checks via:"
echo "1. Public API: https://nexus.klypso.in/portal/api/v1/health/liveness"
echo "2. Nginx Mapping: https://nexus.klypso.in/agency-api/api/health"
