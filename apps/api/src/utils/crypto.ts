import forge from 'node-forge';
import { env } from '../config/env';

export const decryptPassword = (encryptedPassword: string): string => {
  try {
    // 1. Convert literal '\n' strings from .env into real newlines & strip quotes
    const formattedPrivateKeyPem = env.RSA_PRIVATE_KEY
      .replace(/^["']|["']$/g, '')
      .replace(/\\n/g, '\n')
      .trim();

    // 2. Parse PKCS#1 / PKCS#8 PEM
    const privateKey = forge.pki.privateKeyFromPem(formattedPrivateKeyPem);

    // 3. Decode base64 encrypted string
    const decoded = forge.util.decode64(encryptedPassword);

    // 4. Decrypt using PKCS1-v1_5 padding (matches JSEncrypt default)
    const decrypted = privateKey.decrypt(decoded, 'RSAES-PKCS1-V1_5');

    return decrypted;
  } catch (error) {
    console.error('RSA Decryption Error:', error);
    throw new Error('Failed to decrypt password payload');
  }
};