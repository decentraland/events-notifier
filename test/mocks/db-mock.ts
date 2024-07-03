import { DatabaseComponent } from "../../src/types";

export function createDbMock(db: Partial<DatabaseComponent> = {}): DatabaseComponent {
  return {
    fetchLastUpdateForNotificationType: jest.fn(),
    updateLastUpdateForNotificationType: jest.fn(),
    ...db
  }
}
