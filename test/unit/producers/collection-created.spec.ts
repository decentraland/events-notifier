import { collectionCreatedProducer } from "../../../src/adapters/producers/collection-created"

describe('collection created producer', () => {
    it('should work when some new collection is found', async () => {
        const l2CollectionsSubGraph = {
            query: jest.fn().mockReturnValue({
                collections: [
                    {
                        id: 'TheId',
                        creator: '0xTest',
                        name: 'Test collection',
                        updatedAt: '1701379983',
                    }
                ]
            })
        }

        const producer = await collectionCreatedProducer({ l2CollectionsSubGraph })
        let result = await producer.run(Date.now())
        expect(result).toMatchObject({
            event: {
                type: 'blockchain',
                subType: 'collection-created'
            },
            records: [
                {
                    type: 'blockchain',
                    subType: 'collection-created',
                    key: 'TheId',
                    timestamp: 1701379983000,
                    metadata: {
                        creator: '0xTest',
                        name: 'Test collection'
                    }
                }
            ],
            lastRun: expect.anything()
        })
    })

    it('should work when no new collections are found', async () => {
        const l2CollectionsSubGraph = {
          query: jest.fn()
        }
        l2CollectionsSubGraph.query.mockReturnValue({
          collections: []
        })
    
        const producer = await collectionCreatedProducer({ l2CollectionsSubGraph })
        let result = await producer.run(Date.now())
        expect(result).toMatchObject({
          event: {
            type: 'blockchain',
            subType: 'collection-created'
          },
          records: [],
          lastRun: expect.anything()
        })
      })
})