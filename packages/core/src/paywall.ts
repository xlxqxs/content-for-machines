import type { ContentAccessConfig, PostMeta, PostContent } from './types.js'
import { generatePreview } from './preview.js'
import { fingerprintContent } from './fingerprint.js'

export interface PaywallOptions {
  config: ContentAccessConfig
}

export interface ChargeResult {
  /** Whether payment is required (no valid credential provided) */
  paymentRequired: boolean
  /** The 402 response to send if payment is required */
  challengeResponse?: Response
  /** Transaction reference from verified payment */
  txReference?: string
}

/**
 * Create the 402 Payment Required response with preview and payment instructions.
 * This is the response agents receive when they haven't paid.
 *
 * The WWW-Authenticate header and payment challenge are handled by mppx.
 * This function creates the response body (preview + instructions).
 *
 * @param challengeResponse - The 402 Response from mppx containing WWW-Authenticate headers
 */
export function createPreviewResponse(
  meta: PostMeta,
  slug: string,
  config: ContentAccessConfig,
  challengeResponse: Response
): Response {
  const preview = generatePreview(meta, slug, config)

  const headers = new Headers(challengeResponse.headers)
  headers.set('Content-Type', 'application/json')
  headers.set('Cache-Control', 'no-store')

  return new Response(JSON.stringify(preview, null, 2), {
    status: 402,
    headers,
  })
}

/**
 * Create the 200 OK response with full content in Markdown.
 * Optionally fingerprints the content with the transaction reference.
 */
export async function createContentResponse(
  post: PostContent,
  config: ContentAccessConfig,
  txReference: string,
  receiptHeaders?: Headers
): Promise<Response> {
  let content = post.content

  // Fingerprint content if enabled
  if (config.fingerprint?.enabled && config.fingerprint.serverSecret) {
    const result = await fingerprintContent(
      content,
      config.fingerprint.serverSecret,
      txReference
    )
    content = result.content
  }

  const headers = new Headers(receiptHeaders)
  headers.set('Content-Type', 'text/markdown; charset=utf-8')
  headers.set('Cache-Control', 'private, no-store')

  return new Response(content, {
    status: 200,
    headers,
  })
}

/**
 * Compute the SHA-256 hash of content for challenge binding.
 * Include this in the challenge description so the payment is bound to specific content.
 */
export async function computeContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(content))
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
