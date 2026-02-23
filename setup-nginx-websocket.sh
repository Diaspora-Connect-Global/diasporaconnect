#!/bin/bash

# ============================================
# Nginx WebSocket Setup Script
# ============================================
# Run this script on your server to configure nginx for WebSocket

set -e

echo "🔧 Nginx WebSocket Configuration Setup"
echo "======================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running with Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

# Find nginx container
NGINX_CONTAINER=$(docker ps --filter "name=nginx" --format "{{.Names}}" | head -1)

if [ -z "$NGINX_CONTAINER" ]; then
    echo -e "${RED}❌ No nginx container found${NC}"
    echo "Available containers:"
    docker ps --format "{{.Names}}"
    exit 1
fi

echo -e "${GREEN}✓ Found nginx container: $NGINX_CONTAINER${NC}"

# Backup current config
echo "📦 Backing up current nginx config..."
docker exec $NGINX_CONTAINER sh -c 'cp /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.backup'
echo -e "${GREEN}✓ Backup created at: /etc/nginx/conf.d/default.conf.backup${NC}"

# Check if WebSocket config already exists
if docker exec $NGINX_CONTAINER grep -q "location /socket.io/" /etc/nginx/conf.d/default.conf 2>/dev/null; then
    echo -e "${YELLOW}⚠ WebSocket location already exists in config${NC}"
    echo "Would you like to view it? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        docker exec $NGINX_CONTAINER grep -A 20 "location /socket.io/" /etc/nginx/conf.d/default.conf
    fi
else
    echo -e "${YELLOW}ℹ WebSocket location not found in config${NC}"
    echo "You need to manually add the WebSocket location block."
    echo ""
    echo "Add this to your nginx config:"
    echo "================================"
    cat << 'EOF'

location /socket.io/ {
    proxy_pass http://message-service:5007;

    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_connect_timeout 7d;
    proxy_send_timeout 7d;
    proxy_read_timeout 7d;

    proxy_buffering off;
    proxy_cache_bypass $http_upgrade;
}
EOF
    echo "================================"
    echo ""
fi

# Test nginx config
echo "🧪 Testing nginx configuration..."
if docker exec $NGINX_CONTAINER nginx -t 2>&1 | grep -q "successful"; then
    echo -e "${GREEN}✓ Nginx config is valid${NC}"
else
    echo -e "${RED}❌ Nginx config has errors:${NC}"
    docker exec $NGINX_CONTAINER nginx -t
    exit 1
fi

# Reload nginx
echo "🔄 Reloading nginx..."
docker exec $NGINX_CONTAINER nginx -s reload

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Nginx reloaded successfully${NC}"
else
    echo -e "${RED}❌ Failed to reload nginx${NC}"
    exit 1
fi

# Test WebSocket endpoint
echo ""
echo "🧪 Testing WebSocket endpoint..."
if command -v curl &> /dev/null; then
    RESPONSE=$(curl -I -s -o /dev/null -w "%{http_code}" https://diaspoplug.com/socket.io/ 2>/dev/null)
    if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "101" ]; then
        echo -e "${GREEN}✓ WebSocket endpoint is accessible (HTTP $RESPONSE)${NC}"
    else
        echo -e "${YELLOW}⚠ WebSocket endpoint returned: HTTP $RESPONSE${NC}"
        echo "  This might be OK - Socket.IO endpoints can return various codes"
    fi
else
    echo -e "${YELLOW}⚠ curl not found, skipping endpoint test${NC}"
fi

# Show logs
echo ""
echo "📋 Recent nginx logs:"
echo "===================="
docker logs --tail 10 $NGINX_CONTAINER

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Update frontend .env.local to use: https://diaspoplug.com"
echo "2. Restart your frontend dev server"
echo "3. Test the WebSocket connection"
echo ""
echo "To view full nginx config:"
echo "  docker exec $NGINX_CONTAINER cat /etc/nginx/conf.d/default.conf"
echo ""
echo "To restore backup if needed:"
echo "  docker exec $NGINX_CONTAINER sh -c 'cp /etc/nginx/conf.d/default.conf.backup /etc/nginx/conf.d/default.conf && nginx -s reload'"
