#!/bin/sh
set -e

echo "Generating nginx config..."

cat > /etc/nginx/conf.d/default.conf << NGINX_EOF
server {
    listen 80;
    server_name localhost;

    resolver 8.8.8.8 valid=30s;

    # Never let upstream 301/302 Location headers leak to the browser
    proxy_redirect off;

    # -- ERP API: /portal/api/ -> backend --
    # Must be declared BEFORE /portal so nginx longest-prefix match picks this first
    location ^~ /portal/api/ {
        set \$backend "https://${KLYPSO_BACKEND_HOST}";
        proxy_pass \$backend/api/;
        proxy_ssl_server_name on;
        proxy_ssl_verify off;
        proxy_set_header Host "${KLYPSO_BACKEND_HOST}";
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 120s;
        proxy_connect_timeout 60s;
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
        proxy_pass \$agencybe/;
        proxy_ssl_server_name on;
        proxy_ssl_verify off;
        proxy_set_header Host "${AGENCY_BACKEND_HOST}";
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

echo "Nginx config generated:"
cat /etc/nginx/conf.d/default.conf

echo "Testing nginx config..."
nginx -t

echo "Starting nginx..."
exec nginx -g "daemon off;"
