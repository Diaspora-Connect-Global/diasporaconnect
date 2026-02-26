import { io, Socket } from 'socket.io-client';

/**
 * Message WebSocket client. Per backend spec, connect via the API Gateway (e.g. port 3000).
 * Auth: pass session ID or JWT in auth: { token } (no "Bearer " prefix).
 *
 * Payload received from backend via 'message:new' WebSocket event.
 * Backend encrypts content; use GraphQL getMessages for plaintext.
 */
export interface Message {
  messageId: string;
  conversationId: string;
  senderId: string;
  /** Server-side encrypted payload; treat as opaque notification trigger */
  encryptedData: unknown;
  type: 'text' | 'image' | 'file' | 'video' | 'audio';
  timestamp: string;
  isOffline?: boolean;
  mentions?: string[];
  replyToId?: string;
}

// Message payload to send to backend (we send plaintext)
export interface SendMessagePayload {
  conversationId: string; // Required: UUID of conversation
  type: 'text' | 'image' | 'file' | 'video' | 'audio'; // Required: Message type
  content: string; // Required: Plaintext message content
  mentions?: string[]; // Optional: Array of mentioned user IDs
  replyToId?: string; // Optional: Message ID being replied to
  idempotencyKey?: string; // Optional: same key on retry/double-send avoids duplicate messages
  metadata?: {
    fileId?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    gcsPath?: string;
    width?: number;
    height?: number;
  };
}

export interface MediaUploadResponse {
  uploadUrl: string;
  fileId: string;
  key: string;
  expiresIn: number;
}

class MessageService {
  private socket: Socket | null = null;
  private messageCallbacks: ((message: Message) => void)[] = [];
  private messageSentCallbacks: ((data: { messageId: string; conversationId: string }) => void)[] = [];
  private messageDeliveredCallbacks: ((data: { messageId: string; conversationId?: string; userId: string; status: 'delivered' }) => void)[] = [];
  private messageReadCallbacks: ((data: { messageId: string; conversationId?: string; userId: string; status: 'read' }) => void)[] = [];
  private conversationReadCallbacks: ((data: { conversationId: string; userId: string }) => void)[] = [];
  private conversationReadAckCallbacks: ((data: { conversationId: string; updatedCount: number }) => void)[] = [];
  private presenceCallbacks: ((data: { userId: string; isOnline: boolean; lastSeen?: string; timestamp?: number }) => void)[] = [];
  private pongCallbacks: ((data: { timestamp: number }) => void)[] = [];
  private connectCallbacks: (() => void)[] = [];
  private disconnectCallbacks: (() => void)[] = [];
  private uploadUrlCallbacks: ((data: MediaUploadResponse) => void)[] = [];

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  connect(token: string) {
    // Validate token exists
    if (!token || token.trim() === '') {
      console.error('❌ Cannot connect to WebSocket: No token provided');
      return;
    }

    // Avoid creating duplicate connections
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    // Disconnect any existing socket first
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    // Pass raw JWT token - server handles auth directly
    const authToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    // Connect via API Gateway (spec: port 3000). Set NEXT_PUBLIC_MESSAGE_WS_URL to your gateway (e.g. https://your-domain:3000).
    const SOCKET_URL = process.env.NEXT_PUBLIC_MESSAGE_WS_URL || 'https://api.diaspoplug.net';

    console.log(`🔌 Connecting to WebSocket: ${SOCKET_URL}`);
    console.log(`🔑 Token length: ${authToken.length} characters`);

    this.socket = io(SOCKET_URL, {
      path: '/socket.io/',
      auth: { token: authToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to message service');
      this.connectCallbacks.forEach(cb => cb());
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from message service:', reason);
      this.disconnectCallbacks.forEach(cb => cb());
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔴 WebSocket connection error:', error.message);
      if (error.message.includes('token')) {
        console.error('💡 Hint: Check if your authentication token is valid and not expired');
      }
    });

    this.socket.on('error', (error: unknown) => {
      const msg = typeof error === 'string' ? error : (error as Error)?.message ?? String(error);
      console.error('🔴 WebSocket error:', msg);

      if (msg.toLowerCase().includes('connection failed')) {
        console.warn('💡 Message server rejected the connection. Check: (1) Auth token is valid and not expired, (2) Message service backend is running and accepts this token.');
      } else if (typeof error === 'string' && error.includes('token')) {
        console.warn('💡 Token issue. Sign in again to get a fresh token.');
      } else if (typeof error === 'string' && error.includes('message')) {
        console.warn('💡 Check message format and required fields.');
      }
    });

    this.socket.on('message:new', (data: Message) => {
      this.messageCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('message:sent', (data: { messageId: string; conversationId: string }) => {
      console.log('✅ Message sent confirmed:', data.messageId);
      this.messageSentCallbacks.forEach(cb => cb(data));
    });

    // Delivery receipts — only sender receives these
    this.socket.on('message:delivery', (data: { messageId: string; conversationId?: string; userId: string; status: 'delivered' }) => {
      this.messageDeliveredCallbacks.forEach(cb => cb(data));
    });

    // Read receipts — only sender receives these
    this.socket.on('message:read', (data: { messageId: string; conversationId?: string; userId: string; status: 'read' }) => {
      this.messageReadCallbacks.forEach(cb => cb(data));
    });

    // Another participant read the conversation (e.g. for "read by" in group chats)
    this.socket.on('conversation:read', (data: { conversationId: string; userId: string }) => {
      this.conversationReadCallbacks.forEach(cb => cb(data));
    });

    // Ack when we emit conversation:read — use updatedCount to set unreadCount = 0 locally if desired
    this.socket.on('conversation:read:ack', (data: { conversationId: string; updatedCount: number }) => {
      this.conversationReadAckCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('presence:update', (data: { userId: string; isOnline: boolean; lastSeen?: string; timestamp?: number }) => {
      this.presenceCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('media:upload-url', (data: MediaUploadResponse) => {
      this.uploadUrlCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('pong', (data: { timestamp: number }) => {
      this.pongCallbacks.forEach(cb => cb(data));
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  sendMessage(payload: SendMessagePayload) {
    if (!this.isConnected) {
      console.warn('Cannot send message: socket not connected');
      return;
    }
    console.log('📤 Sending message via WebSocket:', {
      conversationId: payload.conversationId,
      type: payload.type,
      contentLength: payload.content?.length ?? 0,
      hasMentions: !!payload.mentions,
      hasReplyTo: !!payload.replyToId,
    });
    this.socket!.emit('message:send', payload);
  }

  markAsDelivered(data: { messageId: string; userId: string; conversationId: string }) {
    if (!this.isConnected) return;
    this.socket!.emit('message:delivered', data);
  }

  markAsRead(data: { messageId: string; userId: string; conversationId: string }) {
    if (!this.isConnected) return;
    this.socket!.emit('message:read', data);
  }

  requestMediaUploadUrl(data: {
    conversationId: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }) {
    if (!this.isConnected) {
      console.warn('Cannot request upload URL: socket not connected');
      return;
    }
    this.socket!.emit('media:request-upload-url', data);
  }

  queryPresence(userId: string) {
    if (!this.isConnected) return;
    this.socket!.emit('query:presence', { userId });
  }

  queryOnlineUsers(userIds: string[]) {
    if (!this.isConnected) return;
    this.socket!.emit('query:onlineUsers', { userIds });
  }

  sendHeartbeat() {
    if (!this.isConnected) return;
    this.socket!.emit('ping');
  }

  onConnect(callback: () => void) {
    this.connectCallbacks.push(callback);
    return () => {
      this.connectCallbacks = this.connectCallbacks.filter(cb => cb !== callback);
    };
  }

  onDisconnect(callback: () => void) {
    this.disconnectCallbacks.push(callback);
    return () => {
      this.disconnectCallbacks = this.disconnectCallbacks.filter(cb => cb !== callback);
    };
  }

  onMessage(callback: (message: Message) => void) {
    this.messageCallbacks.push(callback);
    return () => {
      this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback);
    };
  }

  onMessageSent(callback: (data: { messageId: string; conversationId: string }) => void) {
    this.messageSentCallbacks.push(callback);
    return () => {
      this.messageSentCallbacks = this.messageSentCallbacks.filter(cb => cb !== callback);
    };
  }

  onMessageDelivered(callback: (data: { messageId: string; conversationId?: string; userId: string; status: 'delivered' }) => void) {
    this.messageDeliveredCallbacks.push(callback);
    return () => {
      this.messageDeliveredCallbacks = this.messageDeliveredCallbacks.filter(cb => cb !== callback);
    };
  }

  onMessageRead(callback: (data: { messageId: string; conversationId?: string; userId: string; status: 'read' }) => void) {
    this.messageReadCallbacks.push(callback);
    return () => {
      this.messageReadCallbacks = this.messageReadCallbacks.filter(cb => cb !== callback);
    };
  }

  onConversationRead(callback: (data: { conversationId: string; userId: string }) => void) {
    this.conversationReadCallbacks.push(callback);
    return () => {
      this.conversationReadCallbacks = this.conversationReadCallbacks.filter(cb => cb !== callback);
    };
  }

  onConversationReadAck(callback: (data: { conversationId: string; updatedCount: number }) => void) {
    this.conversationReadAckCallbacks.push(callback);
    return () => {
      this.conversationReadAckCallbacks = this.conversationReadAckCallbacks.filter(cb => cb !== callback);
    };
  }

  /** Emit when user opens a conversation (Option B for marking as read; we also use GraphQL mutation). */
  markConversationAsRead(conversationId: string, userId: string) {
    if (!this.isConnected) return;
    this.socket!.emit('conversation:read', { conversationId, userId });
  }

  onPresenceUpdate(callback: (data: { userId: string; isOnline: boolean; lastSeen?: string; timestamp?: number }) => void) {
    this.presenceCallbacks.push(callback);
    return () => {
      this.presenceCallbacks = this.presenceCallbacks.filter(cb => cb !== callback);
    };
  }

  onPong(callback: (data: { timestamp: number }) => void) {
    this.pongCallbacks.push(callback);
    return () => {
      this.pongCallbacks = this.pongCallbacks.filter(cb => cb !== callback);
    };
  }

  onMediaUploadUrl(callback: (data: MediaUploadResponse) => void) {
    this.uploadUrlCallbacks.push(callback);
    return () => {
      this.uploadUrlCallbacks = this.uploadUrlCallbacks.filter(cb => cb !== callback);
    };
  }
}

export const messageService = new MessageService();
