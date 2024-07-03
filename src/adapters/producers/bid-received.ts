import { NotificationType } from '@dcl/schemas'
import { formatMana } from '../../logic/utils'
import { AppComponents, BidReceivedEvent, EventType, IEventGenerator, NotificationRecord } from '../../types'

export const PAGE_SIZE = 1000

const BIDS_QUERY = `
    query Bids($since: BigInt!, $paginationId: ID) {
      bids(
        where: {createdAt_gte: $since, id_gt: $paginationId}
        orderBy: id
        orderDirection: asc
        first: ${PAGE_SIZE}
      ) {
        id
        bidder
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
        createdAt
        price
        blockchainId
      }
    }
`

type BidsResponse = {
  bids: {
    id: string
    type: string
    bidder: string
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
    createdAt: number
    price: string
    blockchainId: string
  }[]
}

const notificationType = NotificationType.BID_RECEIVED

export async function bidReceivedProducer(
  components: Pick<AppComponents, 'config' | 'l2CollectionsSubGraph'>
): Promise<IEventGenerator> {
  const { config, l2CollectionsSubGraph } = components

  const marketplaceBaseUrl = await config.requireString('MARKETPLACE_BASE_URL')

  async function run(since: number) {
    const now = Date.now()
    const produced: NotificationRecord[] = []

    let result: BidsResponse
    let paginationId = ''
    do {
      result = await l2CollectionsSubGraph.query<BidsResponse>(BIDS_QUERY, {
        since: Math.floor(since / 1000),
        paginationId
      })

      if (result.bids.length === 0) {
        break
      }

      for (const bid of result.bids) {
        const notificationRecord = {
          type: notificationType,
          address: bid.seller,
          eventKey: bid.blockchainId,
          metadata: {
            image: bid.nft.image,
            seller: bid.seller,
            category: bid.nft.category,
            rarity: bid.nft.metadata[bid.nft.category]?.rarity,
            link: `${marketplaceBaseUrl}/account?assetType=nft&section=bids`,
            nftName: bid.nft.metadata[bid.nft.category]?.name,
            price: bid.price,
            title: 'Bid Received',
            description: `You received a bid of ${formatMana(bid.price)} MANA for this ${
              bid.nft.metadata[bid.nft.category]?.name
            }.`,
            network: 'polygon'
          },
          timestamp: bid.createdAt * 1000
        }
        produced.push(notificationRecord)

        paginationId = bid.id
      }
    } while (result.bids.length === PAGE_SIZE)

    return {
      notificationType: notificationType,
      records: produced,
      lastRun: now
    }
  }

  function convertToEvent(record: NotificationRecord): BidReceivedEvent {
    return {
      type: EventType.BID_RECEIVED,
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
        price: record.metadata.price,
        title: record.metadata.title,
        description: record.metadata.description,
        network: record.metadata.network
      }
    }
  }

  return {
    notificationType,
    run,
    convertToEvent
  }
}
