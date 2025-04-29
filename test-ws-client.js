const WebSocket = require('ws')

// Get the port from environment or use default
const PORT = process.env.PORT || 5002
const ADDRESS = '0x1234567890abcdef1234567890abcdef12345678'

// Create a sample event - matches the format expected by the server
const createTestEvent = () => {
  return {
    type: 'CLIENT',
    subType: 'WALKED_PARCELS',
    timestamp: Date.now(),
    key: `test-event-${Date.now()}`,
    metadata: {
      address: ADDRESS,
      visitedParcel: '0,0'
    }
  }
}

// Connect to the WebSocket server using the address in the URL
const ws = new WebSocket(`ws://localhost:${PORT}/${ADDRESS}/ws-events`)

ws.on('open', () => {
  console.log(`Connected to server with address: ${ADDRESS}`)

  // Send test event
  const testEvent = createTestEvent()
  console.log('Sending test event:', JSON.stringify(testEvent, null, 2))
  ws.send(JSON.stringify(testEvent))
})

ws.on('message', (data) => {
  console.log('Received response:', data.toString())

  // Wait a moment and send another event if needed
  setTimeout(() => {
    const anotherEvent = createTestEvent()
    anotherEvent.metadata.amountOfParcelsVisited = 10
    anotherEvent.metadata.lastParcel = '1,1'
    console.log('Sending another test event:', JSON.stringify(anotherEvent, null, 2))
    ws.send(JSON.stringify(anotherEvent))
  }, 2000)
})

ws.on('error', (error) => {
  console.error('WebSocket error:', error)
})

ws.on('close', (code, reason) => {
  console.log('Connection closed:', code, reason.toString())
})

// Keep the process running for a while
setTimeout(() => {
  console.log('Closing connection')
  ws.close()
  process.exit(0)
}, 10000) // Run for 10 seconds
