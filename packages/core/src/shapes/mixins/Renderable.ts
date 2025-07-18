import * as d3 from 'd3-color';
import { AABB } from '../AABB';
import { GConstructor } from '.';
import {
  Gradient,
  parseGradient,
  isString,
  isGradient,
  Pattern,
} from '../../utils';
import { Texture } from '@antv/g-device-api';

export interface IRenderable {
  /**
   * Whether this object is renderable.
   */
  renderable: boolean;

  /**
   * Whether this object is serializable.
   */
  serializable: boolean;

  /**
   * Whether this object is visible.
   */
  visible: boolean;

  /**
   * Whether this object is cullable.
   */
  cullable: boolean;

  /**
   * Whether this object is batchable.
   */
  batchable: boolean;

  /**
   * Whether this object is selectable.
   */
  selectable: boolean;

  /**
   * Whether this object is culled.
   */
  culled: boolean;

  /**
   * Whether the size of the shape is attenuated by the camera zoom. Default is `true`.
   * @see https://threejs.org/docs/#api/en/materials/SpriteMaterial.sizeAttenuation
   */
  sizeAttenuation: boolean;

  strokeAttenuation: boolean;

  /**
   * The global render order of the object.
   */
  globalRenderOrder: number;

  sortDirtyFlag: boolean;

  /**
   * Avoid unnecessary work like updating Buffer by deferring it until needed.
   * @see https://gameprogrammingpatterns.com/dirty-flag.html
   */
  renderDirtyFlag: boolean;

  /**
   * The bounding box of the render.
   * e.g. Stroke / Shadow included.
   */
  renderBounds: AABB;
  renderBoundsDirtyFlag: boolean;

  /**
   * The bounding box of the geometry.
   * e.g. Stroke excluded.
   */
  geometryBounds: AABB;
  geometryBoundsDirtyFlag: boolean;

  /**
   * Account for its children.
   */
  bounds: AABB;
  boundsDirtyFlag: boolean;

  /**
   * Render geometry as wireframe.
   * @see https://threejs.org/docs/#api/en/materials/MeshStandardMaterial.wireframe
   */
  wireframe: boolean;

  /**
   * It's a presentation attribute that defines the color used to paint the element. Default to `black`.
   * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/fill
   *
   * Enhanced with the following features:
   * * base64 image is also supported.
   * * HTMLImageElement is also supported.
   * * Pattern is also supported.
   */
  fill: string | TexImageSource | { texture: Texture } | Pattern;

  /**
   * It is a presentation attribute defining the color used to paint the outline of the shape. Default to `none`.
   * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke
   */
  stroke: string;

  /**
   * It is a presentation attribute defining the width of the stroke to be applied to the shape. Default value is `1`.
   * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-width
   */
  strokeWidth: number;

  /**
   * This property allows to align a stroke along the outline of the current object.
   * @see https://www.w3.org/TR/svg-strokes/#SpecifyingStrokeAlignment
   *
   * * `center`: This value indicates that the stroke for each subpath is positioned along the outline of the current stroke. The extends of the stroke increase to both sides of the outline accordingly dependent on the `stroke-width`.
   * * `inner`: This value indicates that the stroke area is defined by the outline of each subpath of the current object and the computed value of the `stroke-width` property as offset orthogonal from the outline into the fill area of each subpath. The `stroke-linejoin` property must be ignored.
   * * `outer`: This value indicates that the stroke area is defined by the outline of each subpath of the current object and the computed value of the `stroke-width` property as offset orthogonal from the outline away from the fill area of each subpath.
   */
  strokeAlignment: 'center' | 'inner' | 'outer';

  /**
   * The stroke-linecap attribute is a presentation attribute defining the shape to be used at the end of open subpaths when they are stroked.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-linecap
   */
  strokeLinecap: CanvasLineCap;

  /**
   * The stroke-linejoin attribute is a presentation attribute defining the shape to be used at the corners of paths when they are stroked.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-linejoin
   */
  strokeLinejoin: CanvasLineJoin;

  /**
   * The stroke-miterlimit attribute is a presentation attribute defining a limit on the ratio of the miter length to the stroke-width used to draw a miter join.
   * When the limit is exceeded, the join is converted from a miter to a bevel. Default value is `4`.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-miterlimit
   */
  strokeMiterlimit: number;

  /**
   * The stroke-dasharray attribute is a presentation attribute defining the pattern of dashes and gaps used to paint the outline of the shape;
   * Default value is `none`.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-dasharray
   */
  strokeDasharray: number[];

  /**
   * The stroke-dashoffset attribute is a presentation attribute defining an offset on the rendering of the associated dash array.
   * Default value is `0`.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-dashoffset
   */
  strokeDashoffset: number;

  /**
   * It specifies the transparency of an object or of a group of objects,
   * that is, the degree to which the background behind the element is overlaid.
   * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/opacity
   */
  opacity: number;

  /**
   * It is a presentation attribute defining the opacity of the paint server (color, gradient, pattern, etc.) applied to a shape.
   * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/fill-opacity
   */
  fillOpacity: number;

  /**
   * It is a presentation attribute defining the opacity of the paint server (color, gradient, pattern, etc.) applied to the stroke of a shape.
   * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-opacity
   */
  strokeOpacity: number;

  fillRGB: d3.RGBColor;
  fillGradient: Gradient[];
  useFillImage: boolean;
  strokeRGB: d3.RGBColor;

  /**
   * Specifies color for the shadow.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/filter-function/drop-shadow#color
   */
  dropShadowColor: string;
  dropShadowColorRGB: d3.RGBColor;

  /**
   * Horizontal offset
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/filter-function/drop-shadow
   */
  dropShadowOffsetX: number;

  /**
   * Vertical offset
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/filter-function/drop-shadow
   */
  dropShadowOffsetY: number;

  /**
   * The larger this value, the bigger the blur, so the shadow becomes bigger and lighter.
   * Negative values are not allowed. If not specified, it will be set to `0`.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/filter-function/drop-shadow
   */
  dropShadowBlurRadius: number;

  /**
   * Specifies color for the inner shadow.
   */
  innerShadowColor: string;
  innerShadowColorRGB: d3.RGBColor;

  /**
   * Horizontal offset
   */
  innerShadowOffsetX: number;

  /**
   * Vertical offset
   */
  innerShadowOffsetY: number;

  /**
   * The larger this value, the bigger the blur, so the shadow becomes bigger and lighter.
   * Negative values are not allowed. If not specified, it will be set to `0`.
   */
  innerShadowBlurRadius: number;
}

export function Renderable<TBase extends GConstructor>(Base: TBase) {
  // @ts-ignore
  return class Renderable extends Base implements IRenderable {
    renderable: boolean;
    serializable: boolean;
    cullable: boolean;
    culled: boolean;
    batchable: boolean;
    selectable: boolean;
    sizeAttenuation: boolean;
    renderDirtyFlag = true;
    renderBounds: AABB;
    renderBoundsDirtyFlag = true;
    geometryBounds: AABB;
    geometryBoundsDirtyFlag = true;
    bounds: AABB;
    boundsDirtyFlag = true;
    globalRenderOrder: number;
    sortDirtyFlag = false;

    #visible: boolean;
    #fill: string | TexImageSource | { texture: Texture } | Pattern;
    #fillRGB: d3.RGBColor;
    #fillGradient: Gradient[];
    #useFillImage: boolean;
    #stroke: string;
    #strokeRGB: d3.RGBColor;
    #strokeWidth: number;
    #strokeAlignment: 'center' | 'inner' | 'outer';
    #strokeLinecap: CanvasLineCap;
    #strokeLinejoin: CanvasLineJoin;
    #strokeMiterlimit: number;
    #strokeDasharray: number[];
    #strokeDashoffset: number;
    #opacity: number;
    #fillOpacity: number;
    #strokeOpacity: number;
    #innerShadowColor: string;
    #innerShadowColorRGB: d3.RGBColor;
    #innerShadowOffsetX: number;
    #innerShadowOffsetY: number;
    #innerShadowBlurRadius: number;

    constructor(
      attributes: Partial<
        Pick<
          IRenderable,
          | 'fill'
          | 'stroke'
          | 'strokeOpacity'
          | 'opacity'
          | 'fillOpacity'
          | 'renderable'
          | 'serializable'
          | 'cullable'
          | 'batchable'
          | 'selectable'
          | 'wireframe'
          | 'sizeAttenuation'
          | 'visible'
          | 'strokeWidth'
          | 'strokeAlignment'
          | 'strokeLinecap'
          | 'strokeLinejoin'
          | 'strokeMiterlimit'
          | 'strokeDasharray'
          | 'strokeDashoffset'
          | 'innerShadowColor'
          | 'innerShadowOffsetX'
          | 'innerShadowOffsetY'
          | 'innerShadowBlurRadius'
        >
      > = {},
    ) {
      super(attributes);

      const {
        renderable,
        serializable,
        visible,
        cullable,
        batchable,
        selectable,
        sizeAttenuation,
        wireframe,
        fill,
        stroke,
        strokeWidth,
        strokeAlignment,
        strokeLinecap,
        strokeLinejoin,
        strokeMiterlimit,
        strokeDasharray,
        strokeDashoffset,
        opacity,
        fillOpacity,
        strokeOpacity,
        innerShadowColor,
        innerShadowOffsetX,
        innerShadowOffsetY,
        innerShadowBlurRadius,
      } = attributes;

      this.renderable = renderable ?? true;
      this.serializable = serializable ?? true;
      this.visible = visible ?? true;
      this.cullable = cullable ?? true;
      this.batchable = batchable ?? true;
      this.selectable = selectable ?? true;
      this.sizeAttenuation = sizeAttenuation ?? false;
      this.wireframe = wireframe ?? false;
      this.fill = fill ?? 'black';
      this.stroke = stroke ?? 'none';
      this.strokeWidth = strokeWidth ?? 1;
      this.strokeAlignment = strokeAlignment ?? 'center';
      this.strokeLinecap = strokeLinecap ?? 'butt';
      this.strokeLinejoin = strokeLinejoin ?? 'miter';
      this.strokeMiterlimit = strokeMiterlimit ?? 4;
      this.strokeDasharray = strokeDasharray ?? [];
      this.strokeDashoffset = strokeDashoffset ?? 0;
      this.opacity = opacity ?? 1;
      this.fillOpacity = fillOpacity ?? 1;
      this.strokeOpacity = strokeOpacity ?? 1;
      this.innerShadowColor = innerShadowColor ?? 'black';
      this.innerShadowOffsetX = innerShadowOffsetX ?? 0;
      this.innerShadowOffsetY = innerShadowOffsetY ?? 0;
      this.innerShadowBlurRadius = innerShadowBlurRadius ?? 0;
    }

    get visible() {
      return this.#visible;
    }
    set visible(visible: boolean) {
      if (this.#visible !== visible) {
        this.#visible = visible;
        this.boundsDirtyFlag = true;
        this.renderDirtyFlag = true;
      }
    }

    get fill() {
      return this.#fill;
    }
    set fill(fill: string | TexImageSource | { texture: Texture } | Pattern) {
      if (this.#fill !== fill) {
        let useFillImage = false;
        if (isString(fill)) {
          this.#fillRGB = undefined;
          this.#fillGradient = undefined;

          if (fill === 'none') {
            this.#fillRGB = d3.rgb(255, 255, 255, 0);
          } else if (isGradient(fill)) {
            this.#fillGradient = parseGradient(fill);
            useFillImage = true;
          } else {
            this.#fillRGB = d3.rgb(fill)?.rgb() || d3.rgb(0, 0, 0, 1);
          }
        } else {
          useFillImage = true;
        }

        if (useFillImage || useFillImage !== this.#useFillImage) {
          // Need recompile program since #define USE_FILLIMAGE is changed.
          this.materialDirtyFlag = true;
        }

        this.#fill = fill;
        this.#useFillImage = useFillImage;
        this.renderDirtyFlag = true;
      }
    }

    get fillRGB() {
      return this.#fillRGB;
    }

    get fillGradient() {
      return this.#fillGradient;
    }

    get useFillImage() {
      return this.#useFillImage;
    }

    get stroke() {
      return this.#stroke;
    }
    set stroke(stroke: string) {
      if (this.#stroke !== stroke) {
        this.#stroke = stroke;
        if (stroke === 'none') {
          this.#strokeRGB = d3.rgb(255, 255, 255, 0);
        } else {
          this.#strokeRGB = d3.rgb(stroke)?.rgb() || d3.rgb(0, 0, 0, 1);
        }
        this.renderDirtyFlag = true;
      }
    }

    get strokeRGB() {
      return this.#strokeRGB;
    }

    get strokeWidth() {
      return this.#strokeWidth;
    }
    set strokeWidth(strokeWidth: number) {
      if (this.#strokeWidth !== strokeWidth) {
        this.#strokeWidth = strokeWidth;
        this.renderDirtyFlag = true;
        this.renderBoundsDirtyFlag = true;
      }
    }

    get strokeAlignment() {
      return this.#strokeAlignment;
    }
    set strokeAlignment(strokeAlignment: 'center' | 'inner' | 'outer') {
      if (this.#strokeAlignment !== strokeAlignment) {
        this.#strokeAlignment = strokeAlignment;
        this.renderDirtyFlag = true;
        this.geometryBoundsDirtyFlag = true;
        this.renderBoundsDirtyFlag = true;
      }
    }

    get strokeLinecap() {
      return this.#strokeLinecap;
    }
    set strokeLinecap(strokeLinecap: CanvasLineCap) {
      if (this.#strokeLinecap !== strokeLinecap) {
        this.#strokeLinecap = strokeLinecap;
        this.renderDirtyFlag = true;
        this.renderBoundsDirtyFlag = true;
      }
    }

    get strokeLinejoin() {
      return this.#strokeLinejoin;
    }
    set strokeLinejoin(strokeLinejoin: CanvasLineJoin) {
      if (this.#strokeLinejoin !== strokeLinejoin) {
        this.#strokeLinejoin = strokeLinejoin;
        this.renderDirtyFlag = true;
        this.renderBoundsDirtyFlag = true;
      }
    }

    get strokeMiterlimit() {
      return this.#strokeMiterlimit;
    }
    set strokeMiterlimit(strokeMiterlimit: number) {
      if (this.#strokeMiterlimit !== strokeMiterlimit) {
        this.#strokeMiterlimit = strokeMiterlimit;
        this.renderDirtyFlag = true;
      }
    }

    get strokeDasharray() {
      return this.#strokeDasharray;
    }
    set strokeDasharray(strokeDasharray: number[]) {
      if (
        !this.#strokeDasharray?.length ||
        !this.#strokeDasharray.every(
          (dash, index) => dash === strokeDasharray[index],
        )
      ) {
        this.#strokeDasharray = strokeDasharray;
        this.renderDirtyFlag = true;
      }
    }

    get strokeDashoffset() {
      return this.#strokeDashoffset;
    }
    set strokeDashoffset(strokeDashoffset: number) {
      if (this.#strokeDashoffset !== strokeDashoffset) {
        this.#strokeDashoffset = strokeDashoffset;
        this.renderDirtyFlag = true;
      }
    }

    get opacity() {
      return this.#opacity;
    }
    set opacity(opacity: number) {
      if (this.#opacity !== opacity) {
        this.#opacity = opacity;
        this.renderDirtyFlag = true;
      }
    }

    get fillOpacity() {
      return this.#fillOpacity;
    }
    set fillOpacity(fillOpacity: number) {
      if (this.#fillOpacity !== fillOpacity) {
        this.#fillOpacity = fillOpacity;
        this.renderDirtyFlag = true;
      }
    }

    get strokeOpacity() {
      return this.#strokeOpacity;
    }
    set strokeOpacity(strokeOpacity: number) {
      if (this.#strokeOpacity !== strokeOpacity) {
        this.#strokeOpacity = strokeOpacity;
        this.renderDirtyFlag = true;
      }
    }

    get innerShadowColor() {
      return this.#innerShadowColor;
    }
    set innerShadowColor(innerShadowColor: string) {
      if (this.#innerShadowColor !== innerShadowColor) {
        this.#innerShadowColor = innerShadowColor;
        this.#innerShadowColorRGB =
          d3.rgb(innerShadowColor)?.rgb() || d3.rgb(0, 0, 0, 1);
        this.renderDirtyFlag = true;
      }
    }

    get innerShadowColorRGB() {
      return this.#innerShadowColorRGB;
    }

    get innerShadowOffsetX() {
      return this.#innerShadowOffsetX;
    }
    set innerShadowOffsetX(innerShadowOffsetX: number) {
      if (this.#innerShadowOffsetX !== innerShadowOffsetX) {
        this.#innerShadowOffsetX = innerShadowOffsetX;
        this.renderDirtyFlag = true;
      }
    }

    get innerShadowOffsetY() {
      return this.#innerShadowOffsetY;
    }
    set innerShadowOffsetY(innerShadowOffsetY: number) {
      if (this.#innerShadowOffsetY !== innerShadowOffsetY) {
        this.#innerShadowOffsetY = innerShadowOffsetY;
        this.renderDirtyFlag = true;
      }
    }

    get innerShadowBlurRadius() {
      return this.#innerShadowBlurRadius;
    }
    set innerShadowBlurRadius(innerShadowBlurRadius: number) {
      if (this.#innerShadowBlurRadius !== innerShadowBlurRadius) {
        this.#innerShadowBlurRadius = innerShadowBlurRadius;
        this.renderDirtyFlag = true;
      }
    }
  };
}
