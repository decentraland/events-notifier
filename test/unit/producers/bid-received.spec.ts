import { createConfigComponent } from '@well-known-components/env-config-provider'
import { bidReceivedProducer } from '../../../src/adapters/producers/bid-received'

describe('bid received producer', () => {
  test('should work when some new bid found', async () => {
    const config = createConfigComponent({
      MARKETPLACE_BASE_URL: 'https://marketplace-url'
    })
    const l2CollectionsSubGraph = {
      query: jest.fn()
    }
    l2CollectionsSubGraph.query.mockReturnValue({
      bids: [
        {
          id: '0x5d670bab052f21c3b1984231b1187be34852db24-105312291668557186697918027683670432318895095400549111254310977537-0x24e5f44999c151f08609f8e27b2238c773c4d020',
          seller: '0xb2a01607d2c1a36027cf7f37cb765ea010ff6300',
          bidder: '0x24e5f44999c151f08609f8e27b2238c773c4d020',
          status: 'sold',
          nft: {
            id: '0x5d670bab052f21c3b1984231b1187be34852db24-105312291668557186697918027683670432318895095400549111254310977537',
            category: 'wearable',
            image:
              'https://peer.decentraland.zone/lambdas/collections/contents/urn:decentraland:mumbai:collections-v2:0x5d670bab052f21c3b1984231b1187be34852db24:1/thumbnail',
            metadata: {
              id: '0x5d670bab052f21c3b1984231b1187be34852db24-1',
              wearable: {
                id: '0x5d670bab052f21c3b1984231b1187be34852db24-1',
                name: 'Smart Wearable Example II',
                description: 'Put the glasses to see a new world',
                rarity: 'mythic'
              },
              emote: null
            },
            contractAddress: '0x5d670bab052f21c3b1984231b1187be34852db24',
            tokenId: '105312291668557186697918027683670432318895095400549111254310977537'
          },
          createdAt: '1701367617',
          updatedAt: '1701379983',
          blockchainId: '0x840df86c97afbeca305f1aa4009496abb48f2a58bf037ee6aaae2d6bd64511dc',
          price: '20000000000000000000'
        }
      ]
    })

    const producer = await bidReceivedProducer({ config, l2CollectionsSubGraph })
    let result = await producer.run(Date.now())
    expect(result).toMatchObject({
      event: {
        type: 'marketplace',
        subType: 'bid-received'
      },
      records: [
        {
          type: 'marketplace',
          subType: 'bid-received',
          key: '0x840df86c97afbeca305f1aa4009496abb48f2a58bf037ee6aaae2d6bd64511dc',
          timestamp: 1701367617000,
          metadata: {
            address: '0xb2a01607d2c1a36027cf7f37cb765ea010ff6300',
            image: 'https://peer.decentraland.zone/lambdas/collections/contents/urn:decentraland:mumbai:collections-v2:0x5d670bab052f21c3b1984231b1187be34852db24:1/thumbnail',
            seller: '0xb2a01607d2c1a36027cf7f37cb765ea010ff6300',
            category: 'wearable',
            rarity: 'mythic',
            link: 'https://marketplace-url/account?assetType=nft&section=bids',
            nftName: 'Smart Wearable Example II',
            price: '20000000000000000000',
            title: 'Bid Received',
            description: 'You received a bid of 20.00 MANA for this Smart Wearable Example II.',
            network: 'polygon'
          }
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
      bids: []
    })

    const producer = await bidReceivedProducer({ config, l2CollectionsSubGraph })
    let result = await producer.run(Date.now())
    expect(result).toMatchObject({
      event: {
        type: 'marketplace',
        subType: 'bid-received'
      },
      records: [],
      lastRun: expect.anything()
    })
  })
})
