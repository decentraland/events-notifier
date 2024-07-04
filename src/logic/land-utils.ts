import { ISubgraphComponent } from '@well-known-components/thegraph-component'
import { l1Contracts, L1Network } from '@dcl/catalyst-contracts'
import { RentalEndedEvent, RentalStartedEvent } from '../types'

const LAND_AND_ESTATE_QUERY = `
    query LandsAndEstates($landTokenIds: [BigInt!], $estateTokenIds: [ID!]) {
      parcels(where: {tokenId_in: $landTokenIds}) {
        x
        y
        tokenId
      }
      estates(where: {id_in: $estateTokenIds}) {
        id
        parcels {
          x
          y
        }
      }
    }
`

type LandAndEstateResponse = {
  parcels: {
    x: number
    y: number
    tokenId: string
  }[]
  estates: {
    id: string
    parcels: { x: number; y: number }[]
  }[]
}

export async function findCoordinatesForLandTokenId(
  network: L1Network,
  landManagerSubGraph: ISubgraphComponent,
  batch: RentalEndedEvent[] | RentalStartedEvent[]
): Promise<Record<string, string[]>> {
  const landResult = await landManagerSubGraph.query<LandAndEstateResponse>(LAND_AND_ESTATE_QUERY, {
    landTokenIds: batch.filter((r) => r.metadata.contract === l1Contracts[network].land).map((r) => r.metadata.tokenId),
    estateTokenIds: batch
      .filter((r) => r.metadata.contract === l1Contracts[network].state)
      .map((r) => r.metadata.tokenId)
  })

  const landResults = landResult.parcels.reduce(
    (acc, land) => {
      acc[land.tokenId] = [`${land.x},${land.y}`]
      return acc
    },
    {} as Record<string, string[]>
  )

  const estateResults = landResult.estates.reduce(
    (acc, estate) => {
      acc[estate.id] = estate.parcels.map((parcel) => `${parcel.x},${parcel.y}`)
      return acc
    },
    {} as Record<string, string[]>
  )

  return { ...landResults, ...estateResults }
}
