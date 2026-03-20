import type { ContentAccessConfig } from '../types.js'
import { detectAgent } from '../detect.js'

export interface MiddlewareConfig {
  /** Content access configuration */
  config: ContentAccessConfig
  /** URL path pattern for blog posts (default: /blog/) */
  blogPathPrefix?: string
  /** API route path pattern (default: /api/post) */
  apiPathPrefix?: string
}

/**
 * Create a Next.js middleware handler that detects AI agents
 * and rewrites their requests to the payment-gated API route.
 *
 * Usage in middleware.ts:
 * ```ts
 * import { createContentAccessMiddleware } from 'content-access-for-machines/next'
 *
 * const handle = createContentAccessMiddleware({ config })
 * export function middleware(request: NextRequest) {
 *   return handle(request)
 * }
 * ```
 */
export function createContentAccessMiddleware(middlewareConfig: MiddlewareConfig) {
  const {
    config,
    blogPathPrefix = '/blog/',
    apiPathPrefix = '/api/post',
  } = middlewareConfig

  return function handleMiddleware(request: Request): Response | null {
    const url = new URL(request.url)
    const pathname = url.pathname

    // Only process blog post routes
    if (!pathname.startsWith(blogPathPrefix)) {
      return null // pass through
    }

    // Extract slug from path
    const slug = pathname.slice(blogPathPrefix.length).replace(/\/$/, '')
    if (!slug || slug.includes('/')) {
      return null // not a post route (e.g. /blog/ index page)
    }

    // Detect if this is an AI agent
    const detection = detectAgent(request, config.detection)

    if (!detection.isAgent) {
      return null // human, pass through to normal page
    }

    // Agent detected — rewrite to API route
    const apiUrl = new URL(`${apiPathPrefix}/${slug}`, url.origin)

    // Preserve original headers (including Authorization: Payment)
    return Response.redirect(apiUrl, 307)
  }
}
