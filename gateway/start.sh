#!/bin/sh

# Debug: Print all "HOST" and "PORT" variables to logs
echo "🔍 Environment Variables (Filtered):"
printenv | grep -E "_HOST|_PORT"

echo "🚀 Generating Nginx config from template..."

# Use envsubst to replace ONLY the service variables
export VARS='$AGENCY_VIEWER_HOST $AGENCY_VIEWER_PORT $NEXUS_FRONTEND_HOST $NEXUS_FRONTEND_PORT $NEXUS_BACKEND_HOST $NEXUS_BACKEND_PORT $AGENCY_BACKEND_HOST $AGENCY_BACKEND_PORT'

envsubst "$VARS" < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Debug: Show the generated config
echo "📝 Generated Nginx Config:"
cat /etc/nginx/nginx.conf

echo "🔍 Config generated. Starting Nginx..."
exec nginx -g "daemon off;"
