// Core library - main entry point
export { detectAgent } from './detect.js'
export { generatePreview } from './preview.js'
export {
  createPreviewResponse,
  createContentResponse,
  computeContentHash,
} from './paywall.js'
export {
  generateLLMScriptContent,
  generateLLMScriptTag,
} from './llm-script.js'
export {
  signCertificate,
  verifyCertificate,
  embedCertificate,
  extractCertificate,
  fingerprintContent,
} from './fingerprint.js'

export type {
  PostMeta,
  ContentAccessConfig,
  AgentDetectionResult,
  PreviewResponse,
  AccessCertificate,
  PostContent,
  FingerprintStrategy,
} from './types.js'
