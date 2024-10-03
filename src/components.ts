import { createDotEnvConfigComponent } from '@well-known-components/env-config-provider'
import { createMetricsComponent } from '@well-known-components/metrics'
import { createLogComponent } from '@well-known-components/logger'
import { createSubgraphComponent } from '@well-known-components/thegraph-component'
import { createPgComponent } from '@well-known-components/pg-component'
import { createFetchComponent } from '@dcl/platform-server-commons'

import { metricDeclarations } from './metrics'
import { AppComponents, GlobalContext } from './types'
import { createProducerRegistry } from './adapters/producer-registry'
import { itemSoldProducer } from './adapters/producers/item-sold'
import { royaltiesEarnedProducer } from './adapters/producers/royalties-earned'
import { bidReceivedProducer } from './adapters/producers/bid-received'
import { bidAcceptedProducer } from './adapters/producers/bid-accepted'
import { rentalStartedProducer } from './adapters/producers/rental-started'
import { rentalEndedProducer } from './adapters/producers/rental-ended'
import { createProducer } from './adapters/create-producer'
import { createEventPublisherComponent } from './adapters/event-publisher'
import { createDatabaseComponent } from './adapters/database'
import {
  createServerComponent,
  createStatusCheckComponent,
  instrumentHttpServerWithPromClientRegistry
} from '@well-known-components/http-server'
import { collectionCreatedProducer } from './adapters/producers/collection-created'
import { itemPublishedProducer } from './adapters/producers/item-published'
import { createEventParserComponent } from './adapters/event-parser'

// Initialize all the components of the app
export async function initComponents(): Promise<AppComponents> {
  const config = await createDotEnvConfigComponent({ path: ['.env.default', '.env.local', '.env'] })
  const logs = await createLogComponent({ config })

  const server = await createServerComponent<GlobalContext>(
    { config, logs },
    {
      cors: {
        methods: ['GET', 'HEAD', 'OPTIONS', 'DELETE', 'POST', 'PUT'],
        maxAge: 86400
      }
    }
  )

  const logger = logs.getLogger('components')
  const commitHash = (await config.getString('COMMIT_HASH')) || 'unknown'
  logger.info(`Initializing components. Version: ${commitHash}`)

  const statusChecks = await createStatusCheckComponent({ server, config })
  const metrics = await createMetricsComponent(metricDeclarations, { config })
  const fetch = await createFetchComponent()
  await instrumentHttpServerWithPromClientRegistry({ server, metrics, config, registry: metrics.registry! })

  let databaseUrl: string | undefined = await config.getString('PG_COMPONENT_PSQL_CONNECTION_STRING')
  if (!databaseUrl) {
    const dbUser = await config.requireString('PG_COMPONENT_PSQL_USER')
    const dbDatabaseName = await config.requireString('PG_COMPONENT_PSQL_DATABASE')
    const dbPort = await config.requireString('PG_COMPONENT_PSQL_PORT')
    const dbHost = await config.requireString('PG_COMPONENT_PSQL_HOST')
    const dbPassword = await config.requireString('PG_COMPONENT_PSQL_PASSWORD')
    databaseUrl = `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbDatabaseName}`
  }

  // This worker writes to the database, so it runs the migrations
  const pg = await createPgComponent({ logs, config, metrics })

  const database = createDatabaseComponent({ pg })

  const l2CollectionsSubGraphUrl = await config.requireString('COLLECTIONS_L2_SUBGRAPH_URL')
  const l2CollectionsSubGraph = await createSubgraphComponent(
    { config, logs, metrics, fetch },
    l2CollectionsSubGraphUrl
  )

  const onlySatsumaL2CollectionsSubGraphUrl = await config.getString('ONLY_SATSUMA_COLLECTIONS_L2_SUBGRAPH_URL')
  const onlySatsumaL2CollectionsSubGraph = await createSubgraphComponent(
    { config, logs, metrics, fetch },
    onlySatsumaL2CollectionsSubGraphUrl || l2CollectionsSubGraphUrl
  )

  const rentalsSubGraphUrl = await config.requireString('RENTALS_SUBGRAPH_URL')
  const rentalsSubGraph = await createSubgraphComponent({ config, logs, metrics, fetch }, rentalsSubGraphUrl)

  const landManagerSubGraphUrl = await config.requireString('LAND_MANAGER_SUBGRAPH_URL')
  const landManagerSubGraph = await createSubgraphComponent({ config, logs, metrics, fetch }, landManagerSubGraphUrl)

  const marketplaceSubGraphUrl = await config.requireString('MARKETPLACE_SUBGRAPH_URL')
  const marketplaceSubGraph = await createSubgraphComponent({ config, logs, metrics, fetch }, marketplaceSubGraphUrl)

  const eventPublisher = await createEventPublisherComponent({ config })

  // Create the producer registry and add all the producers
  const producerRegistry = await createProducerRegistry({ logs })
  producerRegistry.addProducer(
    await createProducer(
      { logs, database, eventPublisher },
      await itemSoldProducer({ config, l2CollectionsSubGraph: onlySatsumaL2CollectionsSubGraph }) // Temp fix to only listen to satsuma until the Subquid has the fix too
    )
  )
  producerRegistry.addProducer(
    await createProducer({ logs, database, eventPublisher }, await itemPublishedProducer({ l2CollectionsSubGraph }))
  )
  producerRegistry.addProducer(
    await createProducer(
      { logs, database, eventPublisher },
      await royaltiesEarnedProducer({ config, l2CollectionsSubGraph })
    )
  )
  producerRegistry.addProducer(
    await createProducer(
      { logs, database, eventPublisher },
      await bidReceivedProducer({ config, l2CollectionsSubGraph })
    )
  )
  producerRegistry.addProducer(
    await createProducer(
      { logs, database, eventPublisher },
      await bidAcceptedProducer({ config, l2CollectionsSubGraph })
    )
  )
  producerRegistry.addProducer(
    await createProducer(
      { logs, database, eventPublisher },
      await rentalStartedProducer({ config, landManagerSubGraph, rentalsSubGraph })
    )
  )
  producerRegistry.addProducer(
    await createProducer(
      { logs, database, eventPublisher },
      await rentalEndedProducer({ config, landManagerSubGraph, rentalsSubGraph })
    )
  )
  producerRegistry.addProducer(
    await createProducer({ logs, database, eventPublisher }, await collectionCreatedProducer({ l2CollectionsSubGraph }))
  )

  const eventParser = createEventParserComponent({ logs })

  return {
    config,
    logs,
    server,
    metrics,
    statusChecks,
    database,
    fetch,
    eventPublisher,
    eventParser,
    l2CollectionsSubGraph,
    landManagerSubGraph,
    rentalsSubGraph,
    marketplaceSubGraph,
    producerRegistry
  }
}
