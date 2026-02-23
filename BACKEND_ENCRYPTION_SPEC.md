# Backend Encryption Implementation Specification

## Overview

Frontend will send **plaintext messages** over secure WebSocket connection. Backend will handle all Signal Protocol encryption/decryption before storing or forwarding messages.

---

## Current Frontend Implementation

### WebSocket Connection
- **URL**: `wss://api.diaspoplug.net/socket.io/`
- **Authentication**: `auth: { token: accessToken }` (raw JWT, no "Bearer" prefix)
- **Transport**: WebSocket with polling fallback

### Current Message Send Event

**Event**: `message:send`

**Current Payload** (what frontend sends now):
```typescript
{
  conversationId: string,
  type: 'text' | 'image' | 'file' | 'video' | 'audio',
  encryptedData: {
    version: 1,
    ciphertext: string,      // Base64 - MOCK encryption (just btoa)
    messageKey: string,       // Base64 - MOCK data
    sessionSetup?: {
      identityKey: string,
      signedPreKey: string,
      signature: string,
      ephemeralKey: string,
      oneTimePreKeyId?: number
    },
    doubleRatchetHeader: {
      publicKey: string,
      messageNumber: number,
      previousChainLength: number
    }
  },
  metadata?: {
    fileName?: string,
    fileSize?: number,
    mimeType?: string,
    duration?: number,
    dimensions?: { width: number, height: number }
  },
  mentions?: string[],
  replyToId?: string
}
```

---

## 🎯 Required Backend Changes

### Option A: Simplest Migration (Recommended for Quick Fix)

**Change the WebSocket event to accept plaintext instead of encryptedData**

#### New Message Send Event

**Event**: `message:send`

**New Payload**:
```typescript
{
  conversationId: string,
  type: 'text' | 'image' | 'file' | 'video' | 'audio',
  content: string,           // ✅ PLAINTEXT message content
  recipientIds: string[],    // ✅ List of recipient user IDs
  metadata?: {
    fileName?: string,
    fileSize?: number,
    mimeType?: string,
    duration?: number,
    dimensions?: { width: number, height: number }
  },
  mentions?: string[],
  replyToId?: string
}
```

#### Backend Processing Flow

1. **Receive Message** from frontend via WebSocket
   ```typescript
   socket.on('message:send', async (data) => {
     const { conversationId, content, recipientIds, type, metadata } = data;
     const senderId = socket.userId; // From auth token

     // ... continue processing
   });
   ```

2. **Encrypt for Each Recipient** using Signal Protocol
   ```typescript
   const encryptedMessages = await Promise.all(
     recipientIds.map(async (recipientId) => {
       // Use your existing Signal Protocol service
       const encryptedPayload = await signalProtocolService.encrypt({
         plaintext: content,
         senderId: senderId,
         recipientId: recipientId
       });

       return {
         recipientId,
         encryptedPayload  // Your EncryptedPayload VO
       };
     })
   );
   ```

3. **Store Encrypted Messages** in database
   ```typescript
   await messageRepository.saveMessage({
     conversationId,
     senderId,
     type,
     encryptedMessages,  // One per recipient
     metadata,
     createdAt: new Date()
   });
   ```

4. **Forward to Online Recipients** via WebSocket
   ```typescript
   recipientIds.forEach((recipientId) => {
     const recipientSocket = getSocketByUserId(recipientId);
     if (recipientSocket?.connected) {
       recipientSocket.emit('message:new', {
         messageId: savedMessage.id,
         conversationId,
         senderId,
         encryptedPayload: encryptedMessages.find(m => m.recipientId === recipientId).encryptedPayload,
         type,
         metadata,
         createdAt: savedMessage.createdAt
       });
     }
   });
   ```

5. **Confirm to Sender**
   ```typescript
   socket.emit('message:sent', {
     messageId: savedMessage.id,
     conversationId,
     tempId: data.tempId,  // If frontend provides temp ID
     createdAt: savedMessage.createdAt
   });
   ```

---

### Option B: Keep Current Format (More Frontend Changes)

If you want to keep the current event structure, backend should:

1. **Accept the current payload format**
2. **Decrypt `encryptedData.ciphertext`** using `atob()` (since it's just Base64 now)
3. **Re-encrypt properly** using Signal Protocol
4. **Store and forward** with real encryption

**This requires frontend to continue sending the complex structure, which is unnecessary.**

---

## 📡 Complete WebSocket Event Flow

### 1. Send Message (Frontend → Backend)

**Frontend emits**:
```typescript
socket.emit('message:send', {
  conversationId: '123e4567-e89b-12d3-a456-426614174000',
  type: 'text',
  content: 'Hello, how are you?',  // Plaintext
  recipientIds: ['user-abc-123', 'user-def-456'],
  mentions: ['user-abc-123'],
  replyToId: null
});
```

### 2. Receive Message (Backend → Frontend)

**Backend emits to recipients**:
```typescript
socket.emit('message:new', {
  messageId: '789e4567-e89b-12d3-a456-426614174999',
  conversationId: '123e4567-e89b-12d3-a456-426614174000',
  senderId: 'user-xyz-789',
  encryptedPayload: {
    version: 1,
    ciphertext: 'base64-encrypted-content',
    messageKey: 'base64-message-key',
    sessionSetup: { /* only if first message */ },
    doubleRatchetHeader: {
      publicKey: 'base64-public-key',
      messageNumber: 42,
      previousChainLength: 41
    }
  },
  type: 'text',
  metadata: null,
  createdAt: '2026-02-23T10:30:00Z'
});
```

### 3. Send Confirmation (Backend → Sender)

**Backend emits to sender**:
```typescript
socket.emit('message:sent', {
  messageId: '789e4567-e89b-12d3-a456-426614174999',
  conversationId: '123e4567-e89b-12d3-a456-426614174000',
  createdAt: '2026-02-23T10:30:00Z'
});
```

---

## 🔐 Encryption Details for Backend

### What Backend Already Has (Assumptions)

Based on your `encrypted-payload.vo.ts`, you likely have:

1. **Signal Protocol Service** - Encrypts/decrypts messages
2. **Key Management** - Stores identity keys, pre-keys, sessions
3. **EncryptedPayload VO** - Matches the format above

### What Backend Needs to Do

#### When Receiving Message from Sender:

```typescript
// Input: Plaintext message from sender
const plaintext = "Hello, how are you?";
const senderId = "user-xyz-789";
const recipientId = "user-abc-123";

// Process: Encrypt using Signal Protocol
const encryptedPayload = await signalProtocolService.encrypt({
  plaintext,
  senderId,
  recipientId
});

// Output: EncryptedPayload (your existing VO)
{
  version: 1,
  ciphertext: "encrypted-base64-data",
  messageKey: "derived-base64-key",
  sessionSetup: { /* if needed */ },
  doubleRatchetHeader: {
    publicKey: "ratchet-public-key",
    messageNumber: 42,
    previousChainLength: 41
  }
}
```

#### When Sending Message to Recipient:

```typescript
// Send the encrypted payload to recipient
recipientSocket.emit('message:new', {
  messageId: savedMessage.id,
  conversationId,
  senderId,
  encryptedPayload,  // The encrypted payload from above
  type: 'text',
  metadata: null,
  createdAt: new Date()
});
```

#### When Recipient Fetches Old Messages (GraphQL):

```typescript
// Query: getMessages(conversationId)
// For each message in database:
const recipientId = currentUser.id;
const message = await messageRepository.findById(messageId);

// Decrypt for this specific recipient
const decryptedContent = await signalProtocolService.decrypt({
  encryptedPayload: message.encryptedPayloads.find(p => p.recipientId === recipientId),
  senderId: message.senderId,
  recipientId
});

// Return to frontend
{
  messageId: message.id,
  content: decryptedContent,  // Decrypted plaintext
  senderId: message.senderId,
  createdAt: message.createdAt
}
```

---

## 🔄 Database Schema Changes

### Current Schema (Assumption)

```typescript
Message {
  id: UUID
  conversationId: UUID
  senderId: UUID
  type: MessageType
  encryptedData: JSON  // Currently stores mock encrypted payload
  metadata: JSON
  createdAt: DateTime
}
```

### Recommended Schema

```typescript
Message {
  id: UUID
  conversationId: UUID
  senderId: UUID
  type: MessageType
  // Store encrypted version for EACH recipient
  encryptedPayloads: EncryptedMessagePayload[]
  metadata: JSON
  createdAt: DateTime
}

EncryptedMessagePayload {
  id: UUID
  messageId: UUID
  recipientId: UUID
  encryptedPayload: JSON  // Your EncryptedPayload VO
}
```

**Why per-recipient?** Signal Protocol uses different encryption keys for each recipient, so you need to store one encrypted version per recipient.

---

## 📋 Implementation Checklist for Backend Team

### Phase 1: Update WebSocket Handler ✅

- [ ] Modify `message:send` handler to accept `content` (plaintext) instead of `encryptedData`
- [ ] Extract `recipientIds` from conversation participants
- [ ] Remove mock encryption handling

### Phase 2: Encrypt Messages ✅

- [ ] For each recipient, call Signal Protocol service to encrypt
- [ ] Handle session initialization (first message to recipient)
- [ ] Store encrypted payloads per recipient in database

### Phase 3: Forward Encrypted Messages ✅

- [ ] Emit `message:new` to online recipients with their encrypted payload
- [ ] Emit `message:sent` confirmation to sender
- [ ] Queue offline messages for later delivery

### Phase 4: GraphQL Query Updates ✅

- [ ] Update `getMessages` query to return decrypted messages
- [ ] Decrypt using current user's session
- [ ] Handle decryption failures gracefully

### Phase 5: Testing ✅

- [ ] Test message send with single recipient
- [ ] Test message send with multiple recipients (group chat)
- [ ] Test message retrieval (old messages)
- [ ] Test session initialization (first message)
- [ ] Test forward secrecy (verify different keys per message)

---

## 🧪 Testing & Validation

### Test Case 1: Send Text Message

**Frontend Action**:
```javascript
socket.emit('message:send', {
  conversationId: 'conv-123',
  type: 'text',
  content: 'Test message',
  recipientIds: ['user-abc']
});
```

**Expected Backend Behavior**:
1. Receive plaintext "Test message"
2. Encrypt for user-abc using Signal Protocol
3. Store encrypted payload in database
4. Emit `message:new` to user-abc with encrypted payload
5. Emit `message:sent` to sender

**Validation**:
- Check database has encrypted data (not plaintext "Test message")
- Check encrypted payload has proper Signal Protocol structure
- Check recipient receives encrypted payload

### Test Case 2: Group Message

**Frontend Action**:
```javascript
socket.emit('message:send', {
  conversationId: 'group-456',
  type: 'text',
  content: 'Hello everyone',
  recipientIds: ['user-1', 'user-2', 'user-3']
});
```

**Expected Backend Behavior**:
1. Encrypt same message 3 times (once per recipient with their keys)
2. Store 3 encrypted payloads in database
3. Emit to each online recipient

**Validation**:
- Database has 3 different encrypted payloads for same message
- Each recipient can decrypt their version
- Encrypted payloads are DIFFERENT (different keys per recipient)

---

## 🚨 Security Considerations

### 1. Transport Security
- ✅ WebSocket connection is already over WSS (TLS)
- ✅ Plaintext only travels encrypted tunnel
- ❌ Never log plaintext content on backend

### 2. Storage Security
- ✅ Store only encrypted payloads in database
- ✅ Use Signal Protocol for forward secrecy
- ❌ Never store plaintext in database (even temporarily)

### 3. Key Management
- ✅ Rotate pre-keys regularly
- ✅ Invalidate one-time pre-keys after use
- ✅ Implement key expiration policy

### 4. Access Control
- ✅ Verify sender is member of conversation
- ✅ Only encrypt for valid conversation participants
- ✅ Rate limit message sending per user

---

## 📞 API Reference for Frontend Team

### What Frontend Will Change

#### Before (Current - Mock Encryption):
```typescript
const encrypted = await encryptMessage(messageText, conversationId);
socket.emit('message:send', {
  conversationId,
  type: 'text',
  encryptedData: encrypted,  // Complex mock structure
  // ...
});
```

#### After (Backend Encryption):
```typescript
socket.emit('message:send', {
  conversationId,
  type: 'text',
  content: messageText,  // Plain text
  recipientIds,          // List of recipient IDs
  // ...
});
```

### Frontend Files to Update

1. **`src/components/chats/DirectMessageChat.tsx`** (line ~180-200)
   - Remove `encryptMessage()` call
   - Send plaintext `content` instead of `encryptedData`

2. **`src/components/chats/GroupChat.tsx`** (similar changes)
   - Remove encryption logic
   - Send plaintext

3. **`src/services/websocket/messageService.ts`**
   - Update `sendMessage()` method signature
   - Remove `encryptedData` field

4. **Can delete** (no longer needed):
   - `src/utils/signalProtocol.ts`
   - `src/utils/encryption.ts`

---

## 🎯 Summary for Backend Team

**What to do**:
1. Accept plaintext messages from frontend via WebSocket
2. Encrypt each message for each recipient using your existing Signal Protocol service
3. Store encrypted versions in database (one per recipient)
4. Forward encrypted messages to recipients via WebSocket
5. Return decrypted messages in GraphQL queries

**What NOT to do**:
- Don't expect frontend to send encrypted data anymore
- Don't store plaintext in database
- Don't log plaintext content

**Benefits**:
- ✅ Security handled by backend (where Signal Protocol library works)
- ✅ Frontend simplified (no browser crypto issues)
- ✅ Centralized key management
- ✅ Easier to audit and secure

---

## 📝 Questions for Backend Team

1. **Do you have Signal Protocol service already implemented?**
   - If yes: We just need to wire it up to WebSocket
   - If no: Do you need implementation guidance?

2. **Current database schema for messages?**
   - Does it support per-recipient encryption?
   - Do you need migration script?

3. **How do you get recipient IDs from conversation ID?**
   - Should frontend send `recipientIds` or backend looks it up?

4. **Timeline for implementation?**
   - Should frontend wait, or use temporary mock in meantime?

---

## 📧 Contact

Frontend implementation ready and waiting for backend changes.
Test environment: http://localhost:3000
WebSocket URL: wss://api.diaspoplug.net/socket.io/

Ready to test as soon as backend implements plaintext message handling!
