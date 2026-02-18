FROM nginx:latest

# Remove default config to prevent conflicts
RUN rm /etc/nginx/conf.d/default.conf

# Use template for dynamic environment variable injection
COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
