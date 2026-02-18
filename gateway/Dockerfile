FROM nginx:latest

# Install curl (optional debugging)
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Remove default config to prevent conflicts
RUN rm /etc/nginx/conf.d/default.conf

# Use static config instead of template for direct Klypso routing
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
