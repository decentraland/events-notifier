import { DatabaseComponent } from "../../src/types";

export function createDbMock(db: Partial<DatabaseComponent> = {}): DatabaseComponent {
  return {
    fetchLastUpdateForEventType: jest.fn(),
    updateLastUpdateForEventType: jest.fn(),
    ...db
  }
}
