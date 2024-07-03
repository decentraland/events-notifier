import { CronJob } from 'cron'
import { AppComponents, IEventGenerator, IEventProducer } from '../types'

export async function createProducer(
  components: Pick<AppComponents, 'logs' | 'database' | 'eventPublisher'>,
  producer: IEventGenerator
): Promise<IEventProducer> {
  const { logs, database, eventPublisher } = components
  const logger = logs.getLogger(`producer-${producer.notificationType}`)

  let lastSuccessfulRun: number | undefined

  async function runProducer(lastSuccessfulRun: number) {
    logger.info(`Checking for updates since ${lastSuccessfulRun}.`)

    const produced = await producer.run(lastSuccessfulRun)
    await database.updateLastUpdateForNotificationType(produced.notificationType, produced.lastRun)

    for (const record of produced.records) {
      await eventPublisher.publishMessage(producer.convertToEvent(record))
    }
    logger.info(`Published ${produced.records.length} new events.`)

    return produced.lastRun
  }

  async function start(): Promise<void> {
    logger.info(`Scheduling producer for ${producer.notificationType}.`)

    const job = new CronJob(
      '0 * * * * *',
      async function () {
        try {
          if (!lastSuccessfulRun) {
            lastSuccessfulRun = await database.fetchLastUpdateForNotificationType(producer.notificationType)
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
    notificationType: () => producer.notificationType,
    runProducerSinceDate: async (date: number) => {
      await runProducer(date)
    }
  }
}
