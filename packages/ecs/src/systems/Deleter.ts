import { System } from '@lastolivegames/becsy';
import { ToBeDeleted } from '../components';
import { ViewportCulling } from './ViewportCulling';
/**
 * Deletes entities with the {@link ToBeDeleted} component.
 * @see https://lastolivegames.github.io/becsy/guide/architecture/entities#deleting-entities
 */
export class Deleter extends System {
  // Note the usingAll.write below, which grants write entitlements on all component types.
  entities = this.query((q) => q.current.with(ToBeDeleted).usingAll.write);

  viewportCulling = this.attach(ViewportCulling);

  execute() {
    for (const entity of this.entities.current) {
      this.viewportCulling.remove(entity);

      entity.delete();
    }
  }
}
