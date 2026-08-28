/**
 * Row identifiers, minted on device.
 *
 * Every table's primary key is a v4 UUID generated here rather than a
 * server-assigned integer. That is the single decision that keeps the Cloud
 * Connect milestone (M5) open: two devices, and a hosted database, can each
 * create rows offline and merge them later without renumbering anything or
 * needing a round-trip to allocate an id.
 *
 * Randomness comes from the platform's WebCrypto, which Expo installs on the
 * React Native runtime and Node provides natively. The `Math.random` branch
 * only exists so that an exotic runtime degrades to a still-unique-in-practice
 * id instead of crashing; it is never the path taken on a device or in tests.
 */

import type { EntityId } from '@tennisfolio/core';

const HEX = '0123456789abcdef';

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  const webCrypto = globalThis.crypto;
  if (typeof webCrypto?.getRandomValues === 'function') {
    webCrypto.getRandomValues(bytes);
    return bytes;
  }
  for (let index = 0; index < length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

/** A lower-case, hyphenated RFC 4122 version 4 UUID. */
export function newId(): EntityId {
  const webCrypto = globalThis.crypto;
  if (typeof webCrypto?.randomUUID === 'function') {
    return webCrypto.randomUUID();
  }

  const bytes = randomBytes(16);
  // Version 4 (random) and the RFC 4122 variant bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  let hex = '';
  for (const byte of bytes) {
    hex += HEX[byte >> 4] + HEX[byte & 0x0f];
  }
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/** Matches the ids {@link newId} produces; used by the schema tests. */
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
