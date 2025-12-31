// API Key Management Service
// Handles encryption, storage, and validation of user-provided API keys

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

// Configuration - In production, use environment variables
const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY || '32-byte-key-for-aes-256-encrypt!';
const ALGORITHM = 'aes-256-gcm';

// Encrypt an API key
export function encryptApiKey(plainKey: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
  
  let encrypted = cipher.update(plainKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return IV + authTag + encrypted data
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

// Decrypt an API key
export function decryptApiKey(encryptedKey: string): string {
  const parts = encryptedKey.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted key format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Validate an API key by making a test request to the provider
export async function validateApiKey(
  provider: 'openai' | 'anthropic' | 'google' | 'deepseek' | 'openrouter',
  apiKey: string
): Promise<{ is_valid: boolean; error?: string; rate_limit?: number }> {
  try {
    switch (provider) {
      case 'openai': {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          const error = await response.json();
          return { 
            is_valid: false, 
            error: error.error?.message || `OpenAI API error: ${response.status}` 
          };
        }
        return { is_valid: true, rate_limit: 60 }; // OpenAI rate limit: 60 RPM for most accounts
      }
      
      case 'anthropic': {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'HEAD',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
        });
        
        if (response.status === 401 || response.status === 403) {
          return { is_valid: false, error: 'Invalid Anthropic API key' };
        }
        
        // Check rate limit headers
        const rateLimit = response.headers.get('x-ratelimit-limit-requests');
        return { 
          is_valid: true, 
          rate_limit: rateLimit ? parseInt(rateLimit) : 50 
        };
      }
      
      case 'google': {
        // Google uses OAuth, but API keys work for some endpoints
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
        );
        
        if (!response.ok) {
          return { is_valid: false, error: 'Invalid Google API key' };
        }
        return { is_valid: true, rate_limit: 60 };
      }
      
      case 'deepseek': {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 5,
          }),
        });
        
        if (response.status === 401 || response.status === 403) {
          return { is_valid: false, error: 'Invalid DeepSeek API key' };
        }
        return { is_valid: true, rate_limit: 30 };
      }
      
      case 'openrouter': {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          return { is_valid: false, error: 'Invalid OpenRouter API key' };
        }
        return { is_valid: true, rate_limit: 100 };
      }
      
      default:
        return { is_valid: false, error: `Unknown provider: ${provider}` };
    }
  } catch (error) {
    return { 
      is_valid: false, 
      error: error instanceof Error ? error.message : 'Validation failed' 
    };
  }
}

// Mask an API key for display (show only last 4 characters)
export function maskApiKey(encryptedKey: string): string {
  try {
    const decrypted = decryptApiKey(encryptedKey);
    if (decrypted.length <= 4) {
      return '••••';
    }
    return '••••' + decrypted.slice(-4);
  } catch {
    return '••••••••';
  }
}

// Check if an API key is about to expire (heuristic - some providers use keys with expiration)
export function keyMightExpireSoon(provider: 'openai' | 'anthropic'): boolean {
  // This is a placeholder - real implementation would check key metadata
  // For now, we just return false as most API keys don't expire
  return false;
}

// Rotate encryption key (for key rotation scenarios)
export async function rotateEncryptionKey(
  oldKey: string,
  encryptedKeys: string[]
): Promise<string[]> {
  // Decrypt all keys with old key and re-encrypt with new key
  // This would be used in a migration scenario
  const newKeys: string[] = [];
  
  for (const encrypted of encryptedKeys) {
    try {
      const decrypted = decryptApiKeyWithKey(encrypted, oldKey);
      newKeys.push(encryptApiKey(decrypted));
    } catch {
      // Key might already be encrypted with new key
      newKeys.push(encrypted);
    }
  }
  
  return newKeys;
}

// Helper for key rotation with explicit old key
function decryptApiKeyWithKey(encryptedKey: string, encryptionKey: string): string {
  const parts = encryptedKey.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted key format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = createDecipheriv(
    ALGORITHM, 
    Buffer.from(encryptionKey.padEnd(32).slice(0, 32)), 
    iv
  );
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
