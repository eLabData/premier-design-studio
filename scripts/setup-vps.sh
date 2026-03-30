#!/bin/bash
# Run on VPS as root/sudo
# One-time setup for studio.elabdata.com.br

set -e

# Install certbot if not present
apt-get update && apt-get install -y certbot python3-certbot-nginx

# Get SSL cert
certbot certonly --nginx -d studio.elabdata.com.br --non-interactive --agree-tos -m deploy@elabdata.com.br

# Copy nginx config
cp nginx/studio.elabdata.com.br.conf /etc/nginx/sites-available/studio.elabdata.com.br
ln -sf /etc/nginx/sites-available/studio.elabdata.com.br /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo "Done! studio.elabdata.com.br is configured."
