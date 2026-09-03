# WebSocket Setup & Troubleshooting Guide

## 🔍 Current Issue
WebSocket connection timeout because nginx is not configured to proxy WebSocket connections to the message service on port 5007.

## 🚀 Quick Fix (Temporary)

### Option A: Direct Connection to Port 5007

**Current Setup** ([.env.local](.env.local)):
```bash
NEXT_PUBLIC_MESSAGE_WS_URL=https://diaspoplug.com:5007
```

**Requirements:**
- Port 5007 must be exposed externally
- SSL certificate must cover port 5007
- Less secure (bypasses nginx security features)

**Test it:**
1. Refresh your browser at http://localhost:3000/en/chat
2. Check console for: `🔌 Connecting to WebSocket: https://diaspoplug.com:5007`
3. Should see: `✅ Connected to message service`

**If it still fails:**
- Port 5007 might not be exposed
- Firewall blocking the port
- SSL certificate doesn't cover custom ports

---

## ✅ Proper Fix (Recommended)

### Option B: Configure Nginx to Proxy WebSocket

This is the **production-ready** approach.

### Step 1: Update Nginx Configuration

Add this to your nginx config (see [nginx-websocket-config.conf](nginx-websocket-config.conf) for full examples):

```nginx
# Add dedicated location for WebSocket
location /socket.io/ {
    # Proxy to message service (Docker Compose service name)
    proxy_pass http://message-service:5007;

    # WebSocket upgrade headers
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;

    # Standard headers
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # WebSocket timeouts
    proxy_connect_timeout 7d;
    proxy_send_timeout 7d;
    proxy_read_timeout 7d;

    # Disable buffering
    proxy_buffering off;
    proxy_cache_bypass $http_upgrade;
}
```

### Step 2: Add Upgrade Header Mapping

At the top of your nginx config (http block):

```nginx
http {
    # WebSocket upgrade header mapping
    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }

    server {
        # ... your server config
    }
}
```

### Step 3: Update Environment Variable

Once nginx is configured, update [.env.local](.env.local):

```bash
# Back to standard URL (nginx will proxy to port 5007)
NEXT_PUBLIC_MESSAGE_WS_URL=https://diaspoplug.com
```

### Step 4: Restart Nginx

```bash
# If using Docker Compose
docker-compose restart nginx

# Or reload nginx
docker exec diaspoplug-nginx nginx -s reload

# Check for errors
docker exec diaspoplug-nginx nginx -t
```

---

## 🧪 Testing

### Test 1: Check Nginx Configuration
```bash
# View current nginx config
docker exec diaspoplug-nginx cat /etc/nginx/conf.d/default.conf

# Look for WebSocket location block
docker exec diaspoplug-nginx cat /etc/nginx/conf.d/default.conf | grep -A 10 "socket.io"
```

### Test 2: Test WebSocket Endpoint
```bash
# Check if endpoint is accessible
curl -I https://diaspoplug.com/socket.io/

# Should return HTTP 200 or 101 (Switching Protocols)
```

### Test 3: Browser Console Test
Open browser console and run:
```javascript
// Test WebSocket connection directly
const ws = new WebSocket('wss://diaspoplug.com/socket.io/?EIO=4&transport=websocket');

ws.onopen = () => console.log('✅ WebSocket connected!');
ws.onerror = (error) => console.error('❌ WebSocket error:', error);
ws.onclose = () => console.log('WebSocket closed');
```

### Test 4: Full App Test
1. Go to http://localhost:3000/en/signin
2. Sign in with valid credentials
3. Go to http://localhost:3000/en/chat
4. Open browser console (F12)
5. Look for:
   ```
   🔌 Connecting to WebSocket: https://diaspoplug.com
   🔑 Token length: XXX characters
   ✅ Connected to message service
   ```

---

## 🐛 Troubleshooting

### Connection Timeout
**Symptom:** `WebSocket connection to 'wss://diaspoplug.com/socket.io/' failed`

**Causes:**
1. Nginx not configured for WebSocket
2. Message service not running
3. Port 5007 not accessible from nginx container
4. Firewall blocking connection

**Fix:**
- Configure nginx with WebSocket proxy (see above)
- Verify message service is running: `docker ps | grep message`
- Check Docker network connectivity

### Invalid Token Error
**Symptom:** `WebSocket error: Invalid or expired token`

**Causes:**
1. Not logged in
2. Token expired
3. Wrong token format

**Fix:**
- Sign in again to get fresh token
- Check token in console:
  ```javascript
  JSON.parse(sessionStorage.getItem('auth-store'))?.state?.tokens
  ```
- Visit http://localhost:3000/debug-token.html

### Connection Closes Immediately
**Symptom:** `❌ Disconnected from message service: io server disconnect`

**Causes:**
1. Server rejecting connection
2. Authentication failure
3. Server restarted

**Fix:**
- Check server logs: `docker logs message-service`
- Verify token is valid
- Check if server is running

---

## 📊 Architecture Overview

```
Browser (localhost:3000)
    ↓
    | WebSocket: wss://diaspoplug.com/socket.io/
    ↓
Nginx (port 443)
    ↓
    | Proxy to: http://message-service:5007
    ↓
Message Service (port 5007)
```

---

## 🔧 Environment Configuration

### Development (Local Backend)
```bash
NEXT_PUBLIC_MESSAGE_WS_URL=http://localhost:5007
```

### Production (Direct - Temporary)
```bash
NEXT_PUBLIC_MESSAGE_WS_URL=https://diaspoplug.com:5007
```

### Production (Nginx Proxy - Recommended)
```bash
NEXT_PUBLIC_MESSAGE_WS_URL=https://diaspoplug.com
```

---

## 📝 Checklist

- [ ] Nginx configured with WebSocket proxy
- [ ] Nginx restarted/reloaded
- [ ] Message service running on port 5007
- [ ] Environment variable updated
- [ ] Dev server restarted
- [ ] Signed in with valid credentials
- [ ] WebSocket connects successfully
- [ ] Can send and receive messages

---

## 🆘 Need Help?

1. **Check logs:**
   ```bash
   # Nginx logs
   docker logs diaspoplug-nginx

   # Message service logs
   docker logs message-service

   # Browser console (F12)
   ```

2. **Debug token:** Visit http://localhost:3000/debug-token.html

3. **Test endpoint:**
   ```bash
   curl -I https://diaspoplug.com/socket.io/
   ```

4. **Verify service:**
   ```bash
   docker ps | grep message
   netstat -tulpn | grep 5007
   ```
