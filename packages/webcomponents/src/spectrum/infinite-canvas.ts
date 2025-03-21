import { html, css, LitElement, TemplateResult } from 'lit';
import { Task } from '@lit/task';
import { ContextProvider } from '@lit/context';
import { customElement, property } from 'lit/decorators.js';
import {
  Camera,
  Canvas,
  Commands,
  Entity,
  Pen,
  PreStartUp,
  system,
  System,
  ThemeMode,
  Transform,
} from '@infinite-canvas-tutorial/ecs';

import { AppState, Task as TaskEnum, appStateContext } from '../context';
import { Event } from '../event';
import { checkWebGPUSupport } from '../utils';

import '@shoelace-style/shoelace/dist/components/resize-observer/resize-observer.js';

import '@spectrum-web-components/theme/sp-theme.js';
import '@spectrum-web-components/theme/src/themes.js';
import '@spectrum-web-components/alert-banner/sp-alert-banner.js';
import '@spectrum-web-components/progress-circle/sp-progress-circle.js';
import { ZoomLevelSystem } from '../systems';
import { Container } from '../components';

let initCanvasSystemCounter = 0;
const initCanvasSystemClasses = [];

@customElement('ic-spectrum-canvas')
export class InfiniteCanvas extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    sp-top-nav {
      padding: var(--spectrum-global-dimension-size-100);
      display: flex;
      justify-content: end;
      align-items: center;
    }

    ic-spectrum-penbar {
      position: absolute;
      top: 48px;
      left: 0;
    }

    ic-spectrum-taskbar {
      position: absolute;
      top: 48px;
      right: 0;
    }

    ic-spectrum-layers-panel {
      position: absolute;
      top: 48px;
      right: 54px;
    }

    canvas {
      width: 100%;
      height: 100%;
      outline: none;
      padding: 0;
      margin: 0;
      touch-action: none;
    }
  `;

  @property()
  renderer: 'webgl' | 'webgpu' = 'webgl';

  @property({
    attribute: 'shader-compiler-path',
  })
  shaderCompilerPath =
    'https://unpkg.com/@antv/g-device-api@1.6.8/dist/pkg/glsl_wgsl_compiler_bg.wasm';

  @property({ type: Object })
  appState: AppState = {
    theme: {
      mode: ThemeMode.LIGHT,
      colors: {
        [ThemeMode.LIGHT]: {},
        [ThemeMode.DARK]: {},
      },
    },
    camera: {
      zoom: 1,
    },
    penbar: {
      all: [Pen.HAND, Pen.SELECT, Pen.DRAW_RECT],
      selected: [Pen.HAND],
    },
    taskbar: {
      all: [TaskEnum.SHOW_LAYERS_PANEL, TaskEnum.SHOW_PROPERTIES_PANEL],
      selected: [],
    },
  };

  #provider = new ContextProvider(this, { context: appStateContext });

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('sl-resize', this.resize);
  }

  disconnectedCallback() {
    this.removeEventListener('sl-resize', this.resize);
    super.disconnectedCallback();
  }

  private resize(event: CustomEvent) {
    const detail = event.detail as { entries: ResizeObserverEntry[] };
    const { width, height } = detail.entries[0].contentRect;
    const dpr = window.devicePixelRatio;

    if (width && height) {
      const $canvas = this.shadowRoot?.querySelector('canvas');
      $canvas.width = width * dpr;
      $canvas.height = height * dpr;

      this.dispatchEvent(
        new CustomEvent(Event.RESIZED, {
          detail: { width, height },
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  private initCanvas = new Task(this, {
    task: async ([renderer, shaderCompilerPath]) => {
      if (renderer === 'webgpu') {
        await checkWebGPUSupport();
      }

      this.#provider.setValue(this.appState);

      this.addEventListener(Event.ZOOM_CHANGED, (e: CustomEvent) => {
        this.#provider.setValue({
          ...this.#provider.value,
          camera: {
            ...this.#provider.value.camera,
            zoom: e.detail.zoom,
          },
        });
      });

      this.addEventListener(Event.PEN_CHANGED, (e: CustomEvent) => {
        this.#provider.setValue({
          ...this.#provider.value,
          penbar: {
            ...this.#provider.value.penbar,
            selected: e.detail.selected,
          },
        });
      });

      this.addEventListener(Event.TASK_CHANGED, (e: CustomEvent) => {
        this.#provider.setValue({
          ...this.#provider.value,
          taskbar: {
            ...this.#provider.value.taskbar,
            selected: e.detail.selected,
          },
        });
      });

      const $canvas = document.createElement('canvas');
      const {
        camera: { zoom },
      } = this.appState;
      const self = this;

      class InitCanvasSystem extends System {
        private readonly commands = new Commands(this);

        private canvasEntity: Entity;

        constructor() {
          super();
          this.query(
            (q) => q.using(Container, Canvas, Camera, Transform).write,
          );
        }

        initialize(): void {
          const canvas = this.commands
            .spawn(
              new Canvas({
                element: $canvas,
                width: window.innerWidth,
                height: window.innerHeight,
                devicePixelRatio: window.devicePixelRatio,
                renderer,
                shaderCompilerPath,
              }),
            )
            .id();

          canvas.add(Container, { element: self });

          this.canvasEntity = canvas.hold();

          this.commands.spawn(
            new Camera({
              canvas: this.canvasEntity,
            }),
            new Transform({
              scale: {
                x: 1 / zoom,
                y: 1 / zoom,
              },
            }),
          );

          this.commands.execute();

          self.addEventListener(Event.RESIZED, (e) => {
            const { width, height } = e.detail;
            Object.assign(this.canvasEntity.write(Canvas), {
              width,
              height,
            });
          });

          self.addEventListener(Event.PEN_CHANGED, (e) => {
            const { selected } = e.detail;
            Object.assign(this.canvasEntity.write(Canvas), {
              pen: selected[0],
            });
          });
        }
      }

      Object.defineProperty(InitCanvasSystem, 'name', {
        value: `InitCanvasSystem${initCanvasSystemCounter++}`,
      });

      if (initCanvasSystemClasses.length > 0) {
        system((s) =>
          s
            .before(PreStartUp)
            .beforeWritersOf(Canvas)
            .after(...initCanvasSystemClasses),
        )(InitCanvasSystem);
      } else {
        system((s) =>
          s.after(PreStartUp).before(ZoomLevelSystem).beforeWritersOf(Canvas),
        )(InitCanvasSystem);
      }

      initCanvasSystemClasses.push(InitCanvasSystem);

      this.dispatchEvent(new CustomEvent(Event.READY, { detail: $canvas }));
      return $canvas;
    },
    args: () => [this.renderer, this.shaderCompilerPath] as const,
  });

  render() {
    const themeWrapper = (content: string | TemplateResult) =>
      html`<sp-theme
        system="spectrum"
        color="${this.appState.theme.mode}"
        scale="medium"
        >${typeof content === 'string' ? html`${content}` : content}</sp-theme
      >`;

    return this.initCanvas.render({
      pending: () =>
        themeWrapper(
          html`<sp-progress-circle
            label="A small representation of an unclear amount of work"
            indeterminate
            size="s"
          ></sp-progress-circle>`,
        ),
      complete: ($canvas) =>
        themeWrapper(
          html`<ic-spectrum-top-navbar></ic-spectrum-top-navbar>
            <ic-spectrum-penbar></ic-spectrum-penbar>
            <ic-spectrum-taskbar></ic-spectrum-taskbar>
            <ic-spectrum-layers-panel></ic-spectrum-layers-panel>
            <sl-resize-observer @sl-resize=${this.resize}>
              ${$canvas}
            </sl-resize-observer>`,
        ),
      error: (e: Error) => {
        console.error(e);
        return themeWrapper(
          html`<sp-alert-banner open variant="negative">
            Initialize canvas failed<br />
            <strong></strong><br />
            ${e.message}
          </sp-alert-banner>`,
        );
      },
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-spectrum-canvas': InfiniteCanvas;
  }
}
