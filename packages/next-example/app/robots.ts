import { baseUrl } from 'app/sitemap'

export default function robots() {
  return {
    rules: [
      // Humans and search engines: full access
      {
        userAgent: '*',
        allow: '/',
      },
      // AI crawlers: block /blog/ HTML pages, allow /api/post/ for paid access
      ...[
        'GPTBot',
        'ChatGPT-User',
        'ClaudeBot',
        'Claude-Web',
        'CCBot',
        'Google-Extended',
        'Amazonbot',
        'PerplexityBot',
        'Bytespider',
        'Diffbot',
        'ImagesiftBot',
        'cohere-ai',
        'AI2Bot',
        'OAI-SearchBot',
        'PetalBot',
        'FacebookBot',
        'AppleBot-Extended',
      ].map((bot) => ({
        userAgent: bot,
        disallow: '/blog/',
        allow: '/api/post/',
      })),
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
