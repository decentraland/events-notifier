import { Authenticator } from '@dcl/crypto'
import { AuthChain, EthAddress } from '@dcl/schemas'
import { HandlerContextWithPath } from '../../types'
import { ClientEvent } from '../../adapters/event-parser'
import { IUWsComponent, WebSocket } from '@well-known-components/uws-http-server'

function validateAuthChain(authChain: AuthChain, address: EthAddress): Promise<boolean> {
  if (!Authenticator.isValidAuthChain(authChain)) {
    return Promise.resolve(false)
  }

  const ownerAddress = Authenticator.ownerAddress(authChain)
  return Promise.resolve(ownerAddress.toLocaleLowerCase() === address.toLocaleLowerCase())
}

// Define additional properties for the WebSocket
interface CustomWebSocket extends WebSocket<{ address: string }> {
  userData?: {
    id: string
    address: string
  }
}

export function setupWebSocketEventsHandler(
  context: Pick<
    HandlerContextWithPath<
      'eventPublisher' | 'eventParser' | 'logs' | 'metrics' | 'uwsServer' | 'moveToParcelHandler',
      '/:address/ws-events'
    >,
    'components'
  >
) {
  const { logs, eventParser, eventPublisher, metrics, uwsServer, moveToParcelHandler } = context.components
  const logger = logs.getLogger('websocket-events')

  // Handle WebSocket connections using the UWS HTTP server
  uwsServer.app.ws('/:address/ws-events', {
    // Set up upgrade handler to get the address from the URL
    upgrade: (res, req, context) => {
      const address = req.getParameter(0)
      logger.info(`Client connecting with address: ${address}`)

      // Store address in userData
      res.upgrade(
        { address },
        req.getHeader('sec-websocket-key'),
        req.getHeader('sec-websocket-protocol'),
        req.getHeader('sec-websocket-extensions'),
        context
      )
    },

    open: (ws) => {
      logger.info('WebSocket client connected')
    },

    message: async (ws, message) => {
      try {
        // Get the client address from user data
        const userData = ws.getUserData() as { address: string }
        const address = userData.address || 'unknown'

        // Parse the message
        const data = JSON.parse(Buffer.from(message).toString())

        // Enrich the event with the address if not present
        if (data.metadata && !data.metadata.address) {
          data.metadata.address = address
        }

        logger.info(`Received event from ${address}:`, data)

        try {
          // Try to publish the event directly
          // const result = await eventPublisher.publishMessage(data)
          const parsedEvent = data
          console.log('parsedEvent', parsedEvent)
          await moveToParcelHandler.processMoveToParcel(address, parsedEvent.metadata.visitedParcel)

          // if (result) {
          //   logger.info(`Event published successfully: ${result}`)
          //   ws.send(JSON.stringify({ ok: true, messageId: result }))
          // } else {
          //   // Fallback to the event parser
          //   // const parsedEvent = eventParser.parseExplorerClientEvent(data)
          //   const parsedEvent = data
          //   console.log('parsedEvent', parsedEvent)

          //   if (parsedEvent) {
          //     await moveToParcelHandler.processMoveToParcel(address, parsedEvent)

          //     // const pubResult = await eventPublisher.publishMessage(parsedEvent)
          //     // logger.info(`Parsed event published: ${pubResult}`)
          //     // ws.send(JSON.stringify({ ok: true, messageId: pubResult }))
          //     ws.send(JSON.stringify({ ok: true, messageId: 'test' }))
          //   } else {
          //     logger.error('Failed to parse event', { data })
          //     ws.send(
          //       JSON.stringify({
          //         ok: false,
          //         error: 'Invalid event format'
          //       })
          //     )
          //   }
          // }

          // Record metrics
          metrics.increment('handled_explorer_events_count', {
            event_type: data.subType || 'unknown'
          })
        } catch (pubError) {
          logger.error('Error publishing event', {
            error: pubError instanceof Error ? pubError.message : String(pubError)
          })
          ws.send(
            JSON.stringify({
              ok: false,
              error: 'Failed to publish event'
            })
          )
        }
      } catch (error) {
        logger.error('Error processing WebSocket message', {
          error: error instanceof Error ? error.message : String(error)
        })
        ws.send(
          JSON.stringify({
            ok: false,
            error: 'Error processing message'
          })
        )
      }
    },

    close: (ws, code) => {
      logger.info('WebSocket client disconnected', { code })
    }
  })

  logger.info('WebSocket server for events set up')
  return uwsServer
}
