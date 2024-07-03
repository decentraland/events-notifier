import { NotificationType } from '@dcl/schemas'
import { L1Network } from '@dcl/catalyst-contracts'
import { AppComponents, EventType, IEventGenerator, NotificationRecord, RentalStartedEvent } from '../../types'
import { chunks } from '../../logic/utils'
import { findCoordinatesForLandTokenId } from '../../logic/land-utils'

export const PAGE_SIZE = 1000

const RENTALS_STARTED_QUERY = `
    query StartedRentals($since: BigInt!, $upTo: BigInt!, $paginationId: ID) {
      rentals(
        where: {id_gt: $paginationId, startedAt_gte: $since, startedAt_lt: $upTo}
        orderBy: id
        orderDirection: desc
        first: ${PAGE_SIZE}
      ) {
        id
        contractAddress
        lessor
        tenant
        operator
        startedAt
        endsAt
        tokenId
      }
    }
`

type RentalsResponse = {
  rentals: {
    id: string
    contractAddress: string
    lessor: string
    tenant: string
    operator: string
    startedAt: string
    endsAt: string
    tokenId: string
  }[]
}

const notificationType = NotificationType.LAND_RENTED

export async function rentalStartedProducer(
  components: Pick<AppComponents, 'config' | 'landManagerSubGraph' | 'rentalsSubGraph'>
): Promise<IEventGenerator> {
  const { config, landManagerSubGraph, rentalsSubGraph } = components

  const [marketplaceBaseUrl, network] = await Promise.all([
    config.requireString('MARKETPLACE_BASE_URL'),
    config.requireString('NETWORK')
  ])

  async function run(since: number) {
    const now = Date.now()
    const produced: NotificationRecord[] = []

    let result: RentalsResponse
    let paginationId = ''
    do {
      result = await rentalsSubGraph.query<RentalsResponse>(RENTALS_STARTED_QUERY, {
        since: Math.floor(since / 1000),
        upTo: Math.floor(now / 1000),
        paginationId
      })

      if (result.rentals.length === 0) {
        break
      }

      for (const rental of result.rentals) {
        const notificationRecord = {
          type: notificationType,
          address: rental.lessor,
          eventKey: rental.id,
          metadata: {
            contract: rental.contractAddress,
            lessor: rental.lessor,
            tenant: rental.tenant,
            operator: rental.operator,
            startedAt: rental.startedAt,
            endedAt: rental.endsAt,
            tokenId: rental.tokenId,
            link: `${marketplaceBaseUrl}/contracts/${rental.contractAddress}/tokens/${rental.tokenId}/manage`,
            title: 'LAND Rented'
          },
          timestamp: parseInt(rental.startedAt) * 1000
        }
        produced.push(notificationRecord)

        paginationId = rental.id
      }
    } while (result.rentals.length === PAGE_SIZE)

    for (const chunk of chunks(produced, 1000)) {
      const landsByTokenId = await findCoordinatesForLandTokenId(network as L1Network, landManagerSubGraph, chunk)
      for (const record of chunk) {
        record.metadata.land = landsByTokenId[record.metadata.tokenId][0] // For estates, we just take one of the lands
        record.metadata.description = `Your ${landsByTokenId[record.metadata.tokenId].length > 1 ? 'ESTATE' : 'LAND'} at ${landsByTokenId[record.metadata.tokenId][0]} was rented by ${record.metadata.tenant}.`
      }
    }

    return {
      notificationType: notificationType,
      records: produced,
      lastRun: now
    }
  }

  function convertToEvent(record: NotificationRecord): RentalStartedEvent {
    return {
      type: EventType.RENTAL_STARTED,
      key: record.eventKey,
      timestamp: record.timestamp,
      metadata: {
        address: record.address,
        land: record.metadata.land,
        contract: record.metadata.contract,
        lessor: record.metadata.lessor,
        tenant: record.metadata.tenant,
        operator: record.metadata.operator,
        startedAt: record.metadata.startedAt,
        endedAt: record.metadata.endedAt,
        tokenId: record.metadata.tokenId,
        link: record.metadata.link,
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
