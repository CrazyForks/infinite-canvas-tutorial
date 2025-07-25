import {
  DropShadow,
  Ellipse,
  InnerShadow,
  Opacity,
  Path,
  Rect,
  Stroke,
  Text,
  TextDecoration,
  Visibility,
} from '../../components';

// @see https://dev.to/themuneebh/typescript-branded-types-in-depth-overview-and-use-cases-60e
export type FractionalIndex = string & { _brand: 'franctionalIndex' };
export type Ordered<TElement extends SerializedNode> = TElement & {
  index: FractionalIndex;
};
export type OrderedSerializedNode = Ordered<SerializedNode>;

/**
 * Refer SVG attributes
 * @see https://github.com/tldraw/tldraw/blob/main/packages/tlschema/src/shapes/TLBaseShape.ts
 * @see https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/excalidraw-element-skeleton
 */
export interface BaseSerializeNode<Type extends string>
  extends Partial<TransformAttributes>,
    Partial<VisibilityAttributes>,
    Partial<NameAttributes> {
  /**
   * Unique identifier
   */
  id: string;

  /**
   * Parent unique identifier
   */
  parentId?: string;

  /**
   * Shape type
   */
  type?: Type;

  /**
   * Z index
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/z-index
   */
  zIndex?: number;

  fractionalIndex?: string;

  /**
   * @see https://github.com/excalidraw/excalidraw/issues/1639
   */
  version?: number;
  versionNonce?: number;
  isDeleted?: boolean;

  updated?: number;
}

export interface NameAttributes {
  name: string;
}

/**
 * Friendly to transformer.
 */
export interface TransformAttributes {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface VisibilityAttributes {
  visibility: Visibility['value'];
}

export interface FillAttributes {
  /**
   * Solid color, gradient, stringified pattern, image data-uri, etc.
   */
  fill: string;
  fillOpacity: Opacity['fillOpacity'];
  opacity: Opacity['opacity'];
}

export interface StrokeAttributes {
  stroke: Stroke['color'];
  strokeWidth: Stroke['width'];
  strokeAlignment: Stroke['alignment'];
  strokeLinecap: Stroke['linecap'];
  strokeLinejoin: Stroke['linejoin'];
  strokeMiterlimit: Stroke['miterlimit'];
  strokeDasharray: string;
  strokeDashoffset: Stroke['dashoffset'];
  strokeOpacity: Opacity['strokeOpacity'];
}

export interface InnerShadowAttributes {
  innerShadowColor: InnerShadow['color'];
  innerShadowOffsetX: InnerShadow['offsetX'];
  innerShadowOffsetY: InnerShadow['offsetY'];
  innerShadowBlurRadius: InnerShadow['blurRadius'];
}

export interface DropShadowAttributes {
  dropShadowColor: DropShadow['color'];
  dropShadowOffsetX: DropShadow['offsetX'];
  dropShadowOffsetY: DropShadow['offsetY'];
  dropShadowBlurRadius: DropShadow['blurRadius'];
}

export interface AttenuationAttributes {
  strokeAttenuation: boolean;
  sizeAttenuation: boolean;
}

export interface TextDecorationAttributes {
  decorationColor: TextDecoration['color'];
  decorationLine: TextDecoration['line'];
  decorationStyle: TextDecoration['style'];
  decorationThickness: TextDecoration['thickness'];
}

export interface GSerializedNode extends BaseSerializeNode<'g'> {}

export interface EllipseSerializedNode
  extends BaseSerializeNode<'ellipse'>,
    Partial<Pick<Ellipse, 'rx' | 'ry' | 'cx' | 'cy'>>,
    Partial<FillAttributes>,
    Partial<StrokeAttributes>,
    Partial<AttenuationAttributes> {}

export interface RectSerializedNode
  extends BaseSerializeNode<'rect'>,
    Partial<Pick<Rect, 'width' | 'height' | 'cornerRadius'>>,
    Partial<FillAttributes>,
    Partial<StrokeAttributes>,
    Partial<InnerShadowAttributes>,
    Partial<DropShadowAttributes>,
    Partial<AttenuationAttributes> {}

interface PolylineAttributes {
  points: string;
}
export interface PolylineSerializedNode
  extends BaseSerializeNode<'polyline'>,
    Partial<PolylineAttributes>,
    Partial<StrokeAttributes>,
    Partial<Pick<AttenuationAttributes, 'strokeAttenuation'>> {}

export interface PathSerializedNode
  extends BaseSerializeNode<'path'>,
    Partial<Pick<Path, 'd' | 'fillRule' | 'tessellationMethod'>>,
    Partial<FillAttributes>,
    Partial<StrokeAttributes>,
    Partial<AttenuationAttributes> {}

export interface TextSerializedNode
  extends BaseSerializeNode<'text'>,
    Partial<
      Pick<
        Text,
        | 'anchorX'
        | 'anchorY'
        | 'content'
        | 'fontFamily'
        | 'fontSize'
        | 'fontWeight'
        | 'fontStyle'
        | 'fontVariant'
        | 'letterSpacing'
        | 'lineHeight'
        | 'whiteSpace'
        | 'wordWrap'
        | 'wordWrapWidth'
        | 'textOverflow'
        | 'maxLines'
        | 'textAlign'
        | 'textBaseline'
        | 'leading'
        | 'bitmapFont'
        | 'bitmapFontKerning'
        | 'physical'
        | 'esdt'
      >
    >,
    Partial<{
      fontBoundingBoxAscent: number;
      fontBoundingBoxDescent: number;
      hangingBaseline: number;
      ideographicBaseline: number;
    }>,
    Partial<FillAttributes>,
    Partial<StrokeAttributes>,
    Partial<DropShadowAttributes>,
    Partial<TextDecorationAttributes>,
    Partial<AttenuationAttributes> {}

export type SerializedNode =
  | GSerializedNode
  | EllipseSerializedNode
  | RectSerializedNode
  | PolylineSerializedNode
  | PathSerializedNode
  | TextSerializedNode;
