/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder } from 'node-pg-migrate'

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('cursors', {
    id: { type: 'varchar(255)', notNull: true, primaryKey: true },
    last_successful_run_at: { type: 'bigint', notNull: false },
    created_at: { type: 'bigint', notNull: true },
    updated_at: { type: 'bigint', notNull: true }
  })
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('cursors')
}
