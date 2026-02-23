import { io, Socket } from 'socket.io-client';

// Message received from backend (backend sends encrypted data)
export interface Message {
  messageId: string;
  conversationId: string;
  senderId: string;
  type: 'text' | 'image' | 'file' | 'video' | 'audio';
  encryptedData: any; // Backend sends encrypted data (handled by backend)
  timestamp: string;
  isOffline?: boolean; // true if sent while user was offline
  metadata?: {
    fileId?: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    gcsPath: string;
    width?: number;
    height?: number;
  };
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
  private messageDeliveredCallbacks: ((data: { messageId: string; userId: string }) => void)[] = [];
  private messageReadCallbacks: ((data: { messageId: string; userId: string }) => void)[] = [];
  private presenceCallbacks: ((data: { userId: string; isOnline: boolean; timestamp: string }) => void)[] = [];
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

    // Use environment variable for WebSocket URL, with fallback
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

    this.socket.on('error', (error: any) => {
      console.error('🔴 WebSocket error:', error);
      console.error('Error type:', typeof error);
      console.error('Error details:', JSON.stringify(error, null, 2));

      if (typeof error === 'string' && error.includes('token')) {
        console.error('💡 Token issue detected. Please sign in again to get a fresh token.');
      }

      if (typeof error === 'string' && error.includes('message')) {
        console.error('💡 Message sending issue. Check message format and required fields.');
      }
    });

    this.socket.on('message:new', (data: Message) => {
      this.messageCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('message:sent', (data: { messageId: string; conversationId: string }) => {
      this.messageSentCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('message:delivered:confirm', (data: { messageId: string; userId: string }) => {
      this.messageDeliveredCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('message:read:confirm', (data: { messageId: string; userId: string }) => {
      this.messageReadCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('presence:update', (data: { userId: string; isOnline: boolean; timestamp: string }) => {
      this.presenceCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('media:upload-url', (data: MediaUploadResponse) => {
      this.uploadUrlCallbacks.forEach(cb => cb(data));
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
      hasEncryptedData: !!payload.encryptedData,
      encryptedDataKeys: payload.encryptedData ? Object.keys(payload.encryptedData) : [],
      hasMentions: !!payload.mentions,
      hasReplyTo: !!payload.replyToId,
    });
    console.log('📦 Full payload:', JSON.stringify(payload, null, 2));
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

  onMessageDelivered(callback: (data: { messageId: string; userId: string }) => void) {
    this.messageDeliveredCallbacks.push(callback);
    return () => {
      this.messageDeliveredCallbacks = this.messageDeliveredCallbacks.filter(cb => cb !== callback);
    };
  }

  onMessageRead(callback: (data: { messageId: string; userId: string }) => void) {
    this.messageReadCallbacks.push(callback);
    return () => {
      this.messageReadCallbacks = this.messageReadCallbacks.filter(cb => cb !== callback);
    };
  }

  onPresenceUpdate(callback: (data: { userId: string; isOnline: boolean; timestamp: string }) => void) {
    this.presenceCallbacks.push(callback);
    return () => {
      this.presenceCallbacks = this.presenceCallbacks.filter(cb => cb !== callback);
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
