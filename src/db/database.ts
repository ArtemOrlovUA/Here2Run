import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { addColumns, schemaMigrations, createTable } from '@nozbe/watermelondb/Schema/migrations';
import { Run, RouteCoordinate, CurrentTracking, AppSetting } from './models';
import schema from './schema';

// Migrations for schema changes
const migrations = schemaMigrations({
  migrations: [
    // Migration from version 1 to 2 - add new fields to current_tracking table
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'current_tracking',
          columns: [
            { name: 'total_paused_time', type: 'number', isOptional: true },
            { name: 'pause_start_time', type: 'number', isOptional: true },
            { name: 'current_segment_index', type: 'number', isOptional: true },
            { name: 'current_segment_start_time', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
    // Migration from version 2 to 3 - add app_settings table
    {
      toVersion: 3,
      steps: [
        createTable({
          name: 'app_settings',
          columns: [
            { name: 'key', type: 'string', isIndexed: true },
            { name: 'value', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
    // Migration from version 3 to 4 - add elapsed_time to current_tracking table
    {
      toVersion: 4,
      steps: [
        addColumns({
          table: 'current_tracking',
          columns: [{ name: 'elapsed_time', type: 'number', isOptional: true }],
        }),
      ],
    },
  ],
});

// Create SQLite adapter
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  dbName: 'here2run',
  jsi: true,
  onSetUpError: (error) => {
    console.error('Database setup error:', error);
  },
});

// Create database instance
const database = new Database({
  adapter,
  modelClasses: [Run, RouteCoordinate, CurrentTracking, AppSetting],
});

export default database;
