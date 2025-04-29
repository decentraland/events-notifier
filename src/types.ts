import type {
  IBaseComponent,
  IConfigComponent,
  IFetchComponent,
  IHttpServerComponent,
  ILoggerComponent,
  IMetricsComponent
} from '@well-known-components/interfaces'
import { ISubgraphComponent } from '@well-known-components/thegraph-component'

import { metricDeclarations } from './metrics'
import { EthAddress, Event, Events } from '@dcl/schemas'

export type GlobalContext = {
  components: BaseComponents
}

// components used in every environment
export type BaseComponents = {
  config: IConfigComponent
  logs: ILoggerComponent
  server: IHttpServerComponent<GlobalContext>
  statusChecks: IBaseComponent
  metrics: IMetricsComponent<keyof typeof metricDeclarations>
  fetch: IFetchComponent
  producerRegistry: IProducerRegistry
  eventPublisher: IEventPublisher
  eventParser: IEventParser
}

// components used in runtime
export type AppComponents = BaseComponents & {
  database: DatabaseComponent
  l2CollectionsSubGraph: ISubgraphComponent
  landManagerSubGraph: ISubgraphComponent
  marketplaceSubGraph: ISubgraphComponent
  rentalsSubGraph: ISubgraphComponent
  moveToParcelHandler: MoveToParcelHandler
}
// components used in tests
export type TestComponents = BaseComponents & {
  // A fetch component that only hits the test server
  localFetch: IFetchComponent
}

// this type simplifies the typings of http handlers
export type HandlerContextWithPath<
  ComponentNames extends keyof AppComponents,
  Path extends string = any
> = IHttpServerComponent.PathAwareContext<
  IHttpServerComponent.DefaultContext<{
    components: Pick<AppComponents, ComponentNames>
  }>,
  Path
>

export type DatabaseComponent = {
  fetchLastUpdateForEventType(eventSubType: string): Promise<number>
  updateLastUpdateForEventType(eventSubType: string, timestamp: number): Promise<void>
  upsertWalkedParcelsEvent(data: { address: EthAddress }): Promise<number>
}

export type IEventProducerResult = {
  event: {
    type: Events.Type
    subType: Events.SubType.Blockchain | Events.SubType.Marketplace
  }
  records: Event[]
  lastRun: number
}

export type IEventProducer = {
  start: () => Promise<void>
  eventSubType: () => string
  runProducerSinceDate(date: number): Promise<void>
}

export type IEventGenerator = {
  run(since: number): Promise<IEventProducerResult>
  event: {
    type: Events.Type
    subType: Events.SubType.Blockchain | Events.SubType.Marketplace
  }
}

export type IProducerRegistry = IBaseComponent & {
  addProducer: (producer: IEventProducer) => void
  getProducer: (eventType: string) => IEventProducer
}

export type IEventPublisher = {
  publishMessage(event: Event): Promise<string | undefined>
}

export type IEventParser = {
  parseExplorerClientEvent(event: any): Event | undefined
}

export type MoveToParcelHandler = {
  processMoveToParcel(address: EthAddress, parcelVisited: string): Promise<void>
}
