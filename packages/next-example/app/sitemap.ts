import { getBlogPosts } from 'app/blog/utils'

function resolveBaseUrl() {
  const env = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (!env) return 'http://localhost:3000'
  return env.startsWith('http') ? env : `https://${env}`
}

export const baseUrl = resolveBaseUrl()

export default async function sitemap() {
  let blogs = getBlogPosts().map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.metadata.publishedAt,
  }))

  let routes = ['', '/blog'].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString().split('T')[0],
  }))

  return [...routes, ...blogs]
}
