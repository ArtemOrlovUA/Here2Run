import { Model } from '@nozbe/watermelondb';
import { field, relation, readonly, date } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

export default class RouteCoordinate extends Model {
  static table = 'route_coordinates';

  static associations: Associations = {
    run: { type: 'belongs_to', key: 'run_id' },
  };

  @field('run_id') runId!: string;
  @field('latitude') latitude!: number;
  @field('longitude') longitude!: number;
  @field('accuracy') accuracy?: number;
  @field('altitude') altitude?: number;
  @field('timestamp') timestamp?: number;
  @field('source') source?: string;
  @field('order_index') orderIndex!: number;
  @field('segment_index') segmentIndex!: number; // New field for segment tracking
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('runs', 'run_id') run: any;
}
