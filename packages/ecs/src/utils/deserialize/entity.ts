import { load } from '@loaders.gl/core';
import { ImageLoader } from '@loaders.gl/images';
import { isNil } from '@antv/util';
import toposort from 'toposort';
import { Entity } from '@lastolivegames/becsy';
import {
  Ellipse,
  FillSolid,
  FillGradient,
  Name,
  Opacity,
  Path,
  Polyline,
  Rect,
  Renderable,
  Stroke,
  Text,
  Transform,
  Visibility,
  DropShadow,
  ZIndex,
  Font,
  AABB,
  TextDecoration,
  FillImage,
  FillPattern,
  MaterialDirty,
  SizeAttenuation,
  StrokeAttenuation,
} from '../../components';
import {
  AttenuationAttributes,
  DropShadowAttributes,
  FillAttributes,
  isDataUrl,
  NameAttributes,
  PathSerializedNode,
  PolylineSerializedNode,
  RectSerializedNode,
  SerializedNode,
  serializePoints,
  shiftPath,
  StrokeAttributes,
  TextSerializedNode,
  VisibilityAttributes,
} from '../serialize';
import { deserializePoints } from './points';
import { EntityCommands, Commands } from '../../commands';
import { isGradient } from '../gradient';
import { isPattern } from '../pattern';
import { computeBidi, measureText } from '../../systems/ComputeTextMetrics';

function inferXYWidthHeight(node: SerializedNode) {
  const { type } = node;
  let bounds: AABB;
  if (type === 'ellipse') {
    bounds = Ellipse.getGeometryBounds(node);
  } else if (type === 'polyline') {
    bounds = Polyline.getGeometryBounds(node);
  } else if (type === 'path') {
    bounds = Path.getGeometryBounds(node);
  } else if (type === 'text') {
    computeBidi(node.content);
    const metrics = measureText(node);
    bounds = Text.getGeometryBounds(node, metrics);
  }

  if (bounds) {
    node.x = bounds.minX;
    node.y = bounds.minY;
    node.width = bounds.maxX - bounds.minX;
    node.height = bounds.maxY - bounds.minY;

    if (type === 'polyline') {
      node.points = serializePoints(
        deserializePoints(node.points).map((point) => {
          return [point[0] - bounds.minX, point[1] - bounds.minY];
        }),
      );
    } else if (type === 'path') {
      node.d = shiftPath(node.d, -bounds.minX, -bounds.minY);
    }
  } else {
    throw new Error('Cannot infer x, y, width or height for node');
  }
}

export function serializedNodesToEntities(
  nodes: SerializedNode[],
  fonts: Entity[],
  commands: Commands,
  idEntityMap?: Map<string, EntityCommands>,
): {
  entities: Entity[];
  idEntityMap: Map<string, EntityCommands>;
} {
  // The old entities are already added to canvas.
  let existedVertices: string[] = [];
  if (idEntityMap) {
    existedVertices = Array.from(idEntityMap.keys());
  }

  const vertices = Array.from(
    new Set([...existedVertices, ...nodes.map((node) => node.id)]),
  );
  const edges = nodes
    .filter((node) => !isNil(node.parentId))
    .map((node) => [node.parentId, node.id] as [string, string]);
  const sorted = toposort.array(vertices, edges);

  if (!idEntityMap) {
    idEntityMap = new Map<string, EntityCommands>();
  }

  const entities: Entity[] = [];
  for (const id of sorted) {
    const node = nodes.find((node) => node.id === id);

    if (!node) {
      continue;
    }

    const { parentId, type } = node;
    const attributes = node;

    const entity = commands.spawn();
    idEntityMap.set(id, entity);

    // Make sure the entity has a width and height
    if (
      isNil(attributes.width) ||
      isNil(attributes.height) ||
      isNil(attributes.x) ||
      isNil(attributes.y)
    ) {
      inferXYWidthHeight(attributes);
    }

    if (isNil(attributes.rotation)) {
      attributes.rotation = 0;
    }
    if (isNil(attributes.scaleX)) {
      attributes.scaleX = 1;
    }
    if (isNil(attributes.scaleY)) {
      attributes.scaleY = 1;
    }

    const { x, y, width, height, rotation, scaleX, scaleY } = attributes;

    entity.insert(
      new Transform({
        translation: {
          x,
          y,
        },
        rotation,
        scale: {
          x: scaleX,
          y: scaleY,
        },
      }),
    );

    if (type !== 'g') {
      entity.insert(new Renderable());
    }

    if (type === 'ellipse') {
      entity.insert(
        new Ellipse({
          cx: width / 2,
          cy: height / 2,
          rx: width / 2,
          ry: height / 2,
        }),
      );
    } else if (type === 'rect') {
      const { cornerRadius } = attributes as RectSerializedNode;
      entity.insert(new Rect({ x: 0, y: 0, width, height, cornerRadius }));
    } else if (type === 'polyline') {
      const { points } = attributes as PolylineSerializedNode;
      entity.insert(new Polyline({ points: deserializePoints(points) }));
    } else if (type === 'path') {
      const { d, fillRule, tessellationMethod } =
        attributes as PathSerializedNode;
      entity.insert(new Path({ d, fillRule, tessellationMethod }));
    } else if (type === 'text') {
      const {
        content,
        fontFamily,
        fontSize,
        fontWeight = 'normal',
        fontStyle = 'normal',
        fontVariant = 'normal',
        letterSpacing = 0,
        lineHeight = 1,
        whiteSpace = 'normal',
        wordWrap = false,
        wordWrapWidth,
        textAlign = 'start',
        textBaseline = 'alphabetic',
        decorationThickness = 0,
        decorationColor = 'black',
        decorationLine = 'none',
        decorationStyle = 'solid',
        // fontBoundingBoxAscent = 0,
        // fontBoundingBoxDescent = 0,
        // hangingBaseline = 0,
        // ideographicBaseline = 0,
      } = attributes as TextSerializedNode;

      let anchorX = 0;
      let anchorY = 0;
      if (textAlign === 'center') {
        anchorX = width / 2;
      } else if (textAlign === 'right' || textAlign === 'end') {
        anchorX = width;
      }

      if (textBaseline === 'middle') {
        anchorY = height / 2;
      } else if (textBaseline === 'alphabetic' || textBaseline === 'hanging') {
        anchorY = height;
      }

      const bitmapFonts = fonts.map((font) => font.read(Font).bitmapFont);
      const bitmapFont = bitmapFonts.find(
        (font) => font.fontFamily === fontFamily,
      );

      entity.insert(
        new Text({
          anchorX,
          anchorY,
          content,
          fontFamily,
          fontSize,
          fontWeight,
          fontStyle,
          fontVariant,
          letterSpacing,
          lineHeight,
          whiteSpace,
          wordWrap,
          wordWrapWidth,
          textAlign,
          textBaseline,
          bitmapFont,
        }),
      );

      if (decorationLine !== 'none' && decorationThickness > 0) {
        entity.insert(
          new TextDecoration({
            color: decorationColor,
            line: decorationLine,
            style: decorationStyle,
            thickness: decorationThickness,
          }),
        );
      }
    }

    const { fill, fillOpacity, opacity } = attributes as FillAttributes;
    if (fill) {
      if (isGradient(fill)) {
        entity.insert(new FillGradient(fill));
      } else if (isDataUrl(fill)) {
        load(fill, ImageLoader).then((image) => {
          entity.insert(new FillImage({ src: image as ImageBitmap }));
          entity.insert(new MaterialDirty());
          commands.execute();
        });
      } else {
        // TODO: fetch url image
        try {
          const parsed = JSON.parse(fill) as FillPattern;
          if (isPattern(parsed)) {
            entity.insert(new FillPattern(parsed));
          }
        } catch (e) {
          entity.insert(new FillSolid(fill));
        }
      }
    }

    const {
      stroke,
      strokeWidth,
      strokeDasharray,
      strokeLinecap,
      strokeLinejoin,
      strokeMiterlimit,
      strokeOpacity,
      strokeDashoffset,
      strokeAlignment,
    } = attributes as StrokeAttributes;
    if (stroke) {
      entity.insert(
        new Stroke({
          color: stroke,
          width: strokeWidth,
          // comma and/or white space separated
          dasharray:
            strokeDasharray === 'none'
              ? [0, 0]
              : ((strokeDasharray?.includes(',')
                  ? strokeDasharray?.split(',')
                  : strokeDasharray?.split(' ')
                )?.map(Number) as [number, number]),
          linecap: strokeLinecap,
          linejoin: strokeLinejoin,
          miterlimit: strokeMiterlimit,
          dashoffset: strokeDashoffset,
          alignment: strokeAlignment,
        }),
      );
    }

    if (opacity || fillOpacity || strokeOpacity) {
      entity.insert(
        new Opacity({
          opacity,
          fillOpacity,
          strokeOpacity,
        }),
      );
    }

    const {
      dropShadowBlurRadius,
      dropShadowColor,
      dropShadowOffsetX,
      dropShadowOffsetY,
    } = attributes as DropShadowAttributes;
    if (dropShadowBlurRadius) {
      entity.insert(
        new DropShadow({
          color: dropShadowColor,
          blurRadius: dropShadowBlurRadius,
          offsetX: dropShadowOffsetX,
          offsetY: dropShadowOffsetY,
        }),
      );
    }

    const { visibility } = attributes as VisibilityAttributes;
    entity.insert(new Visibility(visibility));

    const { name } = attributes as NameAttributes;
    entity.insert(new Name(name));

    const { zIndex } = attributes;
    entity.insert(new ZIndex(zIndex));

    const { sizeAttenuation, strokeAttenuation } =
      attributes as AttenuationAttributes;
    if (sizeAttenuation) {
      entity.insert(new SizeAttenuation());
    }
    if (strokeAttenuation) {
      entity.insert(new StrokeAttenuation());
    }

    if (parentId) {
      idEntityMap.get(parentId)?.appendChild(entity);
    }

    entities.push(entity.id().hold());
  }

  return { entities, idEntityMap };
}
