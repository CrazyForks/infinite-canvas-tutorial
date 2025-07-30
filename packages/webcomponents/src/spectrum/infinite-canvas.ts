import { html, css, LitElement, TemplateResult } from 'lit';
import { Task } from '@lit/task';
import { ContextProvider } from '@lit/context';
import { customElement, property } from 'lit/decorators.js';
import {
  SerializedNode,
  AppState,
  getDefaultAppState,
} from '@infinite-canvas-tutorial/ecs';

import { apiContext, appStateContext, nodesContext } from '../context';
import { checkWebGPUSupport } from '../utils';
import { pendingCanvases } from '../API';

import '@spectrum-web-components/theme/sp-theme.js';
import '@spectrum-web-components/theme/src/themes.js';
import '@spectrum-web-components/accordion/sp-accordion.js';
import '@spectrum-web-components/accordion/sp-accordion-item.js';
import '@spectrum-web-components/action-group/sp-action-group.js';
import '@spectrum-web-components/action-menu/sp-action-menu.js';
import '@spectrum-web-components/alert-banner/sp-alert-banner.js';
import '@spectrum-web-components/color-slider/sp-color-slider.js';
import '@spectrum-web-components/color-area/sp-color-area.js';
import '@spectrum-web-components/color-field/sp-color-field.js';
import '@spectrum-web-components/color-wheel/sp-color-wheel.js';
import '@spectrum-web-components/menu/sp-menu-item.js';
import '@spectrum-web-components/menu/sp-menu-divider.js';
import '@spectrum-web-components/menu/sp-menu-group.js';
import '@spectrum-web-components/number-field/sp-number-field.js';
import '@spectrum-web-components/slider/sp-slider.js';
import '@spectrum-web-components/swatch/sp-swatch.js';
import '@spectrum-web-components/overlay/sp-overlay.js';
import '@spectrum-web-components/progress-circle/sp-progress-circle.js';
import '@spectrum-web-components/textfield/sp-textfield.js';
import '@spectrum-web-components/thumbnail/sp-thumbnail.js';
import '@spectrum-web-components/tooltip/sp-tooltip.js';
import '@spectrum-web-components/picker/sp-picker.js';
import '@spectrum-web-components/overlay/overlay-trigger.js';

import '@spectrum-web-components/icons-workflow/icons/sp-icon-add.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-delete.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-remove.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-text.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-visibility.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-visibility-off.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-properties.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-close.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-chevron-down.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-layers.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-properties.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-show-menu.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-stroke-width.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-hand.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-select.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-settings.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-shapes.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-undo.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-redo.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-lock-closed.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-lock-open.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-text-bold.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-text-italic.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-text-underline.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-text-align-left.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-text-align-center.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-text-align-right.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-layers-backward.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-layers-forward.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-layers-bring-to-front.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-layers-send-to-back.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-show-all-layers.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-copy.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-cut.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-paste.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-rectangle.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-ellipse.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-line.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-annotate-pen.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-brush.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-rect-select.js';

export const TOP_NAVBAR_HEIGHT = 48;

@customElement('ic-spectrum-canvas')
export class InfiniteCanvas extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: relative;

      --mod-popover-content-area-spacing-vertical: 0;
      --spectrum-popover-content-area-spacing-vertical: 0;
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

  @property({ type: Object, attribute: 'app-state' })
  appState: AppState;

  @property({ type: Array })
  nodes: SerializedNode[] = [];

  appStateProvider = new ContextProvider(this, { context: appStateContext });
  nodesProvider = new ContextProvider(this, { context: nodesContext });
  apiProvider = new ContextProvider(this, { context: apiContext });

  private resizeObserver: ResizeObserver;

  connectedCallback() {
    super.connectedCallback();

    this.resizeObserver = new ResizeObserver((entries) =>
      this.handleResize(entries),
    );
    this.updateComplete.then(() => this.resizeObserver.observe(this));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObserver?.unobserve(this);

    this.apiProvider.value?.destroy();
  }

  private handleResize(entries: ResizeObserverEntry[]) {
    const { topbarVisible } = this.appStateProvider.value;
    const { width, height } = entries[0].contentRect;
    const dpr = window.devicePixelRatio;

    if (width && height) {
      const $canvas = this.shadowRoot?.querySelector('canvas');
      $canvas.width = width * dpr;
      $canvas.height = (height - (topbarVisible ? TOP_NAVBAR_HEIGHT : 0)) * dpr;

      this.apiProvider.value?.resizeCanvas(
        $canvas.width / dpr,
        $canvas.height / dpr,
      );
    }
  }

  private initCanvas = new Task(this, {
    task: async ([renderer, shaderCompilerPath]) => {
      if (renderer === 'webgpu') {
        await checkWebGPUSupport();
      }

      this.appStateProvider.value = {
        ...getDefaultAppState(),
        ...this.appState,
      };
      this.nodesProvider.value = this.nodes;

      const { topbarVisible, cameraZoom } = this.appStateProvider.value;

      const $canvas = document.createElement('canvas');
      $canvas.style.width = '100%';
      $canvas.style.height = topbarVisible
        ? `calc(100% - ${TOP_NAVBAR_HEIGHT}px)`
        : '100%';
      $canvas.tabIndex = 0; // Make canvas focusable

      const { width, height } = this.getBoundingClientRect();

      pendingCanvases.push({
        container: this,
        canvas: {
          element: $canvas,
          width,
          height: topbarVisible ? height - TOP_NAVBAR_HEIGHT : height,
          devicePixelRatio: window.devicePixelRatio,
          renderer,
          shaderCompilerPath,
        },
        camera: {
          zoom: cameraZoom,
        },
      });

      return $canvas;
    },
    args: () => [this.renderer, this.shaderCompilerPath] as const,
  });

  render() {
    const { theme } = this.appStateProvider.value;

    const themeWrapper = (content: string | TemplateResult) =>
      html`<sp-theme system="spectrum" color="${theme.mode}" scale="medium"
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
            <ic-spectrum-context-bar></ic-spectrum-context-bar>
            <ic-spectrum-context-menu></ic-spectrum-context-menu>
            <ic-spectrum-text-editor></ic-spectrum-text-editor>
            ${$canvas}`,
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
