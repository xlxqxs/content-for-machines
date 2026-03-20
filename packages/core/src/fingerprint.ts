import type { AccessCertificate, FingerprintStrategy } from './types.js'

// Zero-width characters used for encoding (2 bits each = 4 chars)
const ZW_CHARS = [
  '\u200B', // zero-width space        = 00
  '\u200C', // zero-width non-joiner   = 01
  '\u200D', // zero-width joiner       = 10
  '\uFEFF', // zero-width no-break sp  = 11
] as const

/**
 * Sign content to create an access certificate.
 * The certificate is an HMAC-SHA256 of the transaction reference and content hash.
 *
 * @param serverSecret - Server's HMAC secret key
 * @param txReference - On-chain transaction reference (hash)
 * @param content - The original content being served
 * @returns The certificate signature as a hex string
 */
export async function signCertificate(
  serverSecret: string,
  txReference: string,
  content: string
): Promise<string> {
  const encoder = new TextEncoder()

  // Compute content hash
  const contentHash = await sha256Hex(content)

  // Compute HMAC-SHA256(serverSecret, txReference + ":" + contentHash)
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(serverSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const payload = `${txReference}:${contentHash}`
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))

  return bufferToHex(signatureBuffer)
}

/**
 * Verify an access certificate against known parameters.
 *
 * @param serverSecret - Server's HMAC secret key
 * @param txReference - On-chain transaction reference
 * @param content - The original content (without fingerprint)
 * @param certificate - The certificate signature to verify
 * @returns Whether the certificate is valid
 */
export async function verifyCertificate(
  serverSecret: string,
  txReference: string,
  content: string,
  certificate: string
): Promise<boolean> {
  const expected = await signCertificate(serverSecret, txReference, content)
  return timingSafeEqual(expected, certificate)
}

/**
 * Embed a certificate into content using the specified strategy.
 * The certificate is encoded as zero-width characters and inserted at paragraph boundaries.
 */
export function embedCertificate(
  content: string,
  certificate: string,
  _strategy: FingerprintStrategy = 'zero-width'
): string {
  const encoded = encodeToZeroWidth(certificate)
  return insertAtParagraphBoundary(content, encoded)
}

/**
 * Extract a certificate from fingerprinted content.
 * Returns null if no certificate is found.
 */
export function extractCertificate(
  content: string,
  _strategy: FingerprintStrategy = 'zero-width'
): string | null {
  return decodeFromZeroWidth(content)
}

/**
 * High-level: sign and embed a certificate into content.
 */
export async function fingerprintContent(
  content: string,
  serverSecret: string,
  txReference: string,
  strategy: FingerprintStrategy = 'zero-width'
): Promise<{ content: string; certificate: AccessCertificate }> {
  const signature = await signCertificate(serverSecret, txReference, content)
  const fingerprintedContent = embedCertificate(content, signature, strategy)
  return {
    content: fingerprintedContent,
    certificate: { signature, txReference },
  }
}

// --- Encoding/Decoding ---

/**
 * Encode a hex string as zero-width characters.
 * Each hex char (4 bits) is encoded as 2 zero-width characters (2 bits each).
 */
function encodeToZeroWidth(hex: string): string {
  // Add start/end markers so we can find the sequence
  const START_MARKER = '\u200B\u200D\u200B\u200D' // 0010 0010
  const END_MARKER = '\u200D\u200B\u200D\u200B'   // 1010 1010

  let encoded = START_MARKER
  for (const char of hex) {
    const nibble = parseInt(char, 16)
    encoded += ZW_CHARS[(nibble >> 2) & 0x3]!
    encoded += ZW_CHARS[nibble & 0x3]!
  }
  encoded += END_MARKER

  return encoded
}

/**
 * Decode zero-width characters back to a hex string.
 */
function decodeFromZeroWidth(content: string): string | null {
  const START_MARKER = '\u200B\u200D\u200B\u200D'
  const END_MARKER = '\u200D\u200B\u200D\u200B'

  const startIdx = content.indexOf(START_MARKER)
  if (startIdx === -1) return null

  const dataStart = startIdx + START_MARKER.length
  const endIdx = content.indexOf(END_MARKER, dataStart)
  if (endIdx === -1) return null

  const encoded = content.slice(dataStart, endIdx)
  let hex = ''

  for (let i = 0; i < encoded.length; i += 2) {
    const high = ZW_CHARS.indexOf(encoded[i] as typeof ZW_CHARS[number])
    const low = ZW_CHARS.indexOf(encoded[i + 1] as typeof ZW_CHARS[number])
    if (high === -1 || low === -1) return null
    hex += ((high << 2) | low).toString(16)
  }

  return hex
}

/**
 * Insert encoded data at the first paragraph boundary (double newline).
 */
function insertAtParagraphBoundary(content: string, encoded: string): string {
  const paragraphBreak = content.indexOf('\n\n')
  if (paragraphBreak === -1) {
    // No paragraph break, append at end
    return content + encoded
  }
  // Insert between the two newlines
  return content.slice(0, paragraphBreak + 1) + encoded + content.slice(paragraphBreak + 1)
}

// --- Crypto utilities ---

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(input))
  return bufferToHex(hashBuffer)
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
