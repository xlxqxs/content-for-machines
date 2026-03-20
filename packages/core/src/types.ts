/**
 * Metadata for a content post that can be gated behind payment.
 */
export interface PostMeta {
  title: string
  summary?: string
  tags?: string[]
  publishedAt?: string
  image?: string
  [key: string]: unknown
}

/**
 * Configuration for the content access system.
 */
export interface ContentAccessConfig {
  /** MPP payment configuration */
  payment: {
    /** Wallet address that receives payment */
    recipient: string
    /** TIP-20 token contract address (e.g. pathUSD on Tempo) */
    currency: string
    /** Default price per access in token units (e.g. "0.01") */
    defaultAmount: string
  }

  /** Agent detection configuration */
  detection?: {
    /** Additional User-Agent patterns to treat as bots */
    botPatterns?: string[]
    /** Agent identifiers that get free access */
    allowList?: string[]
    /** Check for Authorization: Payment header as agent signal (default: true) */
    checkAuthorizationHeader?: boolean
    /** Check Accept header for non-HTML preference (default: true) */
    checkAcceptHeader?: boolean
  }

  /** Preview configuration for 402 responses */
  preview?: {
    /** Which metadata fields to include in preview (default: ['title', 'summary', 'tags']) */
    fields?: (keyof PostMeta)[]
    /** Additional instructions to include in 402 body */
    customInstructions?: string
  }

  /** LLM script tag configuration */
  llmScript?: {
    /** Override the entire template. Supports placeholders: {{apiEndpoint}}, {{amount}}, {{currency}} */
    template?: string
    /** API endpoint path pattern (default: "/api/post") */
    apiEndpoint?: string
    /** Whether to show price in instructions (default: true) */
    includePrice?: boolean
  }

  /** Fingerprinting configuration */
  fingerprint?: {
    /** Enable content fingerprinting (default: false) */
    enabled?: boolean
    /** Server secret for HMAC signing */
    serverSecret: string
    /** Embedding strategy (default: 'zero-width') */
    strategy?: FingerprintStrategy
  }
}

export type FingerprintStrategy = 'zero-width'

/**
 * Result of agent detection.
 */
export interface AgentDetectionResult {
  isAgent: boolean
  agentName?: string
  /** Why this was classified as an agent */
  reason?: 'user-agent' | 'authorization-header' | 'accept-header'
}

/**
 * Preview response sent in 402 body.
 */
export interface PreviewResponse {
  title: string
  summary?: string
  tags?: string[]
  paymentRequired: true
  payment: {
    amount: string
    currency: string
    protocol: string
    methods: string[]
    endpoint: string
  }
  instructions: string
}

/**
 * Access certificate embedded in content for fingerprinting.
 */
export interface AccessCertificate {
  /** HMAC-SHA256 signature */
  signature: string
  /** Transaction reference used in signature computation */
  txReference: string
}

/**
 * Post with content, ready to be served.
 */
export interface PostContent {
  metadata: PostMeta
  content: string
  slug: string
}
