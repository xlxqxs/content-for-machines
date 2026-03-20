import type { AgentDetectionResult, ContentAccessConfig } from './types.js'

/**
 * Known AI crawler User-Agent patterns.
 */
const DEFAULT_BOT_PATTERNS = [
  'GPTBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-Web',
  'Anthropic',
  'CCBot',
  'Google-Extended',
  'Googlebot',
  'Bingbot',
  'PerplexityBot',
  'YouBot',
  'Bytespider',
  'Diffbot',
  'ImagesiftBot',
  'cohere-ai',
  'PetalBot',
  'Amazonbot',
  'FacebookBot',
  'AppleBot-Extended',
  'OAI-SearchBot',
  'AI2Bot',
  'Scrapy',
  'axios',
  'node-fetch',
  'undici',
  'python-requests',
  'Go-http-client',
  'mppx',
]

/**
 * Detect whether an incoming request is from an AI agent or bot.
 *
 * Detection uses three signals:
 * 1. User-Agent matching against known bot patterns
 * 2. Presence of `Authorization: Payment` header (MPP client)
 * 3. Accept header not including `text/html`
 */
export function detectAgent(
  request: Request,
  config?: ContentAccessConfig['detection']
): AgentDetectionResult {
  const userAgent = request.headers.get('user-agent') ?? ''
  const authorization = request.headers.get('authorization') ?? ''
  const accept = request.headers.get('accept') ?? ''

  // Check allow list first
  if (config?.allowList?.length) {
    for (const allowed of config.allowList) {
      if (userAgent.toLowerCase().includes(allowed.toLowerCase())) {
        return { isAgent: false }
      }
    }
  }

  // Check Authorization: Payment header
  const checkAuth = config?.checkAuthorizationHeader ?? true
  if (checkAuth && authorization.toLowerCase().startsWith('payment ')) {
    return {
      isAgent: true,
      agentName: extractAgentName(userAgent),
      reason: 'authorization-header',
    }
  }

  // Check User-Agent against known patterns
  const patterns = [...DEFAULT_BOT_PATTERNS, ...(config?.botPatterns ?? [])]
  for (const pattern of patterns) {
    if (userAgent.toLowerCase().includes(pattern.toLowerCase())) {
      return {
        isAgent: true,
        agentName: pattern,
        reason: 'user-agent',
      }
    }
  }

  // Check Accept header — browsers always include text/html
  const checkAccept = config?.checkAcceptHeader ?? true
  if (checkAccept && userAgent && !accept.includes('text/html') && accept !== '*/*') {
    return {
      isAgent: true,
      agentName: extractAgentName(userAgent),
      reason: 'accept-header',
    }
  }

  return { isAgent: false }
}

function extractAgentName(userAgent: string): string | undefined {
  if (!userAgent) return undefined
  // Try to extract the first token before /
  const match = userAgent.match(/^([^\s/]+)/)
  return match?.[1]
}
