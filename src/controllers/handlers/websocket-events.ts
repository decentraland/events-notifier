import { HandlerContextWithPath } from '../../types'

export function setupWebSocketEventsHandler(
  context: Pick<
    HandlerContextWithPath<'logs' | 'metrics' | 'uwsServer' | 'moveToParcelHandler', '/:address/notifications'>,
    'components'
  >
) {
  const { logs, metrics, uwsServer, moveToParcelHandler } = context.components
  const logger = logs.getLogger('websocket-events')

  uwsServer.app.get('/health/live', (res) => {
    res.writeStatus('200 OK')
    res.writeHeader('Access-Control-Allow-Origin', '*')
    res.end('alive')
  })

  uwsServer.app.get('/health/ready', (res) => {
    res.writeStatus('200 OK')
    res.writeHeader('Access-Control-Allow-Origin', '*')
    res.end('alive')
  })

  // Handle WebSocket connections using the UWS HTTP server
  uwsServer.app.ws('/:address/notifications', {
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
        console.log('userData', userData)
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
          const parsedEvent = {
            metadata: {
              visitedParcel: data.new_parcel as string,
              address: address
            }
          }

          logger.info(`Processing event from ${address}:`, {
            parsedEvent: JSON.stringify(parsedEvent)
          })
          await moveToParcelHandler.processMoveToParcel(address, parsedEvent.metadata.visitedParcel)

          // Record metrics
          metrics.increment('handled_explorer_events_count', {
            event_type: data.subType || 'unknown'
          })
        } catch (pubError) {
          logger.error('Error processing event', {
            error: pubError instanceof Error ? pubError.message : String(pubError)
          })
          ws.send(
            JSON.stringify({
              ok: false,
              error: 'Failed to process event'
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
