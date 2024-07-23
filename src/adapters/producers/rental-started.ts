import { L1Network } from '@dcl/catalyst-contracts'
import { AppComponents, IEventGenerator } from '../../types'
import { chunks } from '../../logic/utils'
import { findCoordinatesForLandTokenId } from '../../logic/land-utils'
import { Events, RentalStartedEvent } from '@dcl/schemas'

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
    const produced: RentalStartedEvent[] = []

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
        const event: RentalStartedEvent = {
          type: Events.Type.BLOCKCHAIN,
          subType: Events.SubType.Blockchain.RENTAL_STARTED,
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
            title: 'LAND Rented'
          }
        }
        produced.push(event)

        paginationId = rental.id
      }
    } while (result.rentals.length === PAGE_SIZE)

    for (const chunk of chunks<RentalStartedEvent>(produced, 1000)) {
      const landsByTokenId = await findCoordinatesForLandTokenId(network as L1Network, landManagerSubGraph, chunk)
      for (const record of chunk) {
        record.metadata.land = landsByTokenId[record.metadata.tokenId][0] // For estates, we just take one of the lands
        record.metadata.description = `Your ${landsByTokenId[record.metadata.tokenId].length > 1 ? 'ESTATE' : 'LAND'} at ${landsByTokenId[record.metadata.tokenId][0]} was rented by ${record.metadata.tenant}.`
      }
    }

    return {
      event: {
        type: Events.Type.BLOCKCHAIN,
        subType: Events.SubType.Blockchain.RENTAL_STARTED
      },
      records: produced,
      lastRun: now
    }
  }

  return {
    event: {
      type: Events.Type.BLOCKCHAIN,
      subType: Events.SubType.Blockchain.RENTAL_STARTED
    },
    run
  }
}
