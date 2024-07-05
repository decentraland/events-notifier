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

export type GlobalContext = {
  components: BaseComponents
}

// components used in every environment
export type BaseComponents = {
  config: IConfigComponent
  logs: ILoggerComponent
  metrics: IMetricsComponent<keyof typeof metricDeclarations>
}

// components used in runtime
export type AppComponents = BaseComponents & {
  fetch: IFetchComponent
  database: DatabaseComponent
  eventPublisher: IEventPublisher
  producerRegistry: IProducerRegistry
  l2CollectionsSubGraph: ISubgraphComponent
  landManagerSubGraph: ISubgraphComponent
  marketplaceSubGraph: ISubgraphComponent
  rentalsSubGraph: ISubgraphComponent
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
  fetchLastUpdateForEventType(eventType: string): Promise<number>
  updateLastUpdateForEventType(eventType: string, timestamp: number): Promise<void>
}

export type IEventProducerResult = {
  eventType: string
  records: EventNotification[]
  lastRun: number
}

export type IEventProducer = {
  start: () => Promise<void>
  eventType: () => string
  runProducerSinceDate(date: number): Promise<void>
}

export type IEventGenerator = {
  run(since: number): Promise<IEventProducerResult>
  eventType: EventType
}

export type IProducerRegistry = IBaseComponent & {
  addProducer: (producer: IEventProducer) => void
  getProducer: (eventType: string) => IEventProducer
}

export type IEventPublisher = {
  publishMessage(event: EventNotification): Promise<string | undefined>
}

// TODO: move to schemas
export enum EventType {
  BID_ACCEPTED = 'bid-accepted',
  BID_RECEIVED = 'bid-received',
  ITEM_SOLD = 'item-sold',
  RENTAL_ENDED = 'land-rental-ended',
  RENTAL_STARTED = 'land-rental-started',
  ROYALTIES_EARNED = 'royalties-earned'
}

type BaseEvent = {
  type: string
  key: string
  timestamp: number
}

type BidMetadata = {
  address: string
  image: string
  seller: string
  category: string
  rarity?: string
  link: string
  nftName?: string
  price: string
  title: string
  description: string
  network: string
}

export type BidAcceptedEvent = BaseEvent & {
  type: EventType.BID_ACCEPTED
  metadata: BidMetadata
}

export type BidReceivedEvent = BaseEvent & {
  type: EventType.BID_RECEIVED
  metadata: BidMetadata
}

export type ItemSoldEvent = BaseEvent & {
  type: EventType.ITEM_SOLD
  metadata: {
    address: string
    image: string
    seller: string
    category: string
    rarity?: string
    link: string
    nftName?: string
    network: string
    title: string
    description: string
  }
}

export type RentalEndedEvent = BaseEvent & {
  type: EventType.RENTAL_ENDED
  metadata: {
    address: string
    contract: string
    land?: string
    lessor: string
    tenant: string
    operator: string
    startedAt: string
    endedAt: string
    tokenId: string
    link: string
    title: string
    description?: string
  }
}

export type RentalStartedEvent = BaseEvent & {
  type: EventType.RENTAL_STARTED
  metadata: {
    address: string
    contract: string
    land?: string
    lessor: string
    tenant: string
    operator: string
    startedAt: string
    endedAt: string
    tokenId: string
    link: string
    title: string
    description?: string
  }
}

export type RoyaltiesEarnedEvent = BaseEvent & {
  type: EventType.ROYALTIES_EARNED
  metadata: {
    address: string
    image: string
    category: string
    rarity?: string
    link: string
    nftName?: string
    royaltiesCut: string
    royaltiesCollector: string
    network: string
    title: string
    description?: string
  }
}

export type EventNotification =
  | BidAcceptedEvent
  | BidReceivedEvent
  | ItemSoldEvent
  | RentalEndedEvent
  | RentalStartedEvent
  | RoyaltiesEarnedEvent
