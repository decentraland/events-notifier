import { L1Network } from '@dcl/catalyst-contracts'
import { AppComponents, IEventGenerator } from '../../types'
import { chunks } from '../../logic/utils'
import { findCoordinatesForLandTokenId } from '../../logic/land-utils'
import { EventSubType, EventType, RentalEndedEvent } from '@dcl/schemas'

export const PAGE_SIZE = 1000

const RENTALS_ENDED_QUERY = `
    query EndedRentals($since: BigInt!, $upTo: BigInt!, $paginationId: ID) {
      rentals(
        where: {id_gt: $paginationId, endsAt_gte: $since, endsAt_lt: $upTo}
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

export async function rentalEndedProducer(
  components: Pick<AppComponents, 'config' | 'landManagerSubGraph' | 'rentalsSubGraph'>
): Promise<IEventGenerator> {
  const { config, landManagerSubGraph, rentalsSubGraph } = components

  const [marketplaceBaseUrl, network] = await Promise.all([
    config.requireString('MARKETPLACE_BASE_URL'),
    config.requireString('NETWORK')
  ])

  async function run(since: number) {
    const now = Date.now()
    const produced: RentalEndedEvent[] = []

    let result: RentalsResponse
    let paginationId = ''
    do {
      result = await rentalsSubGraph.query<RentalsResponse>(RENTALS_ENDED_QUERY, {
        since: Math.floor(since / 1000),
        upTo: Math.floor(now / 1000),
        paginationId
      })

      if (result.rentals.length === 0) {
        break
      }

      for (const rental of result.rentals) {
        const event: RentalEndedEvent = {
          type: EventType.BLOCKCHAIN,
          subType: EventSubType.RENTAL_ENDED,
          key: rental.id,
          timestamp: parseInt(rental.startedAt) * 1000,
          metadata: {
            address: rental.lessor,
            contract: rental.contractAddress,
            lessor: rental.lessor,
            tenant: rental.tenant,
            operator: rental.operator,
            startedAt: rental.startedAt,
            endedAt: rental.endsAt,
            tokenId: rental.tokenId,
            link: `${marketplaceBaseUrl}/contracts/${rental.contractAddress}/tokens/${rental.tokenId}/manage`,
            title: 'Rent Period Ending'
          }
        }
        produced.push(event)

        paginationId = rental.id
      }
    } while (result.rentals.length === PAGE_SIZE)

    for (const chunk of chunks<RentalEndedEvent>(produced, 1000)) {
      const landsByTokenId = await findCoordinatesForLandTokenId(network as L1Network, landManagerSubGraph, chunk)
      for (const record of chunk) {
        record.metadata.land = landsByTokenId[record.metadata.tokenId][0] // For estates, we just take one of the lands
        record.metadata.description = `The rent of your ${landsByTokenId[record.metadata.tokenId].length > 1 ? 'ESTATE' : 'LAND'} at ${landsByTokenId[record.metadata.tokenId][0]} has ended.`
      }
    }

    return {
      event: {
        type: EventType.BLOCKCHAIN,
        subType: EventSubType.RENTAL_ENDED
      },
      records: produced,
      lastRun: now
    }
  }

  return {
    event: {
      type: EventType.BLOCKCHAIN,
      subType: EventSubType.RENTAL_ENDED
    },
    run
  }
}
