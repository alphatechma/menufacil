#!/bin/sh
set -e

# Replace API URL placeholder in nginx config
sed -i "s|__API_URL__|${API_URL:-http://api:3000}|g" /etc/nginx/conf.d/default.conf

exec "$@"
