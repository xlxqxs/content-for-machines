import type { PostMeta, PreviewResponse, ContentAccessConfig } from './types.js'

/**
 * Generate a preview response for a 402 Payment Required response.
 * Returns the post teaser with payment instructions.
 */
export function generatePreview(
  meta: PostMeta,
  slug: string,
  config: ContentAccessConfig
): PreviewResponse {
  const fields = config.preview?.fields ?? ['title', 'summary', 'tags']
  const apiEndpoint = config.llmScript?.apiEndpoint ?? '/api/post'
  const amount = config.payment.defaultAmount

  const preview: PreviewResponse = {
    title: meta.title,
    paymentRequired: true,
    payment: {
      amount,
      currency: config.payment.currency,
      protocol: 'https://mpp.dev',
      methods: ['tempo'],
      endpoint: `${apiEndpoint}/${slug}`,
    },
    instructions: buildInstructions(slug, config),
  }

  if (fields.includes('summary') && meta.summary) {
    preview.summary = meta.summary
  }

  if (fields.includes('tags') && meta.tags) {
    preview.tags = meta.tags
  }

  return preview
}

function buildInstructions(slug: string, config: ContentAccessConfig): string {
  const apiEndpoint = config.llmScript?.apiEndpoint ?? '/api/post'
  const amount = config.payment.defaultAmount
  const customInstructions = config.preview?.customInstructions ?? ''

  return [
    `To access the full content of this post, make a request to ${apiEndpoint}/${slug}.`,
    `The request will return a 402 Payment Required response with a WWW-Authenticate header.`,
    `Follow the Machine Payments Protocol (https://mpp.dev) to complete payment.`,
    `Price: ${amount} per access.`,
    `Supported payment methods: Tempo (USDC stablecoin).`,
    customInstructions,
  ]
    .filter(Boolean)
    .join('\n')
}
