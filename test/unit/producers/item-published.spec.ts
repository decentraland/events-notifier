import { createConfigComponent } from '@well-known-components/env-config-provider'
import { itemPublishedProducer } from '../../../src/adapters/producers/item-published'

describe('item published producer', () => {
  test('should work when some new published item is found', async () => {
    const l2CollectionsSubGraph = {
      query: jest.fn()
    }
    l2CollectionsSubGraph.query.mockReturnValue({
      items: [
        {
          id: '0x6105f0f5ef8b28cf81e64551588d13221d4151ad-3',
          collection: {
            id: '0x6105f0f5ef8b28cf81e64551588d13221d4151ad'
          },
          blockchainId: '3',
          creator: '0x943d99cefa84b247b679d2b7cce17c7c93e6587b',
          itemType: 'wearable_v2',
          rarity: 'mythic',
          urn: 'urn:decentraland:matic:collections-v2:0x6105f0f5ef8b28cf81e64551588d13221d4151ad:3',
          createdAt: '1623259167',
          updatedAt: '1623355278',
          metadata: {
            wearable: {
              name: 'MetaZoo Intl. BlackCat Hood'
            },
            emote: null
          }
        }
      ]
    })

    const producer = await itemPublishedProducer({ l2CollectionsSubGraph })
    let result = await producer.run(Date.now())
    expect(result).toMatchObject({
      event: {
        type: 'blockchain',
        subType: 'item-published'
      },
      records: [
        {
          type: 'blockchain',
          subType: 'item-published',
          key: '0x6105f0f5ef8b28cf81e64551588d13221d4151ad-3',
          timestamp: 1623259167000,
          metadata: {
            creator: '0x943d99cefa84b247b679d2b7cce17c7c93e6587b',
            category: 'wearable',
            rarity: 'mythic',
            network: 'polygon',
            itemId: '0x6105f0f5ef8b28cf81e64551588d13221d4151ad-3',
            urn: 'urn:decentraland:matic:collections-v2:0x6105f0f5ef8b28cf81e64551588d13221d4151ad:3'
          }
        }
      ],
      lastRun: expect.anything()
    })
  })

  test('should work when no new published items', async () => {
    const l2CollectionsSubGraph = {
      query: jest.fn()
    }
    l2CollectionsSubGraph.query.mockReturnValue({
      items: []
    })

    const producer = await itemPublishedProducer({ l2CollectionsSubGraph })
    let result = await producer.run(Date.now())
    expect(result).toMatchObject({
      event: {
        type: 'blockchain',
        subType: 'item-published'
      },
      records: [],
      lastRun: expect.anything()
    })
  })
})
