import SQL from 'sql-template-strings'
import { IPgComponent } from '@well-known-components/pg-component'
import { DatabaseComponent } from '../types'
import { EthAddress } from '@dcl/schemas'

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

  async function upsertWalkedParcelsEvent(data: { address: EthAddress }): Promise<number> {
    const lastParcel = '0,0'
    const query = SQL`
      INSERT INTO walked_parcels (address, amount_of_parcels_visited, last_parcel)
      VALUES (${data.address}, 1, ${lastParcel})
      ON CONFLICT (address) DO UPDATE 
      SET amount_of_parcels_visited = walked_parcels.amount_of_parcels_visited + 1,
          last_parcel = ${lastParcel}
      RETURNING amount_of_parcels_visited
    `
    const result = await pg.query(query)
    return result.rows[0].amount_of_parcels_visited
  }

  return {
    fetchLastUpdateForEventType,
    updateLastUpdateForEventType,
    upsertWalkedParcelsEvent
  }
}
