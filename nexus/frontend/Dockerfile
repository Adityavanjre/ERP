FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
# For monorepo support, we need to ensure @nexus/shared is available
# but we are currently in the frontend directory.
# If npm install fails, it's because of the shared dependency.
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
# Next.js standalone output in monorepo is nested.
# We copy the entire standalone folder to preserve structure.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
# Run the entrypoint from the nested monorepo path if needed, or point to it
CMD ["node", "nexus/frontend/server.js"]
