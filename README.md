# content-for-machines

Pay-per-access content gating for AI agents using the [Machine Payments Protocol](https://mpp.dev).

When a human reads your blog, they see the full content. When an AI agent tries to read it, they get a title, summary, and tags — plus a `402 Payment Required` response with instructions to pay via [MPP](https://mpp.dev). Once they pay, they get the full content in Markdown with a cryptographic fingerprint embedded.

## How It Works

```
Human Browser                          AI Agent
     │                                      │
     ▼                                      ▼
  GET /blog/vim                        GET /blog/vim
     │                                      │
  middleware:                           middleware:
  detectAgent() → false                 detectAgent() → true
     │                                      │
     ▼                                      ▼
  SSG HTML page                        rewrite → /api/post/vim
  + <script type="text/llms.txt">           │
    (payment instructions for               ▼
     agents reading the HTML)          402 Payment Required
                                       + WWW-Authenticate: Payment ...
                                       + { title, summary, tags }
                                            │
                                       Agent pays via MPP
                                            │
                                            ▼
                                       200 OK (text/markdown)
                                       + fingerprinted content
                                       + Payment-Receipt header
```

## Packages

| Package | Description |
|---|---|
| [`content-for-machines`](./packages/core) | Core TypeScript library — agent detection, preview generation, MPP integration, fingerprinting |
| [`next-example`](./packages/next-example) | Reference Next.js blog with pay-per-access, deployable to Vercel |

## Quick Start

### Using the Library

```bash
npm install content-for-machines mppx
```

```typescript
import {
  detectAgent,
  generatePreview,
  createPreviewResponse,
  createContentResponse,
  generateLLMScriptTag,
  fingerprintContent,
} from 'content-for-machines'

// 1. Detect if request is from an AI agent
const detection = detectAgent(request, { checkAuthorizationHeader: true })

// 2. Generate a preview for 402 responses
const preview = generatePreview(post.metadata, 'my-post', config)

// 3. Inject payment instructions in HTML for agents
const scriptTag = generateLLMScriptTag(config, { slug: 'my-post' })
// → <script type="text/llms.txt">...payment instructions...</script>

// 4. Fingerprint content after payment
const result = await fingerprintContent(content, serverSecret, txReference)
// → { content: "...with invisible certificate...", certificate: { signature, txReference } }
```

### Using the React Component

```tsx
import { LLMPaymentInstructions } from 'content-for-machines/react'

// In your page component:
<LLMPaymentInstructions config={config} slug="my-post" />
```

### Using with Next.js

See the [next-example](./packages/next-example) for a complete implementation. The key integration points are:

1. **`middleware.ts`** — Detects agents and rewrites to API route
2. **`app/api/post/[slug]/route.ts`** — Handles MPP payment flow
3. **`app/blog/[slug]/page.tsx`** — Renders `<LLMPaymentInstructions>` for agents reading HTML
4. **`cam.config.ts`** — Central configuration

### Deploying the Example

```bash
git clone https://github.com/your-org/content-for-machines
cd content-for-machines
pnpm install
pnpm build

cd packages/next-example
pnpm dev
```

Set `CAM_SERVER_SECRET` in your environment for production fingerprinting.

## Configuration

```typescript
import type { ContentAccessConfig } from 'content-for-machines'

const config: ContentAccessConfig = {
  // Payment settings
  payment: {
    recipient: '0x...',                // Wallet address receiving payment
    currency: '0x20c0...000000',       // Token contract (pathUSD on Tempo)
    defaultAmount: '0.01',             // Default price per access
  },

  // Agent detection
  detection: {
    botPatterns: ['MyCustomBot'],       // Additional UA patterns
    allowList: ['GoogleBot'],           // Agents with free access
    checkAuthorizationHeader: true,     // Treat Authorization: Payment as agent signal
    checkAcceptHeader: true,            // Non-text/html Accept = agent
  },

  // 402 preview response
  preview: {
    fields: ['title', 'summary', 'tags'],
    customInstructions: 'Contact us for bulk pricing.',
  },

  // <script type="text/llms.txt"> in HTML pages
  llmScript: {
    apiEndpoint: '/api/post',
    includePrice: true,
    template: '...',                    // Override default instructions
  },

  // Content fingerprinting
  fingerprint: {
    enabled: true,
    serverSecret: process.env.CAM_SERVER_SECRET!,
    strategy: 'zero-width',            // Extensible — add custom strategies
  },
}
```

### Per-Post Pricing

Add a `price` field to your post frontmatter to override the default:

```mdx
---
title: 'Premium Post'
publishedAt: '2024-01-01'
summary: 'This is a premium post.'
tags: 'premium, exclusive'
price: '0.10'
---
```

## Content Fingerprinting

Every paid access embeds a cryptographic certificate in the served content using invisible zero-width Unicode characters.

### How It Works

1. Agent pays for content → receives `txReference` (on-chain transaction hash)
2. Server computes `contentHash = SHA-256(originalContent)`
3. Server signs `certificate = HMAC-SHA256(serverSecret, txReference + ":" + contentHash)`
4. Certificate is encoded as zero-width characters and embedded at a paragraph boundary
5. Content hash is also bound to the MPP challenge, creating an on-chain proof

### Verifying a Leak

```typescript
import { extractCertificate, verifyCertificate } from 'content-for-machines/fingerprint'

// 1. Extract certificate from leaked content
const certificate = extractCertificate(leakedContent)

// 2. Try known transaction references
const isMatch = await verifyCertificate(
  serverSecret,
  knownTxReference,
  originalContent,
  certificate
)
// → true: this content was served to the payer of knownTxReference
```

### Challenge Binding

The content hash is included in the MPP challenge `description` field:
```
WWW-Authenticate: Payment id="abc",
    description="content-hash:sha256:9f86d08...",
    ...
```

This creates an immutable on-chain record binding the payment to specific content.

## Architecture

### Agent Detection

Uses three signals (configurable):

| Signal | What it detects | Default |
|---|---|---|
| User-Agent | Known bot strings (GPTBot, ClaudeBot, CCBot, etc.) | ✅ On |
| `Authorization: Payment` | MPP-aware clients self-identifying | ✅ On |
| `Accept` header | Clients not requesting `text/html` | ✅ On |

### Inline LLM Instructions

Uses the [`<script type="text/llms.txt">`](https://vercel.com/blog/a-proposal-for-inline-llm-instructions-in-html) convention. Browsers ignore it; LLMs read it. The content instructs agents to use the API endpoint instead of scraping the HTML.

### Payment Flow

Built on the [Machine Payments Protocol](https://mpp.dev):
- `402 Payment Required` with `WWW-Authenticate: Payment` header
- Agent completes payment via Tempo (USDC stablecoin)
- Server verifies credential, returns content with `Payment-Receipt`

## API Reference

### `detectAgent(request, config?)`
Detect if a request is from an AI agent. Returns `{ isAgent, agentName?, reason? }`.

### `generatePreview(meta, slug, config)`
Generate preview data for a 402 response body.

### `createPreviewResponse(meta, slug, config, challengeHeaders)`
Create a full 402 `Response` with preview body and payment challenge headers.

### `createContentResponse(post, config, txReference, receiptHeaders?)`
Create a 200 `Response` with fingerprinted markdown content.

### `generateLLMScriptContent(config, overrides?)`
Generate the text content for `<script type="text/llms.txt">`.

### `generateLLMScriptTag(config, overrides?)`
Generate the complete `<script>` HTML tag.

### `signCertificate(serverSecret, txReference, content)`
Create an HMAC-SHA256 certificate for content fingerprinting.

### `verifyCertificate(serverSecret, txReference, content, certificate)`
Verify a certificate against known parameters.

### `embedCertificate(content, certificate, strategy?)`
Embed a certificate in content using zero-width characters.

### `extractCertificate(content, strategy?)`
Extract an embedded certificate from content.

### `fingerprintContent(content, serverSecret, txReference, strategy?)`
High-level: sign and embed in one call.

### `computeContentHash(content)`
Compute SHA-256 hash for challenge binding.

### React: `<LLMPaymentInstructions config slug? amount? template? />`
Component rendering `<script type="text/llms.txt">` with payment instructions.

### Next.js: `createContentAccessMiddleware(config)`
Create middleware that detects agents and rewrites to API routes.

## Future Work

- **Licensing models** — One-time access, subscriptions, time-bound licenses, tiered pricing (read access vs. training data usage rights), site-wide passes
- **Session-based pricing** — MPP `session` intent for bulk/streaming access at reduced per-page rates
- **Dashboard & analytics** — Track which agents access what, revenue per post, access patterns over time, real-time monitoring
- **Rate limiting** — Per-agent, per-IP, and global rate limiting layer
- **Advanced steganography** — Synonym substitution, sentence restructuring, and other NLP-based fingerprinting techniques that survive paraphrasing and summarization
- **Multi-payment method support** — Stripe (credit cards), Lightning (Bitcoin) alongside Tempo
- **Content verification API** — Public endpoint where anyone can submit suspected leaked content for fingerprint extraction and verification
- **Dynamic robots.txt** — Programmatic `robots.txt` that advertises payment-gated paths and pricing to crawlers
- **MCP transport** — Accept payment via MCP tool calls (JSON-RPC), not just HTTP
- **Content bundling** — Pay once for access to multiple posts or an entire category
- **Refund protocol** — MPP-based refund flow for disputed or incorrect content access
- **Webhook notifications** — Real-time notifications when content is accessed/paid for
- **Custom fingerprint strategies** — Plugin system for alternative embedding methods (HTML comments, markdown comments, steganographic word substitution)

## License

MIT
