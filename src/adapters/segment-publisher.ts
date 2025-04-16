import { Event } from '@dcl/schemas'
import { AppComponents, ISegmentPublisher } from '../types'

export async function createSegmentPublisherComponent({
  config,
  logs,
  fetch
}: Pick<AppComponents, 'config' | 'logs' | 'fetch'>): Promise<ISegmentPublisher> {
  const segmentWriteKey = await config.requireString('SEGMENT_WRITE_KEY')
  const logger = logs.getLogger('segment-publisher')

  async function publishToSegment(event: Event): Promise<boolean> {
    try {
      const response = await fetch.fetch('https://api.segment.io/v1/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(segmentWriteKey + ':').toString('base64')}`
        },
        body: JSON.stringify({
          userId: (event as any).metadata?.userAddress || 'anonymous',
          event: event.type + '.' + event.subType,
          properties: {
            ...event,
            direct: true
          },
          timestamp: new Date().toISOString()
        })
      })

      if (!response.ok) {
        logger.error('Failed to publish to Segment', {
          status: response.status,
          statusText: response.statusText
        })
        return false
      }

      logger.info('Event published to Segment', { eventType: event.type, eventSubType: event.subType })
      return true
    } catch (error: any) {
      logger.error('Error publishing to Segment', { error: error.message })
      return false
    }
  }

  return { publishToSegment }
}
