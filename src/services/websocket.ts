import { io, Socket } from 'socket.io-client';
import { WebSocketMessage, PresenceUpdate, Message } from './gql/types/messaging';

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected = false;

  connect(token: string) {
    if (this.socket?.connected) return;

    this.socket = io('ws://localhost:3006', {
      auth: { token },
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('WebSocket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Send message
  sendMessage(message: WebSocketMessage) {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }
    this.socket.emit('message:send', message);
  }

  // Listen for new messages
  onNewMessage(callback: (message: Message) => void) {
    if (!this.socket) return;
    this.socket.on('message:new', callback);
  }

  // Listen for presence updates
  onPresenceUpdate(callback: (update: PresenceUpdate) => void) {
    if (!this.socket) return;
    this.socket.on('presence:update', callback);
  }

  // Join conversation room
  joinConversation(conversationId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('conversation:join', { conversationId });
  }

  // Leave conversation room
  leaveConversation(conversationId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('conversation:leave', { conversationId });
  }

  // Remove listeners
  removeAllListeners() {
    if (!this.socket) return;
    this.socket.removeAllListeners();
  }

  get connected() {
    return this.isConnected;
  }
}

export const webSocketService = new WebSocketService();