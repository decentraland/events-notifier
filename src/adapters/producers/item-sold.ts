import { NotificationType } from '@dcl/schemas'
import { AppComponents, EventType, IEventGenerator, ItemSoldEvent, NotificationRecord } from '../../types'

export const PAGE_SIZE = 1000

const SOLD_ITEMS_QUERY = `
    query Sales($since: BigInt!, $paginationId: ID) {
      sales(
        where: {timestamp_gte: $since, id_gt: $paginationId}
        orderBy: id
        orderDirection: asc
        first: ${PAGE_SIZE}
      ) {
        id
        type
        buyer
        seller
        nft {
          id
          category
          image
          metadata {
            id
            wearable {
              id
              name
              description
              rarity
            }
            emote {
              id
              name
              description
              rarity
            }
          }
          contractAddress
          tokenId
        }
        searchContractAddress
        searchCategory
        price
        txHash
        timestamp
      }
    }
  `

type SalesResponse = {
  sales: {
    id: string
    type: string
    buyer: string
    seller: string
    nft: {
      id: string
      category: 'wearable' | 'emote'
      image: string
      metadata: {
        id: string
        wearable?: {
          id: string
          name: string
          description: string
          rarity: string
        }
        emote?: {
          id: string
          name: string
          description: string
          rarity: string
        }
      }
      contractAddress: string
      tokenId: string
    }
    txHash: string
    timestamp: number
  }[]
}

const notificationType = NotificationType.ITEM_SOLD

export async function itemSoldProducer(
  components: Pick<AppComponents, 'config' | 'l2CollectionsSubGraph'>
): Promise<IEventGenerator> {
  const { config, l2CollectionsSubGraph } = components

  const marketplaceBaseUrl = await config.requireString('MARKETPLACE_BASE_URL')

  async function run(since: number) {
    const now = Date.now()
    const produced: NotificationRecord[] = []

    let result: SalesResponse
    let paginationId = ''
    do {
      result = await l2CollectionsSubGraph.query<SalesResponse>(SOLD_ITEMS_QUERY, {
        since: Math.floor(since / 1000),
        paginationId
      })

      if (result.sales.length === 0) {
        break
      }

      for (const sale of result.sales) {
        const notificationRecord = {
          type: notificationType,
          address: sale.seller,
          eventKey: sale.txHash,
          metadata: {
            image: sale.nft.image,
            seller: sale.seller,
            category: sale.nft.category,
            rarity: sale.nft.metadata[sale.nft.category]?.rarity,
            link: `${marketplaceBaseUrl}/contracts/${sale.nft.contractAddress}/tokens/${sale.nft.tokenId}`,
            nftName: sale.nft.metadata[sale.nft.category]?.name,
            title: 'Item Sold',
            description: `You just sold this ${sale.nft.metadata[sale.nft.category]?.name}.`,
            network: 'polygon'
          },
          timestamp: sale.timestamp * 1000
        }
        produced.push(notificationRecord)

        paginationId = sale.id
      }
    } while (result.sales.length === PAGE_SIZE)

    return {
      notificationType: notificationType,
      records: produced,
      lastRun: now
    }
  }

  function convertToEvent(record: NotificationRecord): ItemSoldEvent {
    return {
      type: EventType.ITEM_SOLD,
      key: record.eventKey,
      timestamp: record.timestamp,
      metadata: {
        address: record.address,
        image: record.metadata.image,
        seller: record.metadata.seller,
        category: record.metadata.category,
        rarity: record.metadata.rarity,
        link: record.metadata.link,
        nftName: record.metadata.nftName,
        network: record.metadata.network,
        title: record.metadata.title,
        description: record.metadata.description
      }
    }
  }

  return {
    notificationType,
    run,
    convertToEvent
  }
}
