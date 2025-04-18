import {
  Events,
  LoggedInCachedEvent,
  LoggedInEvent,
  MoveToParcelEvent,
  PassportOpenedEvent,
  UsedEmoteEvent,
  VerticalHeightReachedEvent,
  WalkedDistanceEvent
} from '@dcl/schemas'
import { AppComponents, IEventParser } from '../types'

enum ExplorerEventIds {
  MOVE_TO_PARCEL = 'move_to_parcel',
  USED_EMOTE = 'used_emote',
  PASSPORT_OPENED = 'passport_opened',
  WALKED_DISTANCE = 'walked_distance',
  VERTICAL_HEIGHT_REACHED = 'vertical_height_reached',
  LOGGED_IN = 'logged_in',
  LOGGED_IN_CACHED = 'logged_in_cached'
}

export type ClientEvent =
  | MoveToParcelEvent
  | PassportOpenedEvent
  | UsedEmoteEvent
  | VerticalHeightReachedEvent
  | WalkedDistanceEvent
  | LoggedInEvent
  | LoggedInCachedEvent

export function createEventParserComponent({ logs }: Pick<AppComponents, 'logs'>): IEventParser {
  const logger = logs.getLogger('event-parser')

  function isAddressCorrectlyConfigured(event: any): boolean {
    return event.context && event.context.dcl_eth_address && event.context.dcl_eth_address !== 'NOT CONFIGURED'
  }

  function parseExplorerClientEvent(event: any): ClientEvent | undefined {
    try {
      if (!event || !event.event) return undefined

      if (!isAddressCorrectlyConfigured(event)) {
        logger.warn('Event does not have a user address, discarding', { event })
        return undefined
      }

      if ((event.event as string).toLocaleLowerCase() === ExplorerEventIds.MOVE_TO_PARCEL) {
        return {
          type: Events.Type.CLIENT,
          subType: Events.SubType.Client.MOVE_TO_PARCEL,
          timestamp: Date.now(),
          key: event.messageId,
          metadata: {
            authChain: JSON.parse(event.context.auth_chain),
            userAddress: event.context.dcl_eth_address,
            sessionId: event.context.session_id,
            timestamp: event.sentAt,
            timestamps: {
              receivedAt: new Date(event.receivedAt).getTime(),
              reportedAt: new Date(event.timestamp).getTime()
            },
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
          timestamp: Date.now(),
          key: event.messageId,
          metadata: {
            authChain: JSON.parse(event.context.auth_chain),
            userAddress: event.context.dcl_eth_address,
            sessionId: event.context.session_id,
            timestamp: event.sentAt,
            timestamps: {
              receivedAt: new Date(event.receivedAt).getTime(),
              reportedAt: new Date(event.timestamp).getTime()
            },
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
          timestamp: Date.now(),
          key: event.messageId,
          metadata: {
            authChain: JSON.parse(event.context.auth_chain),
            userAddress: event.context.dcl_eth_address,
            sessionId: event.context.session_id,
            timestamp: event.sentAt,
            timestamps: {
              receivedAt: new Date(event.receivedAt).getTime(),
              reportedAt: new Date(event.timestamp).getTime()
            },
            realm: event.context.realm,
            passport: {
              receiver: event.properties.receiver_id
            }
          }
        } as PassportOpenedEvent
      }

      if ((event.event as string).toLocaleLowerCase() === ExplorerEventIds.WALKED_DISTANCE) {
        return {
          type: Events.Type.CLIENT,
          subType: Events.SubType.Client.WALKED_DISTANCE,
          timestamp: Date.now(),
          key: event.messageId,
          metadata: {
            authChain: JSON.parse(event.context.auth_chain),
            userAddress: event.context.dcl_eth_address,
            sessionId: event.context.session_id,
            timestamp: event.sentAt,
            timestamps: {
              receivedAt: new Date(event.receivedAt).getTime(),
              reportedAt: new Date(event.timestamp).getTime()
            },
            realm: event.context.realm,
            distance: event.properties.distance,
            stepCount: event.properties.step_count
          }
        } as WalkedDistanceEvent
      }

      if ((event.event as string).toLocaleLowerCase() === ExplorerEventIds.VERTICAL_HEIGHT_REACHED) {
        return {
          type: Events.Type.CLIENT,
          subType: Events.SubType.Client.VERTICAL_HEIGHT_REACHED,
          timestamp: Date.now(),
          key: event.messageId,
          metadata: {
            authChain: JSON.parse(event.context.auth_chain),
            userAddress: event.context.dcl_eth_address,
            sessionId: event.context.session_id,
            timestamp: event.sentAt,
            timestamps: {
              receivedAt: new Date(event.receivedAt).getTime(),
              reportedAt: new Date(event.timestamp).getTime()
            },
            realm: event.context.realm,
            height: event.properties.height
          }
        } as VerticalHeightReachedEvent
      }

      if (
        [ExplorerEventIds.LOGGED_IN, ExplorerEventIds.LOGGED_IN_CACHED].includes(
          event.event.toLowerCase() as ExplorerEventIds
        )
      ) {
        return {
          type: Events.Type.CLIENT,
          subType:
            (event.event as string).toLocaleLowerCase() === ExplorerEventIds.LOGGED_IN_CACHED
              ? Events.SubType.Client.LOGGED_IN_CACHED
              : Events.SubType.Client.LOGGED_IN,
          timestamp: Date.now(),
          key: event.messageId,
          metadata: {
            authChain: JSON.parse(event.context.auth_chain),
            userAddress: event.context.dcl_eth_address,
            sessionId: event.context.session_id,
            timestamp: event.sentAt,
            timestamps: {
              receivedAt: new Date(event.receivedAt).getTime(),
              reportedAt: new Date(event.timestamp).getTime()
            },
            realm: event.context.realm
          }
        } as LoggedInEvent
      }

      return undefined
    } catch (error: any) {
      logger.error(`Error parsing event: ${error.message}`, { event })
      return undefined
    }
  }

  return { parseExplorerClientEvent }
}
