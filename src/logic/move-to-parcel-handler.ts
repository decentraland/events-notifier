import { EthAddress, Parcel } from '@dcl/schemas'
import { AppComponents, MoveToParcelHandler } from '../types'

export function createMoveToParcelHandlerComponent(
  components: Pick<AppComponents, 'logs' | 'eventPublisher' | 'database'>
): MoveToParcelHandler {
  const { logs } = components
  const logger = logs.getLogger('poc')

  async function processMoveToParcel(address: EthAddress, parcelVisited: Parcel) {
    logger.debug('Processing move to parcel', { address, parcelVisited: parcelVisited.toString() })
  }

  return {
    processMoveToParcel
  }
}
