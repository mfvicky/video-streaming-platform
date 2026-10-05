import { JSEncrypt } from 'jsencrypt';
import { env } from '../config/env.config';

export const encryptPassword = (password: string): string => {
  const encryptor = new JSEncrypt();

  const formattedKey = env.RSA_PUBLIC_KEY
    .replace(/^["']|["']$/g, '') // Remove wrapping quotes
    .replace(/\\n/g, '\n')       // Replace escaped \n with actual line breaks
    .trim();

  encryptor.setPublicKey(formattedKey);

  const encrypted = encryptor.encrypt(password);
  
  if (!encrypted) {
    throw new Error('Failed to encrypt password. Check your RSA_PUBLIC_KEY in .env');
  }

  return encrypted;
};