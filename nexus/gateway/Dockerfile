FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom config
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# Use envsubst to replace environment variables at runtime
CMD ["/bin/sh", "-c", "envsubst '${PORT} ${KLYPSO_FRONTEND_HOST} ${KLYPSO_BACKEND_HOST} ${AGENCY_VIEWER_HOST} ${AGENCY_BACKEND_HOST} ${KLYPSO_FRONTEND_PORT} ${KLYPSO_BACKEND_PORT} ${AGENCY_VIEWER_PORT} ${AGENCY_BACKEND_PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
