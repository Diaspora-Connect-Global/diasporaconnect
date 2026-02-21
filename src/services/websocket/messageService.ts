import { io, Socket } from 'socket.io-client';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: 'text' | 'image' | 'file' | 'video' | 'audio';
  encryptedData: {
    ciphertext: string;
    iv: string;
    authTag: string;
  };
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
  isEdited: boolean;
  createdAt: string;
}

export interface SendMessagePayload {
  conversationId: string;
  type: 'text' | 'image' | 'file' | 'video' | 'audio';
  encryptedData: {
    ciphertext: string;
    iv: string;
    authTag: string;
  };
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    gcsPath?: string;
    width?: number;
    height?: number;
  };
  mentions?: string[];
  replyToId?: string;
}

class MessageService {
  private socket: Socket | null = null;
  private messageCallbacks: ((message: Message) => void)[] = [];
  private presenceCallbacks: ((data: { userId: string; isOnline: boolean; timestamp: string }) => void)[] = [];
  private connectCallbacks: (() => void)[] = [];
  private disconnectCallbacks: (() => void)[] = [];

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  connect(token: string) {
    // Avoid creating duplicate connections
    if (this.socket?.connected) return;

    this.socket = io('ws://api.diaspoplug.net', {
      auth: { token }
    });

    this.socket.on('connect', () => {
      console.log('Connected to message service');
      this.connectCallbacks.forEach(cb => cb());
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from message service');
      this.disconnectCallbacks.forEach(cb => cb());
    });

    this.socket.on('message:new', (data: Message) => {
      this.messageCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('presence:update', (data: { userId: string; isOnline: boolean; timestamp: string }) => {
      this.presenceCallbacks.forEach(cb => cb(data));
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  sendMessage(payload: SendMessagePayload) {
    if (!this.isConnected) {
      console.warn('Cannot send message: socket not connected');
      return;
    }
    this.socket!.emit('message:send', payload);
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

  onPresenceUpdate(callback: (data: { userId: string; isOnline: boolean; timestamp: string }) => void) {
    this.presenceCallbacks.push(callback);
    return () => {
      this.presenceCallbacks = this.presenceCallbacks.filter(cb => cb !== callback);
    };
  }
}

export const messageService = new MessageService();