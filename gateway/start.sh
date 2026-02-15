#!/bin/sh

# Function to check if a host resolves
wait_for_host() {
    host="$1"
    echo "Waiting for $host to resolve..."
    until nslookup "$host" > /dev/null 2>&1; do
        echo "  $host not resolved yet. Retrying in 2s..."
        sleep 2
    done
    echo "✅ $host is ready!"
}

# Wait for critical upstream services
wait_for_host "klypso-agency-viewer"
wait_for_host "nexus-frontend"
wait_for_host "nexus-backend"
wait_for_host "klypso-agency-backend"

echo "🎯 All upstreams resolved. Starting Nginx..."
exec nginx -g "daemon off;"
