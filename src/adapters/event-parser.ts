import { Event, Events, MoveToParcelEvent } from '@dcl/schemas'

enum ExplorerEventIds {
  MOVE_TO_PARCEL = 'move_to_parcel'
}

function parseExplorerClientEvent(event: any): Event | undefined {
  const parsedBody = !!event.body ? JSON.parse(event.body) : undefined
  if (parsedBody && (parsedBody.event as string).toLocaleLowerCase() === ExplorerEventIds.MOVE_TO_PARCEL) {
    return {
      type: Events.Type.CLIENT,
      subType: Events.SubType.Client.MOVE_TO_PARCEL,
      timestamp: parsedBody.timestamp,
      key: parsedBody.messageId,
      metadata: {
        authChain: JSON.parse(parsedBody.context.auth_chain),
        userAddress: parsedBody.context.dcl_eth_address,
        timestamp: parsedBody.sentAt,
        realm: parsedBody.context.realm,
        parcel: {
          isEmptyParcel: parsedBody.properties.is_empty_parcel,
          newParcel: parsedBody.properties.new_parcel,
          oldParcel: parsedBody.properties.old_parcel,
          sceneHash: parsedBody.properties.scene_hash
        }
      }
    } as MoveToParcelEvent
  }

  return undefined
}

export { parseExplorerClientEvent }
