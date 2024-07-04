import { CronJob } from 'cron'
import { AppComponents, IEventGenerator, IEventProducer } from '../types'

export async function createProducer(
  components: Pick<AppComponents, 'logs' | 'database' | 'eventPublisher'>,
  producer: IEventGenerator
): Promise<IEventProducer> {
  const { logs, database, eventPublisher } = components
  const logger = logs.getLogger(`producer-${producer.eventType}`)

  let lastSuccessfulRun: number | undefined

  async function runProducer(lastSuccessfulRun: number) {
    logger.info(`Checking for updates since ${lastSuccessfulRun}.`)

    const produced = await producer.run(lastSuccessfulRun)
    await database.updateLastUpdateForNotificationType(produced.eventType, produced.lastRun)

    for (const event of produced.records) {
      await eventPublisher.publishMessage(event)
    }
    logger.info(`Published ${produced.records.length} new events.`)

    return produced.lastRun
  }

  async function start(): Promise<void> {
    logger.info(`Scheduling producer for ${producer.eventType}.`)

    const job = new CronJob(
      '0 * * * * *',
      async function () {
        try {
          if (!lastSuccessfulRun) {
            lastSuccessfulRun = await database.fetchLastUpdateForNotificationType(producer.eventType)
          }
          lastSuccessfulRun = await runProducer(lastSuccessfulRun!)
        } catch (e: any) {
          logger.error(`Couldn't run producer: ${e.message}.`)
        }
      },
      null,
      false,
      'UCT'
    )
    job.start()
  }

  return {
    start,
    eventType: () => producer.eventType,
    runProducerSinceDate: async (date: number) => {
      await runProducer(date)
    }
  }
}
