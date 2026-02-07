import { io, Socket } from 'socket.io-client';

interface AuthToken {
  token: string;
}

interface MessageData {
  conversationId: string;
  encryptedData: {
    ciphertext: string;
    ephemeralKey: string;
  };
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    fileId?: string;
    key?: string;
  };
  replyToId?: string;
}

interface IncomingMessage {
  messageId: string;
  conversationId: string;
  senderId: string;
  encryptedData: {
    ciphertext: string;
    ephemeralKey: string;
  };
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  timestamp: string;
  isOffline?: boolean;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    fileId?: string;
    key?: string;
  };
  replyToId?: string;
}

interface MessageSentResponse {
  messageId: string;
  conversationId: string;
}

interface DeliveryStatus {
  messageId: string;
  userId: string;
  status: 'delivered';
}

interface ReadStatus {
  messageId: string;
  userId: string;
  status: 'read';
}

interface PresenceResponse {
  userId: string;
  isOnline: boolean;
  lastSeen?: string;
}

interface PresenceUpdate {
  userId: string;
  isOnline: boolean;
  timestamp?: string;
  lastSeen?: string;
}

interface OnlineUsersResponse {
  onlineUsers: string[];
  count: number;
}

interface MediaUploadRequest {
  conversationId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

interface MediaUploadResponse {
  uploadUrl: string;
  fileId: string;
  key: string;
  expiresIn: number;
}

interface MessageClientConfig {
  url?: string;
  path?: string;
  transports?: ('websocket' | 'polling')[];
}

export class MessageClient {
  private socket: Socket;
  private currentUserId?: string;

  constructor(jwtToken: string, config?: MessageClientConfig) {
    const defaultConfig: MessageClientConfig = {
      url: 'https://api.diaspoplug.net',
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
    };

    const finalConfig = { ...defaultConfig, ...config };

    this.socket = io(finalConfig.url!, {
      path: finalConfig.path,
      auth: { token: jwtToken } as AuthToken,
      transports: finalConfig.transports,
    });

    this.setupBaseListeners();
  }

  private setupBaseListeners() {
    this.socket.on('connect', () => {
      console.log('✅ Connected to Message Service');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from Message Service:', reason);
    });

    this.socket.on('error', (message: string) => {
      console.error('❌ Message Service Error:', message);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection Error:', error.message);
    });
  }

  // Set current user ID for automatic delivery confirmations
  setCurrentUserId(userId: string) {
    this.currentUserId = userId;
  }

  // ==================== SEND MESSAGE ====================
  sendMessage(data: MessageData): Promise<MessageSentResponse> {
    return new Promise((resolve, reject) => {
      this.socket.emit('message:send', data);

      const timeout = setTimeout(() => {
        reject(new Error('Message send timeout'));
      }, 10000);

      this.socket.once('message:sent', (response: MessageSentResponse) => {
        clearTimeout(timeout);
        resolve(response);
      });

      this.socket.once('error', (error: string) => {
        clearTimeout(timeout);
        reject(new Error(error));
      });
    });
  }

  // ==================== RECEIVE MESSAGES ====================
  onNewMessage(callback: (message: IncomingMessage) => void) {
    this.socket.on('message:new', (message: IncomingMessage) => {
      callback(message);

      // Auto-mark as delivered if currentUserId is set
      if (this.currentUserId) {
        this.markAsDelivered({
          messageId: message.messageId,
          userId: this.currentUserId,
          conversationId: message.conversationId,
        });
      }
    });
  }

  // ==================== DELIVERY STATUS ====================
  markAsDelivered(data: {
    messageId: string;
    userId: string;
    conversationId: string;
  }) {
    this.socket.emit('message:delivered', data);
  }

  onDeliveryUpdate(callback: (status: DeliveryStatus) => void) {
    this.socket.on('message:delivery', callback);
  }

  // ==================== READ STATUS ====================
  markAsRead(data: {
    messageId: string;
    userId: string;
    conversationId: string;
  }) {
    this.socket.emit('message:read', data);
  }

  onReadUpdate(callback: (status: ReadStatus) => void) {
    this.socket.on('message:read', callback);
  }

  // ==================== PRESENCE ====================
  queryPresence(userId: string): Promise<PresenceResponse> {
    return new Promise((resolve, reject) => {
      this.socket.emit('query:presence', { userId });

      const timeout = setTimeout(() => {
        reject(new Error('Presence query timeout'));
      }, 5000);

      this.socket.once('presence:response', (data: PresenceResponse) => {
        clearTimeout(timeout);
        resolve(data);
      });
    });
  }

  onPresenceUpdate(callback: (update: PresenceUpdate) => void) {
    this.socket.on('presence:update', callback);
  }

  // ==================== ONLINE USERS ====================
  queryOnlineUsers(): Promise<OnlineUsersResponse> {
    return new Promise((resolve, reject) => {
      this.socket.emit('query:onlineUsers');

      const timeout = setTimeout(() => {
        reject(new Error('Online users query timeout'));
      }, 5000);

      this.socket.once('onlineUsers:response', (data: OnlineUsersResponse) => {
        clearTimeout(timeout);
        resolve(data);
      });
    });
  }

  // ==================== HEARTBEAT ====================
  sendHeartbeat(): Promise<void> {
    return new Promise((resolve) => {
      this.socket.emit('ping');
      this.socket.once('pong', () => resolve());
    });
  }

  startHeartbeat(interval: number = 30000) {
    return setInterval(() => {
      this.sendHeartbeat().catch(console.error);
    }, interval);
  }

  // ==================== MEDIA UPLOAD ====================
  async requestMediaUploadUrl(
    data: MediaUploadRequest
  ): Promise<MediaUploadResponse> {
    return new Promise((resolve, reject) => {
      this.socket.emit('media:request-upload-url', data);

      const timeout = setTimeout(() => {
        reject(new Error('Upload URL request timeout'));
      }, 10000);

      this.socket.once('media:upload-url', (response: MediaUploadResponse) => {
        clearTimeout(timeout);
        resolve(response);
      });

      this.socket.once('error', (error: string) => {
        clearTimeout(timeout);
        reject(new Error(error));
      });
    });
  }

  async uploadFile(
    file: File,
    conversationId: string
  ): Promise<{ fileId: string; key: string }> {
    // 1. Request upload URL
    const uploadData = await this.requestMediaUploadUrl({
      conversationId,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
    });

    // 2. Upload file to cloud storage
    const uploadResponse = await fetch(uploadData.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file');
    }

    // 3. Return file metadata
    return {
      fileId: uploadData.fileId,
      key: uploadData.key,
    };
  }

  async sendMediaMessage(
    file: File,
    conversationId: string,
    encryptedData: { ciphertext: string; ephemeralKey: string },
    type: 'image' | 'video' | 'audio' | 'file'
  ): Promise<MessageSentResponse> {
    // Upload file first
    const { fileId, key } = await this.uploadFile(file, conversationId);

    // Send message with metadata
    return this.sendMessage({
      conversationId,
      encryptedData,
      type,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        fileId,
        key,
      },
    });
  }

  // ==================== CONNECTION MANAGEMENT ====================
  connect() {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect() {
    this.socket.disconnect();
  }

  isConnected(): boolean {
    return this.socket.connected;
  }

  // ==================== CLEANUP ====================
  removeAllListeners() {
    this.socket.removeAllListeners();
    this.setupBaseListeners(); // Re-add base listeners
  }

  destroy() {
    this.socket.removeAllListeners();
    this.socket.disconnect();
  }
}

export default MessageClient;
