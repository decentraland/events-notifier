import { Event, Events, MoveToParcelEvent, PassportOpenedEvent, UsedEmoteEvent } from '@dcl/schemas'

enum ExplorerEventIds {
  MOVE_TO_PARCEL = 'move_to_parcel',
  USED_EMOTE = 'used_emote',
  PASSPORT_OPENED = 'passport_opened'
}

function parseExplorerClientEvent(event: any): Event | undefined {
  if (!event || !event.event) return undefined

  if ((event.event as string).toLocaleLowerCase() === ExplorerEventIds.MOVE_TO_PARCEL) {
    return {
      type: Events.Type.CLIENT,
      subType: Events.SubType.Client.MOVE_TO_PARCEL,
      timestamp: new Date(event.timestamp).getTime(),
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

  if ((event.event as string).toLocaleLowerCase() === ExplorerEventIds.USED_EMOTE) {
    return {
      type: Events.Type.CLIENT,
      subType: Events.SubType.Client.USED_EMOTE,
      timestamp: new Date(event.timestamp).getTime(),
      key: event.messageId,
      metadata: {
        authChain: JSON.parse(event.context.auth_chain),
        userAddress: event.context.dcl_eth_address,
        sessionId: event.context.session_id,
        timestamp: event.sentAt,
        realm: event.context.realm,
        emote: {
          emoteIndex: event.properties.emote_index,
          isBase: event.properties.is_base,
          itemId: event.properties.item_id,
          source: event.properties.source
        }
      }
    } as UsedEmoteEvent
  }

  if ((event.event as string).toLocaleLowerCase() === ExplorerEventIds.PASSPORT_OPENED) {
    return {
      type: Events.Type.CLIENT,
      subType: Events.SubType.Client.PASSPORT_OPENED,
      timestamp: new Date(event.timestamp).getTime(),
      key: event.messageId,
      metadata: {
        authChain: JSON.parse(event.context.auth_chain),
        userAddress: event.context.dcl_eth_address,
        sessionId: event.context.session_id,
        timestamp: event.sentAt,
        realm: event.context.realm,
        passport: {
          receiver: event.properties.receiver
        }
      }
    } as PassportOpenedEvent
  }

  return undefined
}

export { parseExplorerClientEvent }
