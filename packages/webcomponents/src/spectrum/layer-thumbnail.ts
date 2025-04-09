import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { query } from 'lit/decorators/query.js';
import { when } from 'lit/directives/when.js';
import {
  SerializedNode,
  isGradient,
  isPattern,
  parseGradient,
  deserializePoints,
  TexturePool,
  ComputedBounds,
} from '@infinite-canvas-tutorial/ecs';
import { apiContext } from '../context';
import { API } from '../API';
import { consume } from '@lit/context';

const THUMBNAIL_SIZE = 52;
const THUMBNAIL_PADDING = 8;
@customElement('ic-spectrum-layer-thumbnail')
export class LayerThumbnail extends LitElement {
  static styles = css`
    :host {
    }

    canvas {
      display: block;
      width: ${THUMBNAIL_SIZE}px;
      height: ${THUMBNAIL_SIZE}px;
      box-sizing: border-box;
      overflow: hidden;
    }

    sp-icon-text {
      display: block;
    }
  `;

  @consume({ context: apiContext, subscribe: true })
  api: API;

  @property()
  node: SerializedNode;

  @query('canvas')
  canvas: HTMLCanvasElement;

  @property({ type: Boolean })
  selected = false;

  #texturePool: TexturePool;

  firstUpdated() {
    const { type } = this.node;
    if (type === 'text') {
      return;
    }

    this.#texturePool = new TexturePool(this.canvas.getContext('2d'));

    this.canvas.width = THUMBNAIL_SIZE * window.devicePixelRatio;
    this.canvas.height = THUMBNAIL_SIZE * window.devicePixelRatio;

    const context = this.canvas?.getContext('2d');

    const entity = this.api.getEntity(this.node);
    if (!entity.has(ComputedBounds)) {
      return;
    }

    const { minX, minY, maxX, maxY } = entity.read(ComputedBounds).renderBounds;
    const width = maxX - minX;
    const height = maxY - minY;

    // TODO: Like CSS object-fit: contain and center it according to the size of the canvas
    // context.translate(-minX, -minY);
    // const scale = Math.min(THUMBNAIL_SIZE / width, THUMBNAIL_SIZE / height);
    // context.scale(scale, scale);
    // context.translate(minX, minY);

    this.generatePath(context, this.node);
    this.applyFill(context, this.node);
    this.applyStroke(context, this.node);
  }

  private generatePath(
    context: CanvasRenderingContext2D,
    node: SerializedNode,
  ) {
    const { type } = node;

    context.beginPath();
    if (type === 'circle') {
      const { cx, cy, r } = node;
      context.arc(cx, cy, r, 0, 2 * Math.PI);
    } else if (type === 'ellipse') {
      const { cx, cy, rx, ry } = node;
      context.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
    } else if (type === 'rect') {
      const { x, y, width, height } = node;
      context.rect(x, y, width, height);
    } else if (type === 'polyline') {
      const points = deserializePoints(node.points);
      context.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        context.lineTo(points[i][0], points[i][1]);
      }
    }
    context.closePath();
  }

  private applyFill(context: CanvasRenderingContext2D, node: SerializedNode) {
    if (node.type === 'g' || node.type === 'polyline') {
      return;
    }

    const { fill } = node;

    if (isGradient(fill)) {
      const entity = this.api.getEntity(node);
      const { minX, minY, maxX, maxY } =
        entity.read(ComputedBounds).geometryBounds;

      const gradients = parseGradient(fill);
      this.#texturePool.getOrCreateGradient(
        {
          gradients,
          min: [minX, minY],
          width: maxX - minX,
          height: maxY - minY,
        },
        false,
      );
      context.fill();
    } else if (isPattern(fill)) {
      // TODO: apply pattern
    } else {
      context.fillStyle = fill;

      if (node.type === 'path') {
        const { d, fillRule } = node;
        context.fill(new Path2D(d), fillRule);
      } else {
        context.fill();
      }
    }
  }

  private applyStroke(context: CanvasRenderingContext2D, node: SerializedNode) {
    if (node.type === 'text' || node.type === 'g') {
      return;
    }

    const { stroke, strokeWidth } = node;

    context.strokeStyle = stroke;
    context.lineWidth = strokeWidth;

    if (node.type === 'path') {
      const { d } = node;
      context.stroke(new Path2D(d));
    } else {
      context.stroke();
    }
  }

  render() {
    return html`<sp-thumbnail size="1000" ?focused=${this.selected}>
      ${when(
        this.node.type === 'text',
        () => html`<sp-icon-text></sp-icon-text>`,
        () => html`<canvas></canvas>`,
      )}
    </sp-thumbnail>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-spectrum-layer-thumbnail': LayerThumbnail;
  }
}
