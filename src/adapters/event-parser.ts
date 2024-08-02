import { Event, Events, MoveToParcelEvent } from '@dcl/schemas'

enum ExplorerEventIds {
  MOVE_TO_PARCEL = 'move_to_parcel'
}

function parseExplorerClientEvent(event: any): Event | undefined {
  if (event.body && (event.body.event as string).toLocaleLowerCase() === ExplorerEventIds.MOVE_TO_PARCEL) {
    return {
      type: Events.Type.CLIENT,
      subType: Events.SubType.Client.MOVE_TO_PARCEL,
      timestamp: event.body.timestamp,
      key: event.body.messageId,
      metadata: {
        authChain: JSON.parse(event.body.context.auth_chain),
        userAddress: event.body.context.dcl_eth_address,
        timestamp: event.body.sentAt,
        realm: event.body.context.realm,
        parcel: {
          isEmptyParcel: event.body.properties.is_empty_parcel,
          newParcel: event.body.properties.new_parcel,
          oldParcel: event.body.properties.old_parcel,
          sceneHash: event.body.properties.scene_hash
        }
      }
    } as MoveToParcelEvent
  }

  return undefined
}

export { parseExplorerClientEvent }
