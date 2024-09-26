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
    HandlerContextWithPath<'eventPublisher' | 'eventParser' | 'config' | 'logs', '/forward'>,
    'params' | 'request' | 'components'
  >
) {
  const { logs, config, eventParser, eventPublisher } = context.components
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
