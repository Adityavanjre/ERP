#!/bin/sh

echo "🔍 Detecting DNS Resolver..."
export DNS_RESOLVER=$(awk '/nameserver/ {print $2}' /etc/resolv.conf | head -n1)

if [ -z "$DNS_RESOLVER" ]; then
    echo "⚠️  No nameserver found in /etc/resolv.conf. Defaulting to Google DNS."
    export DNS_RESOLVER="8.8.8.8"
fi

echo "✅ Using Resolver: $DNS_RESOLVER"

# Inject the resolver into nginx.conf
sed -i "s/__DNS_RESOLVER__/$DNS_RESOLVER/g" /etc/nginx/nginx.conf

echo "🚀 Starting Nginx..."
exec nginx -g "daemon off;"
