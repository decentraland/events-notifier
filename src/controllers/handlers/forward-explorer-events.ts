import { Authenticator } from '@dcl/crypto'
import { AuthChain, EthAddress } from '@dcl/schemas'
import crypto from 'crypto'

import { HandlerContextWithPath } from '../../types'
import { ClientEvent } from '../../adapters/event-parser'

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

async function validateAuthChain(authChain: AuthChain, address: EthAddress): Promise<boolean> {
  if (!Authenticator.isValidAuthChain(authChain)) {
    return false
  }

  const ownerAddress = Authenticator.ownerAddress(authChain)
  return ownerAddress.toLocaleLowerCase() === address.toLocaleLowerCase()
}

export async function setForwardExplorerEventsHandler(
  context: Pick<
    HandlerContextWithPath<'eventPublisher' | 'eventParser' | 'config' | 'logs' | 'metrics', '/forward'>,
    'params' | 'request' | 'components'
  >
) {
  const { logs, config, eventParser, eventPublisher, metrics } = context.components
  const logger = logs.getLogger('forward-explorer-events')
  const segmentSignigKey = await config.requireString('SEGMENT_SIGNING_KEY')

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

  const parsedEvent = eventParser.parseExplorerClientEvent(body)

  if (!parsedEvent) {
    if (typeof body === 'object' && body !== null) {
      logger.warn('Invalid event', {
        body: JSON.stringify(body)
      })
    } else {
      logger.warn('Invalid event', {
        body
      })
    }

    return {
      status: 400,
      body: {
        error: 'Invalid event',
        ok: false
      }
    }
  }

  const castedClientEvent: ClientEvent = parsedEvent as ClientEvent
  const authChainValidation = await validateAuthChain(
    castedClientEvent.metadata.authChain,
    castedClientEvent.metadata.userAddress
  )

  if (!authChainValidation) {
    logger.warn("Event won't be forwarded because of invalid AuthChain", {
      parsedEvent: JSON.stringify(parsedEvent)
    })

    return {
      status: 401,
      body: {
        error: 'Invalid AuthChain',
        ok: false
      }
    }
  }

  await eventPublisher.publishMessage(parsedEvent)

  // metrics report
  const eventDelayBetweenExplorerAndSegment =
    castedClientEvent.metadata.timestamps.receivedAt - castedClientEvent.metadata.timestamps.reportedAt
  const eventDelayBetweenSegmentAndWebhook =
    castedClientEvent.timestamp - castedClientEvent.metadata.timestamps.receivedAt

  // log all used timestamps in friendly format
  logger.info('Timestamps', {
    receivedAt: castedClientEvent.metadata.timestamps.receivedAt,
    receivedAtFriendly: new Date(castedClientEvent.metadata.timestamps.receivedAt).toISOString(),
    reportedAt: castedClientEvent.metadata.timestamps.reportedAt,
    reportedAtFriendly: new Date(castedClientEvent.metadata.timestamps.reportedAt).toISOString(),
    timestamp: castedClientEvent.timestamp,
    timestampFriendly: new Date(castedClientEvent.timestamp).toISOString()
  })

  logger.info('Calculations', {
    eventDelayBetweenExplorerAndSegment,
    eventDelayBetweenSegmentAndWebhook
  })

  // if any calculation is negative, print raw event
  if (eventDelayBetweenExplorerAndSegment < 0) {
    logger.info('Raw event', {
      event: JSON.stringify(parsedEvent),
      rawEvent: JSON.stringify(body)
    })
  }

  if (eventDelayBetweenSegmentAndWebhook < 0) {
    logger.info('Raw event', {
      event: JSON.stringify(parsedEvent),
      rawEvent: JSON.stringify(body)
    })
  }

  // {
  //   receivedAt: 1741795194189,
  //   receivedAtFriendly: '2025-03-12T15:59:54.189Z',
  //   reportedAt: 1741795141826,
  //   reportedAtFriendly: '2025-03-12T15:59:01.826Z',
  //   timestamp: 1741795141826,
  //   timestampFriendly: '2025-03-12T15:59:01.826Z'
  // }

  metrics.increment('handled_explorer_events_count', {
    event_type: parsedEvent.type
  })
  metrics.increment(
    'explorer_segment_event_delay_in_seconds_total',
    {
      event_type: parsedEvent.type
    },
    eventDelayBetweenExplorerAndSegment
  )
  metrics.increment(
    'segment_webhook_event_delay_in_seconds_total',
    {
      event_type: parsedEvent.type
    },
    eventDelayBetweenSegmentAndWebhook
  )

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
