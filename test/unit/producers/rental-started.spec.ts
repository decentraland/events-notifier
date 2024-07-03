import { createConfigComponent } from '@well-known-components/env-config-provider'
import { rentalStartedProducer } from '../../../src/adapters/producers/rental-started'

describe('rental started producer', () => {
  test('should work when some new rental start found', async () => {
    const config = createConfigComponent({
      MARKETPLACE_BASE_URL: 'https://marketplace-url',
      NETWORK: 'sepolia'
    })
    const rentalsSubGraph = {
      query: jest.fn()
    }
    const landManagerSubGraph = {
      query: jest.fn()
    }
    rentalsSubGraph.query.mockReturnValue({
      rentals: [
        {
          id: '0x42f4ba48791e2de32f5fbf553441c2672864bb33:random-token-id:1',
          contractAddress: '0x42f4ba48791e2de32f5fbf553441c2672864bb33',
          rentalContractAddress: '0xe70db6319e9cee3f604909bdade58d1f5c1cf702',
          lessor: '0x24e5f44999c151f08609f8e27b2238c773c4d020',
          tenant: '0xd5359E309c47c8920C277d078d5F3c3DBeA1ef84',
          operator: '0xd5359E309c47c8920C277d078d5F3c3DBeA1ef84',
          rentalDays: '1',
          startedAt: '1710447420',
          endsAt: '1710533820',
          tokenId: 'random-token-id'
        }
      ]
    })
    landManagerSubGraph.query.mockReturnValue({
      parcels: [
        {
          x: '5',
          y: '48',
          tokenId: 'random-token-id'
        }
      ],
      estates: []
    })

    const producer = await rentalStartedProducer({ config, landManagerSubGraph, rentalsSubGraph })
    let result = await producer.run(Date.now())
    expect(result).toMatchObject({
      notificationType: 'rental_started',
      records: [
        {
          type: 'rental_started',
          address: '0x24e5f44999c151f08609f8e27b2238c773c4d020',
          eventKey: '0x42f4ba48791e2de32f5fbf553441c2672864bb33:random-token-id:1',
          metadata: {
            description: 'Your LAND at 5,48 was rented by 0xd5359E309c47c8920C277d078d5F3c3DBeA1ef84.',
            link: 'https://marketplace-url/contracts/0x42f4ba48791e2de32f5fbf553441c2672864bb33/tokens/random-token-id/manage',
            title: 'LAND Rented',
            contract: '0x42f4ba48791e2de32f5fbf553441c2672864bb33',
            lessor: '0x24e5f44999c151f08609f8e27b2238c773c4d020',
            tenant: '0xd5359E309c47c8920C277d078d5F3c3DBeA1ef84',
            operator: '0xd5359E309c47c8920C277d078d5F3c3DBeA1ef84',
            startedAt: '1710447420',
            endedAt: '1710533820',
            tokenId: 'random-token-id',
            land: '5,48'
          },
          timestamp: 1710447420000
        }
      ],
      lastRun: expect.anything()
    })
  })

  test('should work when no new bids', async () => {
    const config = createConfigComponent({
      MARKETPLACE_BASE_URL: 'https://marketplace-url',
      NETWORK: 'sepolia'
    })
    const rentalsSubGraph = {
      query: jest.fn()
    }
    const landManagerSubGraph = {
      query: jest.fn()
    }
    rentalsSubGraph.query.mockReturnValue({
      rentals: []
    })
    rentalsSubGraph.query.mockReturnValue({
      rentals: []
    })

    const producer = await rentalStartedProducer({ config, landManagerSubGraph, rentalsSubGraph })
    let result = await producer.run(Date.now())
    expect(result).toMatchObject({
      notificationType: 'rental_started',
      records: [],
      lastRun: expect.anything()
    })
  })
})
