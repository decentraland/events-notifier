import { EthAddress, Events } from '@dcl/schemas'
import { AppComponents, MoveToParcelHandler } from '../types'

const THRESHOLDS = [5, 10, 15, 20]

export function createMoveToParcelHandlerComponent(
  components: Pick<AppComponents, 'logs' | 'eventPublisher' | 'database'>
): MoveToParcelHandler {
  const { logs, database, eventPublisher } = components
  const logger = logs.getLogger('poc')

  async function processMoveToParcel(address: EthAddress, parcelVisited: string) {
    logger.debug('Processing move to parcel', { address, parcelVisited: parcelVisited.toString() })

    const amountOfParcelsVisited = await database.upsertWalkedParcelsEvent({ address })
    logger.debug('Amount of parcels visited', { address, amountOfParcelsVisited })

    if (THRESHOLDS.includes(amountOfParcelsVisited)) {
      await eventPublisher.publishMessage({
        type: Events.Type.CLIENT,
        subType: Events.SubType.Client.WALKED_PARCELS,
        key: `${address}-${amountOfParcelsVisited}`,
        timestamp: Date.now(),
        metadata: {
          address,
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
