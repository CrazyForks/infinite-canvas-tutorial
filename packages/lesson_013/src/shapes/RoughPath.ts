import { PathWrapper, PathAttributes } from './Path';
import { generator } from '../utils';
import { IRough, Rough } from './mixins/Rough';
import { Shape } from './Shape';

export interface RoughPathAttributes extends PathAttributes, IRough {}

// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-redeclare
export class RoughPath extends Rough(PathWrapper(Shape)) {
  constructor(attributes: Partial<RoughPathAttributes> = {}) {
    super(attributes);

    // d also regenerates the drawable
    this.onGeometryChanged = () => {
      this.geometryDirtyFlag = true;
    };
  }

  generateDrawable() {
    const { d } = this;

    return generator.path(d, this.roughOptions);
  }
}
