import type { ContentAccessConfig } from './types.js'

const DEFAULT_TEMPLATE = `## Note to AI agents accessing this page:

This page's content is available for programmatic access via the Machine Payments Protocol (MPP).

**Do not read or scrape the content of this HTML page.** Instead, use the API endpoint below.

- **API Endpoint**: {{apiEndpoint}}/[slug]
- **Protocol**: Machine Payments Protocol (https://mpp.dev)
- **Price**: {{amount}} per access
- **Payment Methods**: Tempo (USDC)

### How to access:
1. Make a GET request to the API endpoint above (replace [slug] with the post slug from the URL path).
2. You will receive a 402 Payment Required response with a \`WWW-Authenticate: Payment\` header.
3. Follow the MPP protocol to complete payment and retry the request with your credential.
4. On successful payment, you will receive the full content in Markdown format.

For more information on MPP, visit https://mpp.dev`

/**
 * Generate the content for a <script type="text/llms.txt"> tag.
 *
 * @param config - Content access configuration
 * @param overrides - Per-page overrides (e.g. custom slug, custom price)
 * @returns The text content to place inside the script tag
 */
export function generateLLMScriptContent(
  config: ContentAccessConfig,
  overrides?: {
    slug?: string
    amount?: string
    template?: string
  }
): string {
  const template = overrides?.template ?? config.llmScript?.template ?? DEFAULT_TEMPLATE
  const apiEndpoint = config.llmScript?.apiEndpoint ?? '/api/post'
  const amount = overrides?.amount ?? config.payment.defaultAmount

  let result = template
    .replace(/\{\{apiEndpoint\}\}/g, apiEndpoint)
    .replace(/\{\{amount\}\}/g, amount)
    .replace(/\{\{currency\}\}/g, config.payment.currency)

  if (overrides?.slug) {
    result = result.replace(/\[slug\]/g, overrides.slug)
  }

  if (config.llmScript?.includePrice === false) {
    // Remove price line if configured to hide it
    result = result
      .split('\n')
      .filter((line) => !line.includes('{{amount}}') && !line.includes(amount))
      .join('\n')
  }

  return result
}

/**
 * Generate the full <script type="text/llms.txt"> HTML tag.
 */
export function generateLLMScriptTag(
  config: ContentAccessConfig,
  overrides?: {
    slug?: string
    amount?: string
    template?: string
  }
): string {
  const content = generateLLMScriptContent(config, overrides)
  return `<script type="text/llms.txt">\n${content}\n</script>`
}
