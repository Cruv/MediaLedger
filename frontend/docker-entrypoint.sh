#!/bin/sh
set -e

PUID=${PUID:-1000}
PGID=${PGID:-1000}

# Adjust nginx worker user to match PUID/PGID
# nginx master must run as root to bind port 80, but workers drop to this user
if ! getent group medialedger > /dev/null 2>&1; then
    addgroup -g "${PGID}" medialedger
fi

if ! getent passwd medialedger > /dev/null 2>&1; then
    adduser -u "${PUID}" -G medialedger -h /config -s /bin/sh -D medialedger
fi

chown -R medialedger:medialedger /usr/share/nginx/html /config/nginx

# Inject the worker user into nginx config
sed -i "s/^user .*/user medialedger;/" /etc/nginx/nginx.conf 2>/dev/null || true

exec "$@"
