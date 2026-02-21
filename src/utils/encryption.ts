// Simple encryption utility for demo purposes
// In production, use proper encryption libraries

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export function encryptMessage(plaintext: string): EncryptedData {
  // For demo purposes, we'll use base64 encoding
  // In production, implement proper AES-GCM encryption
  const iv = btoa(Math.random().toString()).substring(0, 16);
  const ciphertext = btoa(plaintext);
  const authTag = btoa(plaintext.substring(0, 8)).substring(0, 16);
  
  return { ciphertext, iv, authTag };
}

export function decryptMessage(encryptedData: EncryptedData): string {
  // For demo purposes, we'll use base64 decoding
  // In production, implement proper AES-GCM decryption
  try {
    return atob(encryptedData.ciphertext);
  } catch {
    return 'Decryption failed';
  }
}