FROM nginx:latest

# Remove default config to prevent conflicts
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy template
COPY nginx.conf.template /etc/nginx/nginx.conf.template

# Copy entrypoint that runs envsubst on only the known variables,
# then starts nginx — avoids envsubst clobbering nginx $variables like $remote_addr
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

CMD ["/docker-entrypoint.sh"]
