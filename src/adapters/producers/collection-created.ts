import { BidAcceptedEvent, CollectionCreatedEvent, EventSubType, EventType } from '@dcl/schemas'
import { formatMana } from '../../logic/utils'
import { AppComponents, IEventGenerator } from '../../types'

export const PAGE_SIZE = 1000

const COLLECTIONS_QUERY = `
    query Collections {
        collections(
            where: {updatedAt_gte: $since, id_gt: $paginationId}
            orderBy: id
            orderDirection: desc
            first: ${PAGE_SIZE}
        ) {
            id
            creator
            name
            updatedAt
        }
    }
`

type CollectionResponse = {
  collections: {
    id: string
    creator: string
    name: string
    updatedAt: number
  }[]
}

export async function bidAcceptedProducer(
  components: Pick<AppComponents, 'config' | 'l2CollectionsSubGraph'>
): Promise<IEventGenerator> {
  const { l2CollectionsSubGraph } = components

  async function run(since: number) {
    const now = Date.now()
    const produced: CollectionCreatedEvent[] = []

    let result: CollectionResponse
    let paginationId = ''
    do {
      result = await l2CollectionsSubGraph.query<CollectionResponse>(COLLECTIONS_QUERY, {
        since: Math.floor(since / 1000),
        paginationId
      })

      if (result.collections.length === 0) {
        break
      }

      for (const collection of result.collections) {
        const event: CollectionCreatedEvent = {
          type: EventType.BLOCKCHAIN,
          subType: EventSubType.COLLECTION_CREATED,
          key: collection.id,
          timestamp: collection.updatedAt * 1000,
          metadata: {
            creator: collection.creator,
            name: collection.name
          }
        }
        produced.push(event)

        paginationId = collection.id
      }
    } while (result.collections.length === PAGE_SIZE)

    return {
      event: {
        type: EventType.BLOCKCHAIN,
        subType: EventSubType.COLLECTION_CREATED
      },
      records: produced,
      lastRun: now
    }
  }

  return {
    event: {
      type: EventType.BLOCKCHAIN,
      subType: EventSubType.COLLECTION_CREATED
    },
    run
  }
}