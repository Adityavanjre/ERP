FROM nginx:latest
# Install curl and dnsutils (bind-tools equiv) for healthchecks/wait scripts using apt-get (Debian)
RUN apt-get update && apt-get install -y curl dnsutils && rm -rf /var/lib/apt/lists/*

COPY nginx.conf /etc/nginx/nginx.conf
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]
