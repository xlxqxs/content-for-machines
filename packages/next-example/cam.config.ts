import type { ContentAccessConfig } from 'content-for-machines'

const config: ContentAccessConfig = {
  payment: {
    recipient: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    currency: '0x20c0000000000000000000000000000000000000', // pathUSD on Tempo
    defaultAmount: '0.01',
  },

  detection: {
    checkAuthorizationHeader: true,
    checkAcceptHeader: true,
  },

  preview: {
    fields: ['title', 'summary', 'tags'],
  },

  llmScript: {
    apiEndpoint: '/api/post',
    includePrice: true,
  },

  fingerprint: {
    enabled: true,
    serverSecret: (() => {
      const secret = process.env.CAM_SERVER_SECRET
      if (!secret && typeof window === 'undefined') {
        console.warn('[content-for-machines] CAM_SERVER_SECRET not set — using insecure dev fallback. Set it in production!')
      }
      return secret || 'dev-secret-do-not-use-in-production'
    })(),
    strategy: 'zero-width',
  },
}

export default config
