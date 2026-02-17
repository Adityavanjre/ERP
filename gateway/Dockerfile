FROM nginx:latest

# Install curl (optional debugging)
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
