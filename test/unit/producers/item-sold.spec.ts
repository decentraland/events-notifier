import { createConfigComponent } from '@well-known-components/env-config-provider'
import { itemSoldProducer } from '../../../src/adapters/producers/item-sold'

describe('item sold producer', () => {
  test('should work when some new bid found', async () => {
    const config = createConfigComponent({
      MARKETPLACE_BASE_URL: 'https://marketplace-url'
    })
    const l2CollectionsSubGraph = {
      query: jest.fn()
    }
    l2CollectionsSubGraph.query.mockReturnValue({
      sales: [
        {
          id: '664',
          type: 'order',
          buyer: '0x24e5f44999c151f08609f8e27b2238c773c4d020',
          seller: '0xb2a01607d2c1a36027cf7f37cb765ea010ff6300',
          nft: {
            id: '0x4e43e8f726c5e81d8aa80db6b180d427e292e6a6-1',
            category: 'wearable',
            image:
              'https://peer.decentraland.zone/lambdas/collections/contents/urn:decentraland:mumbai:collections-v2:0x4e43e8f726c5e81d8aa80db6b180d427e292e6a6:0/thumbnail',
            metadata: {
              id: '0x4e43e8f726c5e81d8aa80db6b180d427e292e6a6-0',
              wearable: {
                id: '0x4e43e8f726c5e81d8aa80db6b180d427e292e6a6-0',
                name: 'Watch',
                description: 'some watch',
                rarity: 'common'
              },
              emote: null
            },
            contractAddress: '0x4e43e8f726c5e81d8aa80db6b180d427e292e6a6',
            tokenId: '1'
          },
          searchContractAddress: '0x4e43e8f726c5e81d8aa80db6b180d427e292e6a6',
          searchCategory: 'wearable',
          price: '12000000000000000000',
          txHash: '0x94c46b04779d7b62938dc055322de356d923b518c00aa13815880c0984f324b1',
          timestamp: '1701717552'
        }
      ]
    })

    const producer = await itemSoldProducer({ config, l2CollectionsSubGraph })
    let result = await producer.run(Date.now())
    expect(result).toMatchObject({
      notificationType: 'item_sold',
      records: [
        {
          type: 'item_sold',
          address: '0xb2a01607d2c1a36027cf7f37cb765ea010ff6300',
          eventKey: '0x94c46b04779d7b62938dc055322de356d923b518c00aa13815880c0984f324b1',
          metadata: {
            category: 'wearable',
            description: 'You just sold this Watch.',
            image:
              'https://peer.decentraland.zone/lambdas/collections/contents/urn:decentraland:mumbai:collections-v2:0x4e43e8f726c5e81d8aa80db6b180d427e292e6a6:0/thumbnail',
            link: 'https://marketplace-url/contracts/0x4e43e8f726c5e81d8aa80db6b180d427e292e6a6/tokens/1',
            network: 'polygon',
            nftName: 'Watch',
            rarity: 'common',
            seller: '0xb2a01607d2c1a36027cf7f37cb765ea010ff6300',
            title: 'Item Sold'
          },
          timestamp: 1701717552000
        }
      ],
      lastRun: expect.anything()
    })
  })

  test('should work when no new bids', async () => {
    const config = createConfigComponent({
      MARKETPLACE_BASE_URL: 'https://marketplace-url'
    })
    const l2CollectionsSubGraph = {
      query: jest.fn()
    }
    l2CollectionsSubGraph.query.mockReturnValue({
      sales: []
    })

    const producer = await itemSoldProducer({ config, l2CollectionsSubGraph })
    let result = await producer.run(Date.now())
    expect(result).toMatchObject({
      notificationType: 'item_sold',
      records: [],
      lastRun: expect.anything()
    })
  })
})
