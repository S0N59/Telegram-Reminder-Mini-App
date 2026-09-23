import crypto from 'crypto';

// AES-256-GCM Encryption Service for sensitive database columns
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard for GCM
const PREFIX = 'enc:';

// Secret key derivation (32 bytes for AES-256)
function getSecretKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || process.env.DATABASE_URL || 'remigram-default-secure-salt-2026';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts plain text string using AES-256-GCM
 * Output format: enc:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>
 */
export function encryptText(text: string | null | undefined): string {
  if (!text) return '';
  // If already encrypted, don't double-encrypt
  if (typeof text === 'string' && text.startsWith(PREFIX)) {
    return text;
  }

  try {
    const key = getSecretKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(String(text), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    // Fallback to original text if encryption fails
    return String(text);
  }
}

/**
 * Decrypts AES-256-GCM encrypted string
 * If text is legacy plaintext (doesn't start with enc:), returns as-is
 */
export function decryptText(cipherOrPlain: string | null | undefined): string {
  if (!cipherOrPlain) return '';
  if (typeof cipherOrPlain !== 'string') return String(cipherOrPlain);

  // If not encrypted, return original text (backward compatibility)
  if (!cipherOrPlain.startsWith(PREFIX)) {
    return cipherOrPlain;
  }

  try {
    const parts = cipherOrPlain.slice(PREFIX.length).split(':');
    if (parts.length !== 3) {
      return cipherOrPlain;
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getSecretKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error (returning safe fallback):', error);
    // If decryption fails (e.g. key changed), return unencrypted portion or empty
    return cipherOrPlain;
  }
}
