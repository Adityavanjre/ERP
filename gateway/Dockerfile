FROM nginx:alpine
# Install curl and nslookup (bind-tools) for healthchecks/wait scripts
RUN apk add --no-cache curl bind-tools

COPY nginx.conf /etc/nginx/nginx.conf
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]
