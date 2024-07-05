import SQL from 'sql-template-strings'
import { IPgComponent } from '@well-known-components/pg-component'
import { DatabaseComponent } from '../types'

export type DatabaseComponents = {
  pg: IPgComponent
}

export function createDatabaseComponent({ pg }: Pick<DatabaseComponents, 'pg'>): DatabaseComponent {
  async function fetchLastUpdateForEventType(eventType: string): Promise<number> {
    const result = await pg.query<{ last_successful_run_at: number }>(SQL`
        SELECT *
        FROM cursors
        WHERE id = ${eventType};
    `)
    if (result.rowCount === 0) {
      return Date.now()
    }

    return result.rows[0].last_successful_run_at
  }

  async function updateLastUpdateForEventType(eventType: string, timestamp: number): Promise<void> {
    const query = SQL`
        INSERT INTO cursors (id, last_successful_run_at, created_at, updated_at)
        VALUES (${eventType}, ${timestamp}, ${Date.now()}, ${Date.now()})
        ON CONFLICT (id) DO UPDATE
        SET last_successful_run_at = ${timestamp},
            updated_at             = ${Date.now()};
    `

    await pg.query<any>(query)
  }

  return {
    fetchLastUpdateForEventType,
    updateLastUpdateForEventType
  }
}
