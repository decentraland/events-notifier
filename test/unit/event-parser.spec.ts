import { createEventParserComponent } from "../../src/adapters/event-parser"
import { createLogsMockComponent } from "../mocks/logs-mock"

describe('event parser should', () => {
    const mockedLogs = createLogsMockComponent()
    const sut = createEventParserComponent({ logs: mockedLogs })

    it('filter out client events that do not have a user address', async () => {
        const event = require('./../data/events/move_to_parcel.json')

        const result = sut.parseExplorerClientEvent(event)

        expect(result).toBeUndefined()
    })
})