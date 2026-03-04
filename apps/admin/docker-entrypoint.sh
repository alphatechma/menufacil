#!/bin/sh
set -e

# Replace API URL placeholder in nginx config
sed -i "s|__API_URL__|${API_URL:-http://api:3000}|g" /etc/nginx/conf.d/default.conf

# Generate runtime config with customer URL
cat > /usr/share/nginx/html/runtime-config.js <<JSEOF
window.__RUNTIME_CONFIG__ = { CUSTOMER_URL: "${CUSTOMER_URL:-}" };
JSEOF

echo "=== runtime-config.js ==="
cat /usr/share/nginx/html/runtime-config.js
echo "========================="

exec "$@"
