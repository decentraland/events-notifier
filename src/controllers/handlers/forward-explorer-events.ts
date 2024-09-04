import { parseExplorerClientEvent } from '../../adapters/event-parser'
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

  return digest === signatureHeader
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

  if (!result) {
    logger.warn('Invalid signature', {
      signatureHeader: signatureHeader ? signatureHeader : 'empty-signature',
      body: JSON.stringify(body)
    })
    return {
      status: 401,
      body: {
        error: 'Invalid signature',
        ok: false
      }
    }
  }

  const parsedEvent = parseExplorerClientEvent(body)

  if (!parsedEvent) {
    logger.warn('Invalid event', {
      body: JSON.stringify(body)
    })
    return {
      status: 400,
      body: {
        error: 'Invalid event',
        ok: false
      }
    }
  }

  await context.components.eventPublisher.publishMessage(parsedEvent)

  logger.info('Event parsed and forwarded', {
    parsedEvent: JSON.stringify(parsedEvent)
  })

  return {
    status: 200,
    body: {
      ok: true
    }
  }
}
