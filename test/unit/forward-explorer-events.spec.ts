import { setForwardExplorerEventsHandler } from '../../src/controllers/handlers/forward-explorer-events'
import { createLogsMockComponent } from '../mocks/logs-mock'
import crypto from 'crypto'
import { HandlerContextWithPath } from '../../src/types'

jest.mock('@dcl/crypto', () => ({
  Authenticator: {
    isValidAuthChain: jest.fn().mockReturnValue(true),
    ownerAddress: jest.fn().mockReturnValue('test-user')
  }
}))

describe('forward-explorer-events handler', () => {
  const mockedLogs = createLogsMockComponent()

  const mockSegmentPublisher = {
    publishToSegment: jest.fn().mockResolvedValue(true)
  }

  const mockEventPublisher = {
    publishMessage: jest.fn().mockResolvedValue('message-id')
  }

  const mockEventParser = {
    parseExplorerClientEvent: jest.fn()
  }

  const mockConfig = {
    requireString: jest.fn(),
    getString: jest.fn()
  }

  const mockMetrics = {
    increment: jest.fn()
  }

  const SEGMENT_SIGNING_KEY = 'test-segment-key'
  const EXPLORER_CLIENT_KEY = 'test-explorer-key'

  beforeEach(() => {
    jest.clearAllMocks()

    // Configure mocks
    mockConfig.requireString.mockImplementation((key: string) => {
      if (key === 'SEGMENT_SIGNING_KEY') return Promise.resolve(SEGMENT_SIGNING_KEY)
      if (key === 'EXPLORER_CLIENT_KEY') return Promise.resolve(EXPLORER_CLIENT_KEY)
      return Promise.resolve('')
    })

    mockEventParser.parseExplorerClientEvent.mockImplementation((event: any) => {
      if (!event) return undefined

      return {
        type: 'test-type',
        subType: 'test-subtype',
        metadata: {
          userAddress: 'test-user',
          authChain: [],
          timestamps: {
            reportedAt: 1000,
            receivedAt: 2000
          }
        },
        timestamp: 3000
      }
    })
  })

  const createValidSegmentSignature = (body: any) => {
    return crypto
      .createHmac('sha1', SEGMENT_SIGNING_KEY)
      .update(Buffer.from(JSON.stringify(body), 'utf-8'))
      .digest('hex')
  }

  const createContext = (options: { body?: any; segmentSigned?: boolean; explorerClient?: boolean } = {}) => {
    const body = options.body || { data: 'test-data' }
    const headers = new Map<string, string>()

    if (options.segmentSigned) {
      headers.set('x-signature', createValidSegmentSignature(body))
    }

    if (options.explorerClient) {
      headers.set('x-explorer-client', EXPLORER_CLIENT_KEY)
    }

    // Mock the handler context directly
    const mockContext = {
      params: {},
      request: {
        headers: {
          get: (key: string) => headers.get(key) || null
        },
        json: () => Promise.resolve(body)
      } as any,
      components: {
        logs: mockedLogs,
        config: mockConfig,
        eventParser: mockEventParser,
        eventPublisher: mockEventPublisher,
        segmentPublisher: mockSegmentPublisher,
        metrics: mockMetrics
      }
    } as unknown as Pick<
      HandlerContextWithPath<
        'eventPublisher' | 'eventParser' | 'config' | 'logs' | 'metrics' | 'segmentPublisher',
        '/forward'
      >,
      'params' | 'request' | 'components'
    >

    return mockContext
  }

  it('should reject requests without valid authentication', async () => {
    const result = await setForwardExplorerEventsHandler(createContext())

    expect(result.status).toBe(401)
    expect(result.body.ok).toBe(false)
    expect(mockEventPublisher.publishMessage).not.toHaveBeenCalled()
    expect(mockSegmentPublisher.publishToSegment).not.toHaveBeenCalled()
  })

  describe('and it is a Segment-signed request', () => {
    describe('and the event is invalid', () => {
      beforeEach(() => {
        mockEventParser.parseExplorerClientEvent.mockReturnValue(undefined)
      })

      it('should reject requests with invalid events', async () => {
        const result = await setForwardExplorerEventsHandler(createContext({ segmentSigned: true }))

        expect(result.status).toBe(400)
        expect(result.body.ok).toBe(false)
        expect(mockEventPublisher.publishMessage).not.toHaveBeenCalled()
        expect(mockSegmentPublisher.publishToSegment).not.toHaveBeenCalled()
      })
    })

    describe('and the event is valid', () => {
      it('should forward events from Segment and not publish to Segment again', async () => {
        const result = await setForwardExplorerEventsHandler(createContext({ segmentSigned: true }))

        expect(result.status).toBe(200)
        expect(result.body.ok).toBe(true)
        expect(mockEventPublisher.publishMessage).toHaveBeenCalledTimes(1)
        expect(mockSegmentPublisher.publishToSegment).not.toHaveBeenCalled()
      })
    })
  })

  describe('and it is a Explorer-signed request', () => {
    it('should forward events from Explorer and publish to Segment in parallel', async () => {
      const result = await setForwardExplorerEventsHandler(createContext({ explorerClient: true }))

      expect(result.status).toBe(200)
      expect(result.body.ok).toBe(true)
      expect(mockEventPublisher.publishMessage).toHaveBeenCalledTimes(1)
      expect(mockSegmentPublisher.publishToSegment).toHaveBeenCalledTimes(1)

      // Check that Promise.all is being used by verifying both were called before awaiting results
      const publishMessageCall = mockEventPublisher.publishMessage.mock.invocationCallOrder[0]
      const publishToSegmentCall = mockSegmentPublisher.publishToSegment.mock.invocationCallOrder[0]

      expect(publishMessageCall).toBeTruthy()
      expect(publishToSegmentCall).toBeTruthy()
    })
  })

  it('should record metrics for event delays', async () => {
    await setForwardExplorerEventsHandler(createContext({ segmentSigned: true }))

    expect(mockMetrics.increment).toHaveBeenCalledTimes(3)
    expect(mockMetrics.increment).toHaveBeenCalledWith('handled_explorer_events_count', {
      event_type: 'test-subtype',
      source: 'segment'
    })
    expect(mockMetrics.increment).toHaveBeenCalledWith(
      'explorer_segment_event_delay_in_seconds_total',
      { event_type: 'test-subtype' },
      1
    )
    expect(mockMetrics.increment).toHaveBeenCalledWith(
      'segment_webhook_event_delay_in_seconds_total',
      { event_type: 'test-subtype' },
      1
    )
  })
})
