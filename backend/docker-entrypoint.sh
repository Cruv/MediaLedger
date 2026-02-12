#!/bin/bash
set -e

PUID=${PUID:-1000}
PGID=${PGID:-1000}

echo "
───────────────────────────────────
  MediaLedger
───────────────────────────────────
  PUID: ${PUID}
  PGID: ${PGID}
  TZ:   ${TZ:-Etc/UTC}
───────────────────────────────────
"

# Create group if it doesn't exist
if ! getent group medialedger > /dev/null 2>&1; then
    groupadd -g "${PGID}" medialedger
else
    groupmod -o -g "${PGID}" medialedger
fi

# Create user if it doesn't exist
if ! getent passwd medialedger > /dev/null 2>&1; then
    useradd -u "${PUID}" -g medialedger -d /config -s /bin/bash medialedger
else
    usermod -o -u "${PUID}" -g medialedger medialedger
fi

# Ensure directories exist and have correct ownership
mkdir -p /config/data /config/logs
chown -R medialedger:medialedger /config
chown -R medialedger:medialedger /app

# Run the command as the medialedger user
exec gosu medialedger sh -c "$@"
