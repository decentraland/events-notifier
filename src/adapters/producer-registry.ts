import { AppComponents, IEventProducer, IProducerRegistry } from '../types'

export async function createProducerRegistry(components: Pick<AppComponents, 'logs'>): Promise<IProducerRegistry> {
  const producers: Map<string, IEventProducer> = new Map<string, IEventProducer>()
  const { logs } = components
  const logger = logs.getLogger('producer-registry')

  function addProducer(producer: IEventProducer) {
    if (producers.has(producer.notificationType())) {
      throw new Error(`Producer for ${producer.notificationType} already exists`)
    }
    logger.info(`Adding producer for ${producer.notificationType()}.`)
    producers.set(producer.notificationType(), producer)
  }

  async function start(): Promise<void> {
    await Promise.all([...producers.values()].map((producer) => producer.start()))
  }

  function getProducer(notificationType: string): IEventProducer {
    const producer = producers.get(notificationType)
    if (!producer) {
      throw new Error(`Producer for ${notificationType} not found`)
    }
    return producer
  }

  return {
    addProducer,
    getProducer,
    start
  }
}
