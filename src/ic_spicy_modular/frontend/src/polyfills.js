// Polyfills for Node.js APIs that are missing in the browser
import { Buffer } from 'buffer';
import process from 'process';

// Make Buffer available globally
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
  window.process = process;
  
  // Polyfill for crypto.randomBytes if not available
  if (typeof window.crypto === 'undefined') {
    window.crypto = {};
  }
  
  if (typeof window.crypto.randomBytes === 'undefined') {
    window.crypto.randomBytes = (size) => {
      const array = new Uint8Array(size);
      crypto.getRandomValues(array);
      return array;
    };
  }
  
  // Polyfill for TextEncoder/TextDecoder if not available
  if (typeof window.TextEncoder === 'undefined') {
    window.TextEncoder = TextEncoder;
  }
  
  if (typeof window.TextDecoder === 'undefined') {
    window.TextDecoder = TextDecoder;
  }
  
  // Polyfill for global
  if (typeof window.global === 'undefined') {
    window.global = window;
  }
}
