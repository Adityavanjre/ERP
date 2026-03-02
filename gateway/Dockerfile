FROM nginx:latest

# Remove default config
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy entrypoint — generates nginx config at runtime using env vars
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

CMD ["/docker-entrypoint.sh"]
