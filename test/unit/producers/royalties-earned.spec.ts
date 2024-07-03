import { createConfigComponent } from '@well-known-components/env-config-provider'
import { royaltiesEarnedProducer } from '../../../src/adapters/producers/royalties-earned'

describe('royalties earned producer', () => {
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
          id: '101',
          type: 'bid',
          buyer: '0x24e5f44999c151f08609f8e27b2238c773c4d020',
          seller: '0xb2a01607d2c1a36027cf7f37cb765ea010ff6300',
          royaltiesCut: '5000000000000000000',
          royaltiesCollector: '0x24e5f44999c151f08609f8e27b2238c773c4d020',
          nft: {
            id: '0xbcf5784c4cfa38ba49253527e80c9e9510e01c67-11',
            category: 'wearable',
            image:
              'https://peer.decentraland.zone/lambdas/collections/contents/urn:decentraland:mumbai:collections-v2:0xbcf5784c4cfa38ba49253527e80c9e9510e01c67:0/thumbnail',
            metadata: {
              id: '0xbcf5784c4cfa38ba49253527e80c9e9510e01c67-0',
              wearable: {
                id: '0xbcf5784c4cfa38ba49253527e80c9e9510e01c67-0',
                name: 'M Hat Mexican 01',
                description: '',
                rarity: 'epic'
              },
              emote: null
            },
            contractAddress: '0xbcf5784c4cfa38ba49253527e80c9e9510e01c67',
            tokenId: '11'
          },
          searchContractAddress: '0xbcf5784c4cfa38ba49253527e80c9e9510e01c67',
          searchCategory: 'wearable',
          price: '200000000000000000000',
          txHash: '0x707a2f0f9a8e5f4083e2a36207cd0e5a3a89ec4f6513202f5d4b2dd993c17571',
          timestamp: '1653065866'
        }
      ]
    })

    const producer = await royaltiesEarnedProducer({ config, l2CollectionsSubGraph })
    let result = await producer.run(Date.now())
    expect(result).toMatchObject({
      notificationType: 'royalties_earned',
      records: [
        {
          type: 'royalties_earned',
          address: '0x24e5f44999c151f08609f8e27b2238c773c4d020',
          eventKey: '0x707a2f0f9a8e5f4083e2a36207cd0e5a3a89ec4f6513202f5d4b2dd993c17571',
          metadata: {
            category: 'wearable',
            description: 'You earned 5.00 MANA for this M Hat Mexican 01.',
            image:
              'https://peer.decentraland.zone/lambdas/collections/contents/urn:decentraland:mumbai:collections-v2:0xbcf5784c4cfa38ba49253527e80c9e9510e01c67:0/thumbnail',
            link: 'https://marketplace-url/contracts/0xbcf5784c4cfa38ba49253527e80c9e9510e01c67/tokens/11',
            network: 'polygon',
            nftName: 'M Hat Mexican 01',
            rarity: 'epic',
            title: 'Royalties Earned'
          },
          timestamp: 1653065866000
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

    const producer = await royaltiesEarnedProducer({ config, l2CollectionsSubGraph })
    let result = await producer.run(Date.now())
    expect(result).toMatchObject({
      notificationType: 'royalties_earned',
      records: [],
      lastRun: expect.anything()
    })
  })
})
