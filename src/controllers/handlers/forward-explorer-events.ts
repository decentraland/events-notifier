import { HandlerContextWithPath } from '../../types'
import crypto from 'crypto'

function validateIfSegmentIsTheSourceOfTheEvent(
  body: any,
  signatureHeader: string | null,
  segmentSigningKey: string
): boolean {
  if (!signatureHeader) {
    return false
  }

  const digest = crypto
    .createHmac('sha1', segmentSigningKey)
    .update(Buffer.from(JSON.stringify(body), 'utf-8'))
    .digest('hex')

  if (digest !== signatureHeader) {
    return false
  }

  return true
}

export async function setForwardExplorerEventsHandler(
  context: Pick<
    HandlerContextWithPath<'eventPublisher' | 'config' | 'logs', '/forward'>,
    'params' | 'request' | 'components'
  >
) {
  const logger = context.components.logs.getLogger('forward-explorer-events')
  const segmentSignigKey = await context.components.config.requireString('SEGMENT_SIGNING_KEY')

  const body = await context.request.json()
  const signatureHeader = context.request.headers.get('x-signature')
  const result = validateIfSegmentIsTheSourceOfTheEvent(body, signatureHeader, segmentSignigKey)

  logger.info('Forwarding event', { body, validationResult: result ? 'valid' : 'invalid' })
  return {
    status: 200,
    body: {
      ok: true
    }
  }
}
