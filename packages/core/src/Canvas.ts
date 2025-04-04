import RBush from 'rbush';
import type { IPointData } from '@pixi/math';
import { Camera } from './Camera';
import {
  type InteractivePointerEvent,
  type PluginContext,
  Renderer,
  CameraControl,
  DOMEventListener,
  Event,
  Picker,
  CheckboardStyle,
  Culling,
  Dragndrop,
  findZoomCeil,
  findZoomFloor,
  Selector,
  Theme,
  SelectorPluginOptions,
  DragndropPluginOptions,
  Painter,
} from './plugins';
import {
  Group,
  IDENTITY_TRANSFORM,
  RBushNodeAABB,
  Shape,
  sortByZIndex,
} from './shapes';
import {
  AsyncParallelHook,
  SyncHook,
  SyncWaterfallHook,
  getGlobalThis,
  traverse,
} from './utils';
import { DataURLOptions } from './ImageExporter';
import { Cursor, CustomEvent } from './events';
import { DOMAdapter } from './environment/adapter';

export enum CanvasMode {
  SELECT = 'select',
  HAND = 'hand',
  DRAW_RECT = 'draw-rect',
}

interface ThemeColors {
  /**
   * Background color of page.
   */
  background: string;
  /**
   * Color of grid.
   */
  grid: string;
  /**
   * Fill color of the selection brush.
   */
  selectionBrushFill: string;
  /**
   * Stroke color of the selection brush.
   */
  selectionBrushStroke: string;
}

export interface CanvasConfig {
  /**
   * The canvas element. Pass in HTMLCanvasElement in the browser environment, OffscreenCanvas in the WebWorker environment,
   * and node-canvas in the Node.js environment.
   */
  canvas: HTMLCanvasElement | OffscreenCanvas;
  /**
   * Set the renderer, optional values are webgl and webgpu, default value is webgl.
   */
  renderer?: 'webgl' | 'webgpu';
  /**
   * Set the WebGPU shader compiler path.
   */
  shaderCompilerPath?: string;
  /**
   * Returns the ratio of the resolution in physical pixels to the resolution
   * in CSS pixels for the current display device.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio
   */
  devicePixelRatio?: number;
  /**
   * Default to `CanvasMode.HAND`.
   */
  mode?: CanvasMode;
  /**
   * Checkboard style.
   */
  checkboardStyle?: CheckboardStyle;
  /**
   * Theme.
   */
  theme?: Theme;
  /**
   * Theme colors.
   * @see https://github.com/dgmjs/dgmjs/blob/main/packages/core/src/colors.ts#L130
   */
  themeColors?: Partial<{
    [Theme.LIGHT]: Partial<ThemeColors>;
    [Theme.DARK]: Partial<ThemeColors>;
  }>;
  plugins?: Partial<{
    selector: Partial<SelectorPluginOptions>;
    dragndrop: Partial<DragndropPluginOptions>;
  }>;
}

export interface AppState {
  mode: CanvasMode;
  zoom: number;
}

export const getDefaultAppState = (): AppState => ({
  mode: CanvasMode.HAND,
  zoom: 1,
});

export class Canvas {
  #instancePromise: Promise<this>;

  #pluginContext: PluginContext;
  get pluginContext() {
    return this.#pluginContext;
  }

  #rendererPlugin: Renderer;
  #eventPlugin: Event;
  #selectorPlugin: Selector;
  #painterPlugin: Painter;

  #root = new Group();
  get root() {
    return this.#root;
  }

  #camera: Camera;
  get camera() {
    return this.#camera;
  }

  #renderDirtyFlag = true;
  #shapesLastFrame = new Set<Shape>();
  #shapesCurrentFrame = new Set<Shape>();

  #mode: CanvasMode;

  constructor(config: CanvasConfig) {
    const {
      canvas,
      renderer = 'webgl',
      shaderCompilerPath = '',
      devicePixelRatio,
      mode = CanvasMode.HAND,
      checkboardStyle = CheckboardStyle.GRID,
      theme = Theme.LIGHT,
      themeColors = {
        [Theme.LIGHT]: {
          background: '#fbfbfb',
          grid: '#dedede',
          selectionBrushFill: '#dedede',
          selectionBrushStroke: '#dedede',
        },
        [Theme.DARK]: {
          background: '#121212',
          grid: '#242424',
          selectionBrushFill: '#242424',
          selectionBrushStroke: '#242424',
        },
      },
      plugins: pluginsOptions,
    } = config;
    const globalThis = getGlobalThis();
    const dpr = (devicePixelRatio ?? globalThis.devicePixelRatio) || 1;
    const supportsPointerEvents = !!globalThis.PointerEvent;
    const supportsTouchEvents = 'ontouchstart' in globalThis;

    const { width, height } = canvas;
    const camera = new Camera(width / dpr, height / dpr);
    camera.onchange = () => {
      this.#pluginContext.hooks.cameraChange.call();
      this.#renderDirtyFlag = true;
    };
    this.#camera = camera;

    this.#pluginContext = {
      globalThis,
      canvas,
      renderer,
      shaderCompilerPath,
      devicePixelRatio: dpr,
      themeColors,
      supportsPointerEvents,
      supportsTouchEvents,
      hooks: {
        init: new SyncHook<[]>(),
        initAsync: new AsyncParallelHook<[]>(),
        beginFrame: new SyncHook<
          [{ all: Shape[]; modified: Shape[]; removed: Shape[] }]
        >(),
        render: new SyncHook<[Shape]>(),
        endFrame: new SyncHook<
          [{ all: Shape[]; modified: Shape[]; removed: Shape[] }]
        >(),
        destroy: new SyncHook<[]>(),
        resize: new SyncHook<[number, number]>(),
        pointerDown: new SyncHook<[InteractivePointerEvent]>(),
        pointerUp: new SyncHook<[InteractivePointerEvent]>(),
        pointerMove: new SyncHook<[InteractivePointerEvent]>(),
        pointerOut: new SyncHook<[InteractivePointerEvent]>(),
        pointerOver: new SyncHook<[InteractivePointerEvent]>(),
        pointerWheel: new SyncHook<[WheelEvent]>(),
        pointerCancel: new SyncHook<[InteractivePointerEvent]>(),
        pickSync: new SyncWaterfallHook(),
        cameraChange: new SyncHook<[]>(),
        modeChange: new SyncHook<[CanvasMode, CanvasMode]>(),
      },
      camera,
      root: this.#root,
      rBushRoot: new RBush<RBushNodeAABB>(),
      api: {
        elementsFromPoint: this.elementsFromPoint.bind(this),
        elementFromPoint: this.elementFromPoint.bind(this),
        elementsFromBBox: this.elementsFromBBox.bind(this),
        client2Viewport: this.client2Viewport.bind(this),
        viewport2Canvas: camera.viewport2Canvas.bind(camera),
        viewport2Client: this.viewport2Client.bind(this),
        canvas2Viewport: camera.canvas2Viewport.bind(camera),
        createCustomEvent: this.createCustomEvent.bind(this),
        getCanvasMode: () => this.#mode,
        getTheme: () => this.theme,
        setCursor: (cursor: Cursor) => {
          DOMAdapter.get().setCursor(this, cursor);
        },
      },
    };

    this.#rendererPlugin = new Renderer();
    this.#eventPlugin = new Event();
    this.#selectorPlugin = new Selector({
      selectionBrushSortMode: 'directional',
      selectionBrushStyle: {
        strokeWidth: 1,
      },
      ...pluginsOptions?.selector,
    });
    this.#painterPlugin = new Painter({});

    this.theme = theme;
    this.checkboardStyle = checkboardStyle;

    const plugins = [
      new DOMEventListener(),
      this.#eventPlugin,
      new Picker(),
      new CameraControl(),
      this.#selectorPlugin,
      this.#painterPlugin,
      new Culling(),
      this.#rendererPlugin,
      new Dragndrop({
        overlap: 'pointer',
        dragstartTimeThreshold: 100,
        dragstartDistanceThreshold: 10,
        ...pluginsOptions?.dragndrop,
      }),
    ];

    this.#instancePromise = (async () => {
      const { hooks } = this.#pluginContext;
      plugins.forEach((plugin) => {
        plugin?.apply(this.#pluginContext);
      });
      hooks.init.call();
      await hooks.initAsync.promise();
      return this;
    })();

    this.mode = mode;
  }

  get initialized() {
    return this.#instancePromise.then(() => this);
  }

  /**
   * Render to the canvas, usually called in a render/animate loop.
   * @example
   * const animate = () => {
      canvas.render();
      requestAnimationFrame(animate);
    };
    animate();
   */
  render() {
    const { hooks } = this.#pluginContext;

    this.#shapesCurrentFrame.clear();
    const modified: Shape[] = [];
    // Dirty check first.
    traverse(this.#root, (shape) => {
      if (shape.sortDirtyFlag) {
        shape.sorted = shape.children.slice().sort(sortByZIndex);
        shape.sortDirtyFlag = false;
      }

      this.#shapesCurrentFrame.add(shape);

      if (shape.transformDirtyFlag) {
        // FIXME: affect children cascade
        shape.boundsDirtyFlag = true;
        shape.renderDirtyFlag = true;
      }

      if (shape.renderDirtyFlag) {
        modified.push(shape);
        this.#renderDirtyFlag = true;
      }

      shape.transform.updateTransform(
        shape.parent ? shape.parent.transform : IDENTITY_TRANSFORM,
      );
    });

    if (this.#renderDirtyFlag) {
      const all = Array.from(this.#shapesCurrentFrame);
      const removed = [...this.#shapesLastFrame].filter(
        (shape) => !this.#shapesCurrentFrame.has(shape),
      );

      hooks.beginFrame.call({ all, modified, removed });
      traverse(this.#root, (child) => {
        if (child.culled || !child.visible) {
          return true;
        }

        if (child.renderable) {
          hooks.render.call(child);
        }
      });
      hooks.endFrame.call({ all, modified, removed });

      [...all, ...removed].forEach((shape) => {
        shape.renderDirtyFlag = false;
      });

      this.#shapesLastFrame = new Set(this.#shapesCurrentFrame);
      this.#renderDirtyFlag = false;
    }
  }

  resize(width: number, height: number) {
    const { hooks } = this.#pluginContext;
    this.#camera.projection(width, height);
    hooks.resize.call(width, height);
  }

  /**
   * Destroy the canvas.
   */
  destroy() {
    const { hooks } = this.#pluginContext;
    hooks.destroy.call();
  }

  getDOM() {
    return this.#pluginContext.canvas;
  }

  getDPR() {
    return this.#pluginContext.devicePixelRatio;
  }

  getDevice() {
    return this.#rendererPlugin.device;
  }

  async toDataURL(options: Partial<DataURLOptions> = {}) {
    const dataURL = await this.#rendererPlugin.toDataURL(options, () => {
      this.#renderDirtyFlag = true;
      this.render();
    });

    if (!options.grid) {
      this.#renderDirtyFlag = true;
      this.render();
    }

    return dataURL;
  }

  appendChild(shape: Shape) {
    this.#renderDirtyFlag = true;
    this.#root.appendChild(shape);
  }

  removeChild(shape: Shape) {
    this.#renderDirtyFlag = true;
    return this.#root.removeChild(shape);
  }

  get checkboardStyle() {
    return this.#rendererPlugin.checkboardStyle;
  }
  set checkboardStyle(style: CheckboardStyle) {
    this.#renderDirtyFlag = true;
    this.#rendererPlugin.checkboardStyle = style;
  }

  get theme() {
    return this.#rendererPlugin.theme;
  }
  set theme(theme: Theme) {
    this.#renderDirtyFlag = true;
    this.#rendererPlugin.theme = theme;
  }

  get mode() {
    return this.#mode;
  }
  set mode(mode: CanvasMode) {
    if (this.#mode !== mode) {
      this.#pluginContext.hooks.modeChange.call(this.#mode, mode);
      this.#mode = mode;
      let cursor: Cursor;
      if (mode === CanvasMode.HAND) {
        cursor = 'grab';
      } else if (mode === CanvasMode.SELECT) {
        cursor = 'default';
      } else if (mode === CanvasMode.DRAW_RECT) {
        cursor = 'crosshair';
      }
      DOMAdapter.get().setCursor(this, cursor);
    }
  }

  selectShape(shape: Shape) {
    this.#selectorPlugin.selectShape(shape);
  }

  deselectShape(shape: Shape) {
    this.#selectorPlugin.deselectShape(shape);
  }

  elementsFromBBox(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
  ): Shape[] {
    const { rBushRoot } = this.#pluginContext;
    const rBushNodes = rBushRoot.search({ minX, minY, maxX, maxY });

    const hitTestList: Shape[] = [];
    rBushNodes.forEach(({ shape }) => {
      const { pointerEvents = 'auto', visible, culled } = shape;

      let visibleCascaded = visible;
      if (visibleCascaded) {
        // Find the first ancestor shape that is invisible.
        let parent = shape.parent;
        while (parent) {
          if (!parent.visible) {
            visibleCascaded = false;
            break;
          }
          parent = parent.parent;
        }
      }

      // account for `visibility`
      // @see https://developer.mozilla.org/en-US/docs/Web/CSS/pointer-events
      const isVisibilityAffected = [
        'auto',
        'visiblepainted',
        'visiblefill',
        'visiblestroke',
        'visible',
      ].includes(pointerEvents);

      if (
        (!isVisibilityAffected || (isVisibilityAffected && visibleCascaded)) &&
        !culled &&
        pointerEvents !== 'none'
      ) {
        hitTestList.push(shape);
      }
    });
    // find group with max z-index
    hitTestList.sort((a, b) => a.globalRenderOrder - b.globalRenderOrder);

    return hitTestList;
  }

  /**
   * Do picking with API instead of triggering interactive events.
   *
   * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Document/elementsFromPoint
   */
  elementsFromPoint(x: number, y: number): Shape[] {
    const { picked } = this.#pluginContext.hooks.pickSync.call({
      topmost: false,
      position: {
        x,
        y,
      },
      picked: [],
    });
    return picked;
  }

  /**
   * Do picking with API instead of triggering interactive events.
   *
   * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Document/elementFromPoint
   */
  elementFromPoint(x: number, y: number): Shape {
    const { picked } = this.#pluginContext.hooks.pickSync.call({
      topmost: true,
      position: {
        x,
        y,
      },
      picked: [],
    });
    return picked[0];
  }

  client2Viewport({ x, y }: IPointData): IPointData {
    const { left, top } = (
      this.#pluginContext.canvas as HTMLCanvasElement
    ).getBoundingClientRect();
    return { x: x - left, y: y - top };
  }

  viewport2Client({ x, y }: IPointData): IPointData {
    const { left, top } = (
      this.#pluginContext.canvas as HTMLCanvasElement
    ).getBoundingClientRect();
    return { x: x + left, y: y + top };
  }

  zoomIn() {
    const { camera } = this;
    camera.cancelLandmarkAnimation();
    const landmark = camera.createLandmark({
      viewportX: camera.width / 2,
      viewportY: camera.height / 2,
      zoom: findZoomCeil(camera.zoom),
    });
    camera.gotoLandmark(landmark, { duration: 300, easing: 'ease' });
  }

  zoomOut() {
    const { camera } = this;
    camera.cancelLandmarkAnimation();
    const landmark = camera.createLandmark({
      viewportX: camera.width / 2,
      viewportY: camera.height / 2,
      zoom: findZoomFloor(camera.zoom),
    });
    camera.gotoLandmark(landmark, { duration: 300, easing: 'ease' });
  }

  createCustomEvent(eventName: string, object?: object) {
    const manager = this.#eventPlugin.rootBoundary;
    return new CustomEvent(manager, eventName, object);
  }
}
