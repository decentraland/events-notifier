import { PublishCommand, SNSClient } from '@aws-sdk/client-sns'
import { AppComponents, IEventPublisher } from '../types'
import { Event } from '@dcl/schemas'

export async function createEventPublisher({ config }: Pick<AppComponents, 'config'>): Promise<IEventPublisher> {
  const snsArn = await config.requireString('AWS_SNS_ARN')
  const optionalEndpoint = await config.getString('AWS_SNS_ENDPOINT')

  const client = new SNSClient({
    endpoint: optionalEndpoint ? optionalEndpoint : undefined
  })

  async function publishMessage(event: Event): Promise<string | undefined> {
    const { MessageId } = await client.send(
      new PublishCommand({
        TopicArn: snsArn,
        Message: JSON.stringify(event)
      })
    )

    return MessageId
  }

  return { publishMessage }
}
