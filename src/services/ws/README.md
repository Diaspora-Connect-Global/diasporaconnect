# WebSocket Message Service

Real-time messaging service using Socket.io for the DiaspoPlug platform.

## Structure
```
ws/
├── messageClient.ts       # Core WebSocket client
├── types/                 # TypeScript interfaces
│   ├── message.ts
│   └── index.ts
├── hooks/                 # React hooks
│   ├── useMessageClient.ts
│   ├── useConversation.ts
│   ├── usePresence.ts
│   └── index.ts
└── index.ts              # Main exports
```

## Usage

### Basic Message Client
```typescript
import { MessageClient } from '@/services/ws';

const client = new MessageClient('jwt-token');
client.setCurrentUserId('user-123');

// Send message
await client.sendMessage({
  conversationId: 'conv-123',
  encryptedData: { ciphertext: 'hello', ephemeralKey: 'key' },
  type: 'text'
});

// Listen for messages
client.onNewMessage((message) => {
  console.log('New message:', message);
});
```

### Using Hooks
```typescript
import { useConversation } from '@/services/ws/hooks';

const { messages, sendTextMessage, isConnected } = useConversation({
  conversationId: 'conv-123',
  jwtToken: 'token',
  currentUserId: 'user-123'
});

await sendTextMessage('Hello!', { ciphertext: 'hello', ephemeralKey: 'key' });
```

## Features

- ✅ Real-time messaging
- ✅ File uploads (images, videos, audio, documents)
- ✅ Message delivery & read receipts
- ✅ User presence tracking
- ✅ Automatic heartbeat
- ✅ End-to-end encryption support
- ✅ Offline message delivery
