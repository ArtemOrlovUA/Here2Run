import { Model } from '@nozbe/watermelondb';
import { field, children, readonly, date } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

export default class Run extends Model {
  static table = 'runs';

  static associations: Associations = {
    route_coordinates: { type: 'has_many', foreignKey: 'run_id' },
  };

  @field('date') date!: number;
  @field('distance') distance!: number;
  @field('duration') duration!: number;
  @field('calories') calories!: number;
  @field('name') name?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('route_coordinates') routeCoordinates: any;
}
