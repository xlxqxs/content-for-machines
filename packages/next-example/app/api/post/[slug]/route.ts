import { getBlogPosts } from 'app/blog/utils'
import {
  createPreviewResponse,
  createContentResponse,
  computeContentHash,
} from 'content-for-machines'
import { Mppx, tempo } from 'mppx/server'
import { Receipt } from 'mppx'
import contentAccessConfig from '../../../../cam.config'

const mppx = Mppx.create({
  methods: [
    tempo({
      currency: contentAccessConfig.payment.currency as `0x${string}`,
      recipient: contentAccessConfig.payment.recipient as `0x${string}`,
    }),
  ],
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const post = getBlogPosts().find((p) => p.slug === slug)
  if (!post) {
    return new Response(JSON.stringify({ error: 'Post not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const amount = post.metadata.price || contentAccessConfig.payment.defaultAmount
  const contentHash = await computeContentHash(post.content)

  const response = await mppx.charge({
    amount,
    description: `content-hash:sha256:${contentHash}`,
  })(request)

  if (response.status === 402) {
    return createPreviewResponse(
      post.metadata,
      slug,
      contentAccessConfig,
      response.challenge
    )
  }

  // Build a placeholder response, let mppx attach the receipt header
  const placeholder = new Response(null, { status: 200 })
  const receiptResponse = response.withReceipt(placeholder)

  // Extract tx reference from the receipt header mppx just attached
  let txReference = 'unknown'
  const receiptHeader = receiptResponse.headers.get('payment-receipt')
  if (receiptHeader) {
    try {
      const receipt = Receipt.deserialize(receiptHeader)
      txReference = receipt.reference
    } catch {
      // Receipt parsing failed, proceed without fingerprint reference
    }
  }

  // Now build the real content response with fingerprinting
  const contentResponse = await createContentResponse(
    { metadata: post.metadata, content: post.content, slug },
    contentAccessConfig,
    txReference,
  )

  // Re-attach the receipt header to the content response
  contentResponse.headers.set('Payment-Receipt', receiptHeader!)

  return contentResponse
}
