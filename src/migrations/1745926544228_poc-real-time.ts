/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate'

export const shorthands: ColumnDefinitions | undefined = undefined

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('walked_parcels', {
    address: { type: 'varchar(255)', notNull: true, primaryKey: true },
    amount_of_parcels_visited: { type: 'integer', notNull: true },
    last_parcel: { type: 'varchar(255)', notNull: true }
  })
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('walked_parcels')
}
