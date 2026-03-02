#!/bin/sh
set -e

# Substitute ONLY the gateway-specific env vars — NOT nginx's own $variables
# This prevents envsubst from replacing $remote_addr, $host, etc. with empty strings
envsubst '${KLYPSO_FRONTEND_HOST} ${KLYPSO_BACKEND_HOST} ${AGENCY_VIEWER_HOST} ${AGENCY_BACKEND_HOST}' \
    < /etc/nginx/nginx.conf.template \
    > /etc/nginx/conf.d/default.conf

echo "Gateway config generated. Starting nginx..."
exec nginx -g "daemon off;"
