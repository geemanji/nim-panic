/**
 * Server-only Nimiq crypto helpers: derive a user-friendly NQ address from a
 * public key and verify a message signature produced by `nimiq.sign()`.
 *
 * No private keys are ever handled here. Pure JS (works on the edge runtime).
 */
import { blake2b } from "@noble/hashes/blake2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import * as ed from "@noble/ed25519";

const BASE32_ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVXY";

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, "").replace(/\s+/g, "");
  if (clean.length % 2 !== 0) throw new Error("Invalid hex length");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new Error("Invalid hex");
    out[i] = byte;
  }
  return out;
}

function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function ibanCheck(input: string): number {
  const digits = input
    .split("")
    .map((c) => {
      const code = c.charCodeAt(0);
      return code >= 48 && code <= 57 ? c : (code - 55).toString();
    })
    .join("");
  let remainder = "";
  for (let i = 0; i < digits.length; i += 6) {
    remainder = String(Number.parseInt(remainder + digits.slice(i, i + 6), 10) % 97);
  }
  return Number.parseInt(remainder, 10);
}

/** Normalises `NQ12 ABCD …` to a spaceless uppercase form for comparisons. */
export function normalizeAddress(address: string): string {
  return address.replace(/\s+/g, "").toUpperCase();
}

/** Pretty NQ form with the canonical 4-character grouping. */
export function formatAddress(address: string): string {
  const clean = normalizeAddress(address);
  return clean.replace(/.{4}/g, "$& ").trim();
}

export function isValidNimiqAddress(address: string): boolean {
  const clean = normalizeAddress(address);
  if (!/^NQ\d{2}[0-9A-HJ-NP-VXY]{32}$/.test(clean)) return false;
  return ibanCheck(clean.slice(4) + clean.slice(0, 4)) === 1;
}

/** address = first 20 bytes of blake2b-256(publicKey), encoded as an NQ IBAN. */
export function addressFromPublicKey(publicKeyHex: string): string {
  const publicKey = hexToBytes(publicKeyHex);
  if (publicKey.length !== 32) throw new Error("Public key must be 32 bytes");
  const hash = blake2b(publicKey, { dkLen: 32 });
  const base32 = base32Encode(hash.subarray(0, 20));
  const check = String(98 - ibanCheck(base32 + "NQ00")).padStart(2, "0");
  return `NQ${check}${base32}`;
}

const MESSAGE_PREFIX = "\x16Nimiq Signed Message:\n";

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/**
 * Candidate byte strings a Nimiq wallet may have signed for a plain-text
 * message. Every candidate contains the full message (and therefore the
 * nonce), so accepting any of them keeps the challenge binding intact.
 */
function signedMessageCandidates(message: string): Uint8Array[] {
  const raw = utf8(message);
  const prefixed = concat(utf8(MESSAGE_PREFIX), utf8(String(raw.length)), raw);
  return [sha256(prefixed), prefixed, sha256(raw), raw];
}

export async function verifyNimiqSignature(params: {
  message: string;
  publicKey: string;
  signature: string;
}): Promise<boolean> {
  const publicKey = hexToBytes(params.publicKey);
  const signature = hexToBytes(params.signature);
  if (publicKey.length !== 32 || signature.length !== 64) return false;

  for (const candidate of signedMessageCandidates(params.message)) {
    try {
      if (await ed.verifyAsync(signature, candidate, publicKey)) return true;
    } catch {
      // try the next candidate encoding
    }
  }
  return false;
}
