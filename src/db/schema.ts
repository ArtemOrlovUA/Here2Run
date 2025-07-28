import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 4, // Increment version for schema migration
  tables: [
    tableSchema({
      name: 'runs',
      columns: [
        { name: 'date', type: 'number' },
        { name: 'distance', type: 'number' },
        { name: 'duration', type: 'number' },
        { name: 'calories', type: 'number' },
        { name: 'name', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'route_coordinates',
      columns: [
        { name: 'run_id', type: 'string', isIndexed: true },
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'accuracy', type: 'number', isOptional: true },
        { name: 'altitude', type: 'number', isOptional: true },
        { name: 'timestamp', type: 'number', isOptional: true },
        { name: 'source', type: 'string', isOptional: true },
        { name: 'order_index', type: 'number' },
        { name: 'segment_index', type: 'number' }, // New field for segment tracking
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'current_tracking',
      columns: [
        { name: 'run_id', type: 'string' },
        { name: 'start_time', type: 'number' },
        { name: 'is_tracking', type: 'boolean' },
        { name: 'is_paused', type: 'boolean' },
        { name: 'total_paused_time', type: 'number', isOptional: true },
        { name: 'pause_start_time', type: 'number', isOptional: true },
        { name: 'current_segment_index', type: 'number', isOptional: true },
        { name: 'current_segment_start_time', type: 'number', isOptional: true },
        { name: 'elapsed_time', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'app_settings',
      columns: [
        { name: 'key', type: 'string', isIndexed: true },
        { name: 'value', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
