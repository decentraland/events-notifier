const WebSocket = require('ws')

// Get the port from environment or use default
const PORT = process.env.PORT || 5002
const ADDRESS = '0x1234567890abcdef1234567890abcdef12345678'

// Create a sample event - matches the format expected by the server
const createTestEvent = (parcelCoords) => {
  return {
    type: 'CLIENT',
    subType: 'WALKED_PARCELS',
    timestamp: Date.now(),
    key: `test-event-${Date.now()}`,
    metadata: {
      address: ADDRESS,
      visitedParcel: parcelCoords
    }
  }
}

// Connect to the WebSocket server using the address in the URL
const ws = new WebSocket(`ws://events-notifier-rpc.decentraland.zone:5000/${ADDRESS}/notifications`)

// Track current position to simulate movement
let currentX = 0
let currentY = 0

// Function to send movement events
const sendMovementEvent = () => {
  // Generate a parcel coordinate
  const parcelCoords = `${currentX},${currentY}`

  // Create and send the event
  const event = createTestEvent(parcelCoords)
  console.log(`Sending movement to parcel: ${parcelCoords}`, event)
  ws.send(JSON.stringify(event))

  // Update position for next event - moving along Y axis
  currentY++

  // If we've gone too far, reset and move to next X
  if (currentY > 5) {
    currentY = 0
    currentX++
  }
}

ws.on('open', () => {
  console.log(`Connected to server with address: ${ADDRESS}`)

  // Send first movement event immediately
  sendMovementEvent()

  // Set up interval to send an event every second
  const interval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      sendMovementEvent()
    } else {
      clearInterval(interval)
    }
  }, 1000)
})

ws.on('message', (data) => {
  console.log('Received response:', data.toString())
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
}, 30000) // Run for 30 seconds to allow more movement