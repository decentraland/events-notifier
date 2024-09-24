import { Events, ItemPublishedEvent } from '@dcl/schemas'
import { AppComponents, IEventGenerator } from '../../types'

export const PAGE_SIZE = 1000

const PUBLISHED_ITEMS_QUERY = `
    query Items($updatedAt: BigInt!, $paginationId: ID) {
      items(
        where: {updatedAt_gte: $updatedAt, id_gt: $paginationId}
        orderBy: id
        orderDirection: asc
        first: ${PAGE_SIZE}
      ) {
        id
        collection{
            id
        }
        blockchainId
        creator
        itemType
        rarity
        urn
        createdAt
        updatedAt
        metadata {
          wearable {
              name
          }
          emote {
              name
              
          }
        }
      }
    }
  `

type ItemsResponse = {
  items: {
    id: string
    collection: {
      id: string
    }
    blockchainId: string
    creator: string
    itemType: string
    rarity: string
    urn: string
    createdAt: number
    updatedAt: number
    metadata: {
      wearable: {
        name: string
      }
      emote: {
        name: string
      }
    }
  }[]
}

export async function itemPublishedProducer(
  components: Pick<AppComponents, 'l2CollectionsSubGraph'>
): Promise<IEventGenerator> {
  const { l2CollectionsSubGraph } = components

  async function run(updatedAt: number) {
    const now = Date.now()
    const produced: ItemPublishedEvent[] = []

    let result: ItemsResponse
    let paginationId = ''
    do {
      result = await l2CollectionsSubGraph.query<ItemsResponse>(PUBLISHED_ITEMS_QUERY, {
        updatedAt: Math.floor(updatedAt / 1000),
        paginationId
      })

      if (result.items.length === 0) {
        break
      }

      for (const item of result.items) {
        const event: ItemPublishedEvent = {
          type: Events.Type.BLOCKCHAIN,
          subType: Events.SubType.Blockchain.ITEM_PUBLISHED,
          key: item.urn,
          timestamp: item.createdAt * 1000,
          metadata: {
            creator: item.creator,
            category: item.metadata.wearable ? 'wearable' : 'emote',
            rarity: item.rarity,
            network: 'polygon',
            tokenId: item.id
          }
        }
        produced.push(event)

        paginationId = item.id
      }
    } while (result.items.length === PAGE_SIZE)

    return {
      event: {
        type: Events.Type.BLOCKCHAIN,
        subType: Events.SubType.Blockchain.ITEM_PUBLISHED
      },
      records: produced,
      lastRun: now
    }
  }

  return {
    event: {
      type: Events.Type.BLOCKCHAIN,
      subType: Events.SubType.Blockchain.ITEM_PUBLISHED
    },
    run
  }
}
