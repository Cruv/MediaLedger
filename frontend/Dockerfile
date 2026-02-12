FROM node:20-alpine AS base
WORKDIR /app
COPY package.json .

# ------- Development target -------
FROM base AS development
RUN npm install
COPY . .
EXPOSE 5173

# ------- Production build -------
FROM base AS build
RUN npm install
COPY . .
RUN npm run build

# ------- Production target -------
FROM nginx:alpine AS production

# Remove default nginx user and create one we can adjust
RUN apk add --no-cache shadow && \
    mkdir -p /config/nginx

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

ENV PUID=1000 \
    PGID=1000 \
    TZ=Etc/UTC

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
