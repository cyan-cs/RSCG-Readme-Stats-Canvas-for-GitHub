#!/bin/sh
set -eu

chown -R node:node /app/data
exec su-exec node:node node server.js
