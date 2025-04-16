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
    HandlerContextWithPath<
      'eventPublisher' | 'eventParser' | 'config' | 'logs' | 'metrics' | 'segmentPublisher',
      '/forward'
    >,
    'params' | 'request' | 'components'
  >
) {
  const { logs, config, eventParser, eventPublisher, metrics, segmentPublisher } = context.components
  const logger = logs.getLogger('forward-explorer-events')
  const segmentSigningKey = await config.requireString('SEGMENT_SIGNING_KEY')
  const explorerClientKey = await config.requireString('EXPLORER_CLIENT_KEY')

  const body = await context.request.json()
  const signatureHeader = context.request.headers.get('x-signature')
  const explorerHeader = context.request.headers.get('x-explorer-client')

  // Check if this is a direct request from Explorer
  const isExplorerClient = explorerHeader === explorerClientKey

  // Check if this is a Segment-signed request
  const isSegmentRequest = validateIfSegmentIsTheSourceOfTheEvent(body, signatureHeader, segmentSigningKey)

  // If neither Explorer nor Segment, reject the request
  if (!isSegmentRequest && !isExplorerClient) {
    logger.warn('Invalid signature or client', {
      signatureHeader: signatureHeader ? signatureHeader : 'empty-signature',
      explorerHeader: explorerHeader ? 'present' : 'missing',
      body: JSON.stringify(body)
    })
    return {
      status: 401,
      body: {
        error: 'Invalid signature or client',
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

  // Prepare publish promises
  const publishPromises = []

  // Always publish to SNS
  publishPromises.push(eventPublisher.publishMessage(parsedEvent))

  // If from Explorer, also send to Segment (in parallel)
  if (isExplorerClient) {
    logger.info('Received direct event from Explorer, forwarding to Segment', {
      eventType: parsedEvent.type,
      eventSubType: parsedEvent.subType
    })

    publishPromises.push(segmentPublisher.publishToSegment(parsedEvent))
  }

  await Promise.all(publishPromises)

  logger.info('Event parsed and forwarded', {
    source: isExplorerClient ? 'Explorer' : 'Segment',
    parsedEvent: JSON.stringify(parsedEvent)
  })

  if (
    (parsedEvent as ClientEvent).metadata.timestamps.reportedAt <
    (parsedEvent as ClientEvent).metadata.timestamps.receivedAt
  ) {
    const eventDelayBetweenExplorerAndSegment =
      (castedClientEvent.metadata.timestamps.receivedAt - castedClientEvent.metadata.timestamps.reportedAt) / 1000
    const eventDelayBetweenSegmentAndWebhook =
      (castedClientEvent.timestamp - castedClientEvent.metadata.timestamps.receivedAt) / 1000

    metrics.increment('handled_explorer_events_count', {
      event_type: parsedEvent.subType,
      source: isExplorerClient ? 'explorer' : 'segment'
    })
    metrics.increment(
      'explorer_segment_event_delay_in_seconds_total',
      {
        event_type: parsedEvent.subType
      },
      eventDelayBetweenExplorerAndSegment
    )
    metrics.increment(
      'segment_webhook_event_delay_in_seconds_total',
      {
        event_type: parsedEvent.subType
      },
      eventDelayBetweenSegmentAndWebhook
    )
  }

  return {
    status: 200,
    body: {
      ok: true
    }
  }
}
