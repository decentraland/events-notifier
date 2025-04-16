import { createSegmentPublisherComponent } from '../../src/adapters/segment-publisher'
import { ISegmentPublisher } from '../../src/types'
import { createLogsMockComponent } from '../mocks/logs-mock'
import { IConfigComponent, IFetchComponent } from '@well-known-components/interfaces'

const mockedFetch = {
  fetch: jest.fn()
} as unknown as IFetchComponent

describe('segment publisher', () => {
  const mockedLogs = createLogsMockComponent()
  const mockConfig: Pick<IConfigComponent, 'requireString' | 'getString'> = {
    requireString: jest.fn().mockResolvedValue('test-api-key'),
    getString: jest.fn()
  }

  let segmentPublisher: ISegmentPublisher
  beforeEach(async () => {
    jest.clearAllMocks()
    segmentPublisher = await createSegmentPublisherComponent({
      logs: mockedLogs,
      config: mockConfig as IConfigComponent,
      fetch: mockedFetch
    })

    // Setup default mock response
    mockedFetch.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK'
    } as any)
  })

  describe('when publishing an event to Segment', () => {
    describe('and the event is valid', () => {
      it('should publish an event to Segment successfully', async () => {
        const mockEvent = {
          type: 'test-type',
          subType: 'test-subtype',
          metadata: {
            userAddress: 'test-user'
          }
        }

        const result = await segmentPublisher.publishToSegment(mockEvent as any)

        expect(result).toBe(true)
        expect(mockedFetch.fetch).toHaveBeenCalledTimes(1)
        expect(mockedFetch.fetch).toHaveBeenCalledWith('https://api.segment.io/v1/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${Buffer.from('test-api-key:').toString('base64')}`
          },
          body: expect.stringContaining('test-type')
        })
      })
    })

    describe('and the event is invalid', () => {
      beforeEach(() => {
        // Mock fetch to return an error response
        mockedFetch.fetch = jest.fn().mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        } as any)
      })

      it('should handle errors when publishing to Segment fails', async () => {
        const mockEvent = {
          type: 'test-type',
          subType: 'test-subtype',
          metadata: {
            userAddress: 'test-user'
          }
        }

        const result = await segmentPublisher.publishToSegment(mockEvent as any)

        expect(result).toBe(false)
        expect(mockedLogs.getLogger().error).toHaveBeenCalled()
      })
    })

    describe('and there is a network error', () => {
      beforeEach(() => {
        // Mock fetch to throw an error
        mockedFetch.fetch = jest.fn().mockRejectedValue(new Error('Network error'))
      })

      it('should handle network errors when publishing to Segment', async () => {
        const mockEvent = {
          type: 'test-type',
          subType: 'test-subtype',
          metadata: {
            userAddress: 'test-user'
          }
        }

        const result = await segmentPublisher.publishToSegment(mockEvent as any)

        expect(result).toBe(false)
        expect(mockedLogs.getLogger().error).toHaveBeenCalled()
      })
    })

    it('should use anonymous userId if userAddress is not provided', async () => {
      const mockEvent = {
        type: 'test-type',
        subType: 'test-subtype'
        // No metadata with userAddress
      }

      const result = await segmentPublisher.publishToSegment(mockEvent as any)

      expect(result).toBe(true)
      expect(mockedFetch.fetch).toHaveBeenCalledTimes(1)

      // Verify the body contains "anonymous" as userId
      const callArgs = (mockedFetch.fetch as jest.Mock).mock.calls[0][1]
      const requestBody = JSON.parse(callArgs!.body as string)
      expect(requestBody.userId).toBe('anonymous')
    })
  })
})
