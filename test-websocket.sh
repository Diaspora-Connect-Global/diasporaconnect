#!/bin/bash

# WebSocket Connection Test Script
echo "🧪 Testing WebSocket Endpoint"
echo "=============================="

# Test 1: Check if endpoint is reachable
echo ""
echo "Test 1: Checking endpoint..."
RESPONSE=$(curl -I -s -o /dev/null -w "%{http_code}" https://diaspoplug.com/socket.io/ 2>/dev/null)

if [ -z "$RESPONSE" ]; then
    echo "❌ No response from server"
    echo "   Possible causes:"
    echo "   - Server is down"
    echo "   - DNS not resolving"
    echo "   - Firewall blocking connection"
else
    echo "✓ Server responded with HTTP $RESPONSE"
    if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "400" ]; then
        echo "  This is expected for Socket.IO endpoint"
    fi
fi

# Test 2: Check if WebSocket upgrade is supported
echo ""
echo "Test 2: Checking WebSocket upgrade support..."
curl -s -I \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  https://diaspoplug.com/socket.io/ 2>&1 | grep -i "upgrade"

if [ $? -eq 0 ]; then
    echo "✓ WebSocket upgrade headers detected"
else
    echo "⚠ No WebSocket upgrade headers"
    echo "  This might indicate nginx is not configured for WebSocket"
fi

# Test 3: Verbose curl test
echo ""
echo "Test 3: Detailed endpoint test..."
curl -v https://diaspoplug.com/socket.io/ 2>&1 | grep -E "(< HTTP|< Connection|< Upgrade|Socket.IO)"

echo ""
echo "=============================="
echo "Test complete!"
echo ""
echo "Next steps:"
echo "1. If tests passed, refresh your browser at http://localhost:3000/en/chat"
echo "2. Check browser console for: ✅ Connected to message service"
echo "3. If still failing, check nginx logs: docker logs your-nginx-container"
