import { NextRequest, NextResponse } from 'next/server'
import { detectAgent } from 'content-for-machines/detect'
import contentAccessConfig from './cam.config'

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Only process blog post routes
  if (!pathname.startsWith('/blog/')) {
    return NextResponse.next()
  }

  // Extract slug — skip the /blog/ index page
  const slug = pathname.slice('/blog/'.length).replace(/\/$/, '')
  if (!slug || slug.includes('/')) {
    return NextResponse.next()
  }

  // Detect if this is an AI agent
  const detection = detectAgent(request, contentAccessConfig.detection)

  if (!detection.isAgent) {
    return NextResponse.next()
  }

  // Agent detected — rewrite to payment-gated API route
  const apiUrl = new URL(`/api/post/${slug}`, request.url)
  return NextResponse.rewrite(apiUrl, {
    headers: request.headers,
  })
}

export const config = {
  matcher: '/blog/:slug*',
}
