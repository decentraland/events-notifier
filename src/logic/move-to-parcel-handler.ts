import { EthAddress, Events } from '@dcl/schemas'
import { AppComponents, MoveToParcelHandler } from '../types'

const THRESHOLDS = [5, 10, 15, 20]

export function createMoveToParcelHandlerComponent(
  components: Pick<AppComponents, 'logs' | 'eventPublisher' | 'database'>
): MoveToParcelHandler {
  const { logs, database, eventPublisher } = components
  const logger = logs.getLogger('poc')

  async function processMoveToParcel(address: EthAddress, parcelVisited: string) {
    const parsedAddress = address.toLocaleLowerCase()
    logger.debug('Processing move to parcel', { address: parsedAddress, parcelVisited: parcelVisited.toString() })

    const amountOfParcelsVisited = await database.upsertWalkedParcelsEvent({ address: parsedAddress })
    logger.debug('Amount of parcels visited', { address: parsedAddress, amountOfParcelsVisited })

    if (THRESHOLDS.includes(amountOfParcelsVisited)) {
      logger.debug('Publishing event', { address: parsedAddress, amountOfParcelsVisited })
      await eventPublisher.publishMessage({
        type: Events.Type.CLIENT,
        subType: Events.SubType.Client.WALKED_PARCELS,
        key: `${parsedAddress}-${amountOfParcelsVisited}-${Date.now()}`,
        timestamp: Date.now(),
        metadata: {
          address: parsedAddress,
          amountOfParcelsVisited,
          lastParcel: parcelVisited.toString()
        }
      })
    }
  }

  return {
    processMoveToParcel
  }
}
