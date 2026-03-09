#!/bin/sh
set -e

echo "Generating nginx config..."

cat > /etc/nginx/conf.d/default.conf << NGINX_EOF
server {
    listen ${PORT:-80};
    server_name localhost;

    resolver 8.8.8.8 valid=30s;

    # Health Check Endpoint
    location /health {
        access_log off;
        return 200 'healthy';
        add_header Content-Type text/plain;
    }

    # GATE-001: Enforce Strict-Transport-Security (HSTS)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # proxy_redirect is handled per-location below

    # -- ERP API: /portal/api/ -> backend --
    # rewrite strips /portal/api/ prefix and rewrites to /api/<rest>
    # then proxy_pass to variable (variable form disables nginx URI processing
    # so the rewritten URI is sent as-is)
    location ^~ /portal/api/ {
        set \$backend "https://${KLYPSO_BACKEND_HOST}";
        rewrite ^/portal/api/(.*)$ /api/\$1 break;
        proxy_pass \$backend;
        proxy_ssl_server_name on;
        proxy_ssl_verify off;
        proxy_set_header Host "${KLYPSO_BACKEND_HOST}";
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        
        # ARCH-002: WebSocket Upgrade Headers for CollaborationGateway
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_read_timeout 120s;
        proxy_connect_timeout 60s;
        # Rewrite any Location headers from the backend (e.g. 301 trailing-slash redirects)
        # back through the gateway so the browser never follows a cross-origin redirect.
        # Cross-origin redirects cause browsers to strip the Authorization header -> 401 loop.
        proxy_redirect ~^https://${KLYPSO_BACKEND_HOST}/api/(.*)$ /portal/api/\$1;
    }

    # -- ERP Frontend: /portal -> frontend --
    location ^~ /portal {
        set \$frontend "https://${KLYPSO_FRONTEND_HOST}";
        proxy_pass \$frontend;
        proxy_ssl_server_name on;
        proxy_ssl_verify off;
        proxy_set_header Host "${KLYPSO_FRONTEND_HOST}";
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 120s;
        proxy_connect_timeout 60s;
    }

    # -- Agency API: /agency-api/ --
    location ^~ /agency-api/ {
        set \$agencybe "https://${AGENCY_BACKEND_HOST}";
        rewrite ^/agency-api/(.*)$ /\$1 break;
        proxy_pass \$agencybe;
        proxy_ssl_server_name on;
        proxy_ssl_verify off;
        proxy_set_header Host "${AGENCY_BACKEND_HOST}";
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # -- Agency Admin: /agency/ --
    location ^~ /agency/ {
        set \$agencyadmin "https://${AGENCY_FRONTEND_HOST}";
        rewrite ^/agency/(.*)$ /\$1 break;
        proxy_pass \$agencyadmin;
        proxy_ssl_server_name on;
        proxy_ssl_verify off;
        proxy_set_header Host "${AGENCY_FRONTEND_HOST}";
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # -- Agency Website: / (root) --

    location / {
        set \$agencyfe "https://${AGENCY_VIEWER_HOST}";
        proxy_pass \$agencyfe;
        proxy_ssl_server_name on;
        proxy_ssl_verify off;
        proxy_set_header Host "${AGENCY_VIEWER_HOST}";
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
NGINX_EOF

echo "Nginx config generated. Testing..."
nginx -t

echo "Starting nginx..."
exec nginx -g "daemon off;"
