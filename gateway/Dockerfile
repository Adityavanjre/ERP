# Install curl, dnsutils, and gettext (for envsubst)
RUN apt-get update && apt-get install -y curl dnsutils gettext && rm -rf /var/lib/apt/lists/*

COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]
