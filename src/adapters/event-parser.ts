import { Event, Events, MoveToParcelEvent } from '@dcl/schemas'

enum ExplorerEventIds {
  MOVE_TO_PARCEL = 'move_to_parcel'
}

function parseExplorerClientEvent(event: any): Event | undefined {
  //   console.log({ event })
  //   const parsedBody = !!event ? JSON.parse(event) : undefined
  //   console.log({ parsedBody })

  console.log({ stringifiedEvent: JSON.stringify(event) })
  if (event && (event.event as string).toLocaleLowerCase() === ExplorerEventIds.MOVE_TO_PARCEL) {
    return {
      type: Events.Type.CLIENT,
      subType: Events.SubType.Client.MOVE_TO_PARCEL,
      timestamp: event.timestamp,
      key: event.messageId,
      metadata: {
        authChain: JSON.parse(event.context.auth_chain),
        userAddress: event.context.dcl_eth_address,
        sessionId: event.context.session_id,
        timestamp: event.sentAt,
        realm: event.context.realm,
        parcel: {
          isEmptyParcel: event.properties.is_empty_parcel,
          newParcel: event.properties.new_parcel,
          oldParcel: event.properties.old_parcel,
          sceneHash: event.properties.scene_hash
        }
      }
    } as MoveToParcelEvent
  }

  return undefined
}

export { parseExplorerClientEvent }
