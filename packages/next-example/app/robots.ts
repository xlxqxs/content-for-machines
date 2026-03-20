import { baseUrl } from 'app/sitemap'

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
      },
      {
        userAgent: 'GPTBot',
        disallow: '/blog/',
        comment: 'AI crawlers: access content via /api/post/[slug] using MPP (https://mpp.dev)',
      },
      {
        userAgent: 'ClaudeBot',
        disallow: '/blog/',
      },
      {
        userAgent: 'CCBot',
        disallow: '/blog/',
      },
      {
        userAgent: 'Google-Extended',
        disallow: '/blog/',
      },
      {
        userAgent: 'Amazonbot',
        disallow: '/blog/',
      },
      {
        userAgent: 'PerplexityBot',
        disallow: '/blog/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
