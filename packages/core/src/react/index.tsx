import React from 'react'
import type { ContentAccessConfig } from '../types.js'
import { generateLLMScriptContent } from '../llm-script.js'

export interface LLMPaymentInstructionsProps {
  config: ContentAccessConfig
  slug?: string
  amount?: string
  template?: string
}

/**
 * React component that renders a <script type="text/llms.txt"> tag
 * with payment instructions for AI agents.
 *
 * Place this in your page's <head> or near the top of the document.
 * Browsers ignore unknown script types, but LLMs will read the content.
 */
export function LLMPaymentInstructions({
  config,
  slug,
  amount,
  template,
}: LLMPaymentInstructionsProps) {
  const content = generateLLMScriptContent(config, { slug, amount, template })

  return (
    <script
      type="text/llms.txt"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}
