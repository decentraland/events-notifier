import { HandlerContextWithPath } from '../../types'
import { InvalidRequestError, NotFoundError, parseJson } from '@dcl/platform-server-commons'

export async function setCursorHandler(
  context: Pick<
    HandlerContextWithPath<'producerRegistry', '/producers/:producer/set-since'>,
    'params' | 'request' | 'components'
  >
) {
  try {
    context.components.producerRegistry.getProducer(context.params.producer)
  } catch (error: any) {
    throw new NotFoundError(`Invalid producer: ${context.params.producer}`)
  }

  const body = await parseJson<any>(context.request)
  if (!body.since) {
    throw new InvalidRequestError("Invalid request: missing 'since'.")
  }
  if (typeof body.since !== 'string') {
    throw new InvalidRequestError(`Invalid request: invalid value for 'since': ${body.since}.`)
  }

  const sinceDate = new Date(body.since)
  if (sinceDate.toString() === 'Invalid Date') {
    throw new InvalidRequestError(`Invalid request: invalid value for 'since': ${body.since} (not a date).`)
  }

  const producer = context.components.producerRegistry.getProducer(context.params.producer)
  await producer.runProducerSinceDate(sinceDate.getTime())

  return {
    status: 204,
    body: {}
  }
}
