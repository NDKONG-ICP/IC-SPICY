// Polyfills for Node.js APIs that are missing in the browser
import { Buffer } from 'buffer';
import process from 'process';

// Make Buffer available globally
global.Buffer = Buffer;

// Make process available globally
global.process = process;

// Polyfill for crypto.randomBytes if not available
if (typeof global.crypto === 'undefined') {
  global.crypto = {};
}

if (typeof global.crypto.randomBytes === 'undefined') {
  global.crypto.randomBytes = (size) => {
    const array = new Uint8Array(size);
    crypto.getRandomValues(array);
    return array;
  };
}

// Polyfill for TextEncoder/TextDecoder if not available
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}
