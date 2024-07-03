import SQL from 'sql-template-strings'
import { IPgComponent } from '@well-known-components/pg-component'

export type DbComponents = {
  pg: IPgComponent
}

export type DbComponent = {
  fetchLastUpdateForNotificationType(notificationType: string): Promise<number>
  updateLastUpdateForNotificationType(notificationType: string, timestamp: number): Promise<void>
}

export function createDatabaseComponent({ pg }: Pick<DbComponents, 'pg'>): DbComponent {
  async function fetchLastUpdateForNotificationType(notificationType: string): Promise<number> {
    const result = await pg.query<{ last_successful_run_at: number }>(SQL`
        SELECT *
        FROM cursors
        WHERE id = ${notificationType};
    `)
    if (result.rowCount === 0) {
      return Date.now()
    }

    return result.rows[0].last_successful_run_at
  }

  async function updateLastUpdateForNotificationType(notificationType: string, timestamp: number): Promise<void> {
    const query = SQL`
        INSERT INTO cursors (id, last_successful_run_at, created_at, updated_at)
        VALUES (${notificationType}, ${timestamp}, ${Date.now()}, ${Date.now()})
        ON CONFLICT (id) DO UPDATE
        SET last_successful_run_at = ${timestamp},
            updated_at             = ${Date.now()};
    `

    await pg.query<any>(query)
  }

  return {
    fetchLastUpdateForNotificationType,
    updateLastUpdateForNotificationType
  }
}
