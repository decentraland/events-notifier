import { AppComponents, IEventProducer, IProducerRegistry } from '../types'

export async function createProducerRegistry(components: Pick<AppComponents, 'logs'>): Promise<IProducerRegistry> {
  const producers: Map<string, IEventProducer> = new Map<string, IEventProducer>()
  const { logs } = components
  const logger = logs.getLogger('producer-registry')

  function addProducer(producer: IEventProducer) {
    if (producers.has(producer.eventSubType())) {
      throw new Error(`Producer for ${producer.eventSubType} already exists`)
    }
    logger.info(`Adding producer for ${producer.eventSubType()}.`)
    producers.set(producer.eventSubType(), producer)
  }

  async function start(): Promise<void> {
    await Promise.all([...producers.values()].map((producer) => producer.start()))
  }

  function getProducer(eventType: string): IEventProducer {
    const producer = producers.get(eventType)
    if (!producer) {
      throw new Error(`Producer for ${eventType} not found`)
    }
    return producer
  }

  return {
    addProducer,
    getProducer,
    start
  }
}
