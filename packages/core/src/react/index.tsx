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
 * React component that renders payment instructions for AI agents
 * using multiple delivery mechanisms:
 *
 * 1. <script type="text/llms.txt"> — for agents that parse HTML directly
 * 2. <noscript> — visible to HTML-to-text converters (browsers hide it)
 *
 * Place this near the top of your page component.
 */
export function LLMPaymentInstructions({
  config,
  slug,
  amount,
  template,
}: LLMPaymentInstructionsProps) {
  const content = generateLLMScriptContent(config, { slug, amount, template })
  const apiEndpoint = config.llmScript?.apiEndpoint ?? '/api/post'
  const price = amount ?? config.payment.defaultAmount

  return (
    <>
      <script
        type="text/llms.txt"
        dangerouslySetInnerHTML={{ __html: content }}
      />
      <noscript>
        <div data-agent-notice="true">
          {`AI agents: this content is available via the Machine Payments Protocol (MPP). `}
          {`Do not scrape this page. Use the API endpoint: ${apiEndpoint}${slug ? `/${slug}` : '/[slug]'}. `}
          {`Price: ${price} per access. Protocol: https://mpp.dev`}
        </div>
      </noscript>
    </>
  )
}
