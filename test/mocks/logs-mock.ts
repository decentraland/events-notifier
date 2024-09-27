export function createLogsMockComponent() {
    return {
        getLogger: jest.fn().mockReturnValue({
            info: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            log: jest.fn(),
            warn: jest.fn()
        })
    }
}