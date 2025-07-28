import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class CurrentTracking extends Model {
  static table = 'current_tracking';

  @field('run_id') runId!: string;
  @field('start_time') startTime!: number;
  @field('is_tracking') isTracking!: boolean;
  @field('is_paused') isPaused!: boolean;
  @field('total_paused_time') totalPausedTime!: number;
  @field('pause_start_time') pauseStartTime!: number;
  @field('current_segment_index') currentSegmentIndex!: number;
  @field('current_segment_start_time') currentSegmentStartTime!: number;
  @field('elapsed_time') elapsedTime!: number;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
