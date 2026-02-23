# WebSocket Integration Details

## 🔌 Connection Configuration

### URL
```
Production: wss://api.diaspoplug.net/socket.io/
Development: ws://localhost:5007/socket.io/
```

### Connection Code
```typescript
// File: src/services/websocket/messageService.ts

this.socket = io('https://api.diaspoplug.net', {
  path: '/socket.io/',
  auth: { token: authToken },  // Raw JWT (Bearer prefix stripped)
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
```

## 🔑 Authentication

### Token Flow
```typescript
// 1. Token Retrieved from Auth Store
const tokens = useAuthStore((state) => state.tokens);
const sessionToken = tokens?.sessionToken;

// 2. Token Format (in messageService.ts line 92)
const authToken = token.startsWith('Bearer ')
  ? token.slice(7)  // Strip 'Bearer ' prefix
  : token;          // Use as-is if no prefix

// 3. Sent to Server
auth: { token: authToken }
```

### What the Backend Receives
```javascript
// Socket.IO auth handshake
{
  auth: {
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  // Raw JWT (no Bearer prefix)
  }
}
```

### Token Source
```typescript
// File: src/store/useAuthStore.ts
// Token is stored in sessionStorage under key: "auth-store"

interface AuthTokens {
  accessToken?: string;
  refreshToken?: string;
  sessionToken?: string;  // ← This is what we send to WebSocket
  sessionId: string;
  expiresIn: number | null;
  expiresAt?: number | string;
  refreshTokenExpiresAt?: number | string;
}
```

## 📡 Connection Lifecycle

### 1. Component Initialization
```typescript
// File: src/components/chats/DirectMessageChat.tsx (line 84-120)

useEffect(() => {
  // Only connect if we have both token and conversationId
  if (!sessionToken || !conversationId) return;

  // Connect to WebSocket
  messageService.connect(sessionToken);

  // Setup event listeners
  const unsubConnect = messageService.onConnect(() => {
    setIsConnected(true);
  });

  const unsubDisconnect = messageService.onDisconnect(() => {
    setIsConnected(false);
  });

  const unsubMessage = messageService.onMessage((wsMessage) => {
    // Handle incoming messages
  });

  // Cleanup on unmount
  return () => {
    unsubConnect();
    unsubDisconnect();
    unsubMessage();
  };
}, [sessionToken, conversationId, addApiMessage]);
```

### 2. Server Events We Listen To
```typescript
// Connection events
socket.on('connect', () => { ... });
socket.on('disconnect', (reason) => { ... });
socket.on('connect_error', (error) => { ... });
socket.on('error', (error) => { ... });

// Message events
socket.on('message:new', (data) => { ... });
socket.on('message:sent', (data) => { ... });
socket.on('message:delivered:confirm', (data) => { ... });
socket.on('message:read:confirm', (data) => { ... });

// Presence events
socket.on('presence:update', (data) => { ... });

// Media events
socket.on('media:upload-url', (data) => { ... });
```

### 3. Client Events We Emit
```typescript
// Send message
socket.emit('message:send', {
  conversationId: string,
  type: 'text' | 'image' | 'file' | 'video' | 'audio',
  encryptedData: {
    ciphertext: string,
    iv: string,
    authTag: string
  },
  metadata?: { ... },
  mentions?: string[],
  replyToId?: string
});

// Mark as delivered
socket.emit('message:delivered', {
  messageId: string,
  userId: string,
  conversationId: string
});

// Mark as read
socket.emit('message:read', {
  messageId: string,
  userId: string,
  conversationId: string
});

// Query online users
socket.emit('query:onlineUsers', {
  userIds: string[]
});

// Request media upload URL
socket.emit('media:request-upload-url', {
  conversationId: string,
  fileName: string,
  mimeType: string,
  fileSize: number
});

// Heartbeat
socket.emit('ping');
```

## 🐛 Current Issue: "Invalid or expired token"

### What's Happening
```
🔌 Connecting to WebSocket: https://api.diaspoplug.net
🔑 Token length: XXX characters
🔴 WebSocket error: Invalid or expired token
❌ Disconnected from message service: io server disconnect
```

### Verification Checklist

1. **Token Format**
   - ✅ Bearer prefix is stripped before sending
   - ✅ Raw JWT token sent in `auth.token`
   - ❓ Does backend expect `auth.token` or different key?

2. **Token Value**
   ```javascript
   // Check in browser console:
   const store = JSON.parse(sessionStorage.getItem('auth-store'));
   console.log('Session Token:', store?.state?.tokens?.sessionToken);
   console.log('Token starts with:', store?.state?.tokens?.sessionToken?.substring(0, 20));
   ```

3. **Token Expiration**
   ```javascript
   // Check in browser console:
   const store = JSON.parse(sessionStorage.getItem('auth-store'));
   const expiresAt = new Date(store?.state?.tokens?.expiresAt);
   const now = new Date();
   console.log('Expires at:', expiresAt);
   console.log('Now:', now);
   console.log('Is expired:', now >= expiresAt);
   ```

4. **Backend Expectations**
   - Does backend expect `auth.token` or `auth.accessToken`?
   - Does backend expect Bearer prefix included?
   - Is backend validating against same user database?
   - Is backend using same JWT secret?

## 🔧 Backend Integration Requirements

### Expected Socket.IO Server Setup
```javascript
// On backend (Node.js example)
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error'));
  }

  // Verify JWT
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;  // or whatever field you use
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
});
```

### What Frontend Sends
```javascript
// Handshake
{
  auth: {
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  // Raw JWT
  },
  transport: "websocket",
  EIO: "4",
  path: "/socket.io/"
}
```

## 📊 Debug Steps

### 1. Check Token in Browser Console
```javascript
// Open http://localhost:3000/debug-token.html
// Click "Check Auth Token"
// Click "Decode JWT Token"
```

### 2. Verify Token Payload
```javascript
// In browser console
const store = JSON.parse(sessionStorage.getItem('auth-store'));
const token = store?.state?.tokens?.sessionToken;

// Decode JWT (without verification)
const parts = token.split('.');
const payload = JSON.parse(atob(parts[1]));
console.log('JWT Payload:', payload);
console.log('User ID:', payload.userId || payload.sub);
console.log('Expires:', new Date(payload.exp * 1000));
console.log('Issued:', new Date(payload.iat * 1000));
```

### 3. Compare with GraphQL Token
```javascript
// Check what token GraphQL is using
// File: src/lib/graph-client.ts (line 101-102)
authorization: tokens?.sessionToken
  ? `Bearer ${tokens.sessionToken}`
  : ''

// GraphQL uses: "Bearer <sessionToken>"
// WebSocket uses: "<sessionToken>" (no Bearer prefix)
```

## 🎯 Questions for Backend Team

1. **What auth key do you expect?**
   - `socket.handshake.auth.token` ✅ (what we're sending)
   - `socket.handshake.auth.accessToken`
   - `socket.handshake.headers.authorization`

2. **What token format?**
   - Raw JWT (no prefix) ✅ (what we're sending)
   - "Bearer <token>"
   - Different format?

3. **Which token field?**
   - `sessionToken` ✅ (what we're using)
   - `accessToken`
   - Different field?

4. **Token validation:**
   - Same JWT secret as main API?
   - Same user database?
   - Any additional claims required?

5. **CORS/Origin:**
   - Is `http://localhost:3000` allowed as origin?
   - Any specific headers required?

## 📝 Environment Configuration

Current setup:
```bash
# .env.local
NEXT_PUBLIC_MESSAGE_WS_URL=https://api.diaspoplug.net
```

Backend endpoints:
```
GraphQL API: https://api.diaspoplug.net/graphql
WebSocket:   wss://api.diaspoplug.net/socket.io/
```

Both use the same domain, which is correct.
