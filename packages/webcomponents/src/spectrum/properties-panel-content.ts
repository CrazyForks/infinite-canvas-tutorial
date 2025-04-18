import { html, css, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import {
  SerializedNode,
  TextSerializedNode,
} from '@infinite-canvas-tutorial/ecs';
import { when } from 'lit/directives/when.js';
import { apiContext, appStateContext, AppState } from '../context';
import { API } from '../API';
import { ColorType } from './color-picker';

@customElement('ic-spectrum-properties-panel-content')
export class PropertiesPanelContent extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      padding: 0;
      overflow: hidden;

      --system-accordion-size-s-item-header-font-size: 14px;
      --mod-accordion-item-header-font-size: 14px;
    }

    sp-popover {
      padding: 0;
    }

    sp-accordion {
      overflow-y: overlay;
      overflow: hidden auto;
      max-height: 400px;
    }

    .content {
      display: flex;
      flex-direction: column;
      gap: 8px;
      position: relative;
    }

    .style-group {
      .line {
        sp-field-label {
          width: 100px;
        }
      }
    }

    .line {
      display: flex;
      align-items: center;
      justify-content: space-between;

      sp-field-label {
        width: 30px;
      }

      sp-number-field {
        width: 80px;
      }

      > div {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
    }

    ic-spectrum-fill-icon {
      width: 30px;
      height: 30px;
    }

    ic-spectrum-stroke-icon {
      width: 30px;
      height: 30px;
    }

    sp-slider {
      flex: 1;
      margin-right: 8px;
    }

    .stroke-width-field {
      position: relative;
      top: 10px;
    }

    .lock {
      width: 20px;
      height: 20px;

      svg {
        height: 100%;
        width: 100%;
        vertical-align: top;
        color: inherit;
      }
    }

    .lock-button {
      position: absolute;
      left: 128px;
      top: 22px;
    }
  `;

  @consume({ context: appStateContext, subscribe: true })
  appState: AppState;

  @consume({ context: apiContext, subscribe: true })
  api: API;

  @property()
  node: SerializedNode;

  @state()
  width: number;

  private handleWidthChanged(e: Event & { target: HTMLInputElement }) {
    const newWidth = parseInt(e.target.value);
    if (this.node.type === 'rect') {
      if (this.node.lockAspectRatio) {
        const { width, height } = this.node;
        const aspectRatio = width / height;
        const newHeight = newWidth / aspectRatio;
        this.api.updateNode(this.node, { width: newWidth, height: newHeight });
        this.api.record();
      } else {
        this.api.updateNode(this.node, {
          width: newWidth,
        });
        this.api.record();
      }
    } else if (this.node.type === 'circle') {
      this.api.updateNode(this.node, {
        r: newWidth / 2,
      });
      this.api.record();
    } else if (this.node.type === 'ellipse') {
      if (this.node.lockAspectRatio) {
        const { rx, ry } = this.node;
        const aspectRatio = rx / ry;
        const newHeight = newWidth / aspectRatio;
        this.api.updateNode(this.node, { rx: newWidth / 2, ry: newHeight / 2 });
        this.api.record();
      } else {
        this.api.updateNode(this.node, {
          rx: newWidth / 2,
        });
        this.api.record();
      }
    }
    // TODO: Polyline, Path, Text
  }

  private handleHeightChanged(e: Event & { target: HTMLInputElement }) {
    const newHeight = parseInt(e.target.value);
    if (this.node.type === 'rect') {
      if (this.node.lockAspectRatio) {
        const { width, height } = this.node;
        const aspectRatio = width / height;
        const newWidth = newHeight * aspectRatio;
        this.api.updateNode(this.node, { width: newWidth, height: newHeight });
        this.api.record();
      } else {
        this.api.updateNode(this.node, {
          height: newHeight,
        });
        this.api.record();
      }
    } else if (this.node.type === 'circle') {
      this.api.updateNode(this.node, {
        r: newHeight / 2,
      });
      this.api.record();
    } else if (this.node.type === 'ellipse') {
      this.api.updateNode(this.node, {
        ry: newHeight / 2,
      });
      this.api.record();
    }
    // TODO: Polyline, Path, Text
  }

  private handleXChanged(e: Event & { target: HTMLInputElement }) {
    const x = parseInt(e.target.value);
    if (this.node.type === 'rect') {
      this.api.updateNode(this.node, { x });
      this.api.record();
    } else if (this.node.type === 'circle') {
      this.api.updateNode(this.node, { cx: x + this.node.r });
      this.api.record();
    } else if (this.node.type === 'ellipse') {
      this.api.updateNode(this.node, { cx: x + this.node.rx });
      this.api.record();
    }
    // TODO: Polyline, Path, Text
  }

  private handleYChanged(e: Event & { target: HTMLInputElement }) {
    const y = parseInt(e.target.value);
    if (this.node.type === 'rect') {
      this.api.updateNode(this.node, { y });
      this.api.record();
    } else if (this.node.type === 'circle') {
      this.api.updateNode(this.node, { cy: y + this.node.r });
      this.api.record();
    } else if (this.node.type === 'ellipse') {
      this.api.updateNode(this.node, { cy: y + this.node.ry });
      this.api.record();
    }
    // TODO: Polyline, Path, Text
  }

  private handleLockAspectRatioChanged() {
    this.api.updateNode(this.node, {
      lockAspectRatio: !this.node.lockAspectRatio,
    });
    this.api.record();
  }

  private handleFontSizeChanged(e: Event & { target: HTMLInputElement }) {
    const fontSize = parseFloat(e.target.value);
    this.api.updateNode(this.node, {
      fontSize,
    });
    this.api.record();
  }

  private handleStrokeWidthChanging(e: Event & { target: HTMLInputElement }) {
    const nextElementSibling = e.target.nextElementSibling as HTMLInputElement;
    if (nextElementSibling) {
      nextElementSibling.value = e.target.value;
    }
  }

  private handleStrokeWidthChanged(e: Event & { target: HTMLInputElement }) {
    const strokeWidth = parseInt(e.target.value);
    this.api.updateNode(this.node, {
      strokeWidth,
    });
    this.api.record();
  }

  private handleStrokeAlignmentChanged(e: Event) {
    const strokeAlignment = (e.target as any).selected[0];
    this.api.updateNode(this.node, {
      strokeAlignment,
    });
    this.api.record();
  }

  private handleStrokeLinecapChanged(e: Event & { target: HTMLInputElement }) {
    const strokeLinecap = (e.target as any).selected[0] as CanvasLineCap;
    this.api.updateNode(this.node, { strokeLinecap });
    this.api.record();
  }

  private handleStrokeLinejoinChanged(e: Event & { target: HTMLInputElement }) {
    const strokeLinejoin = (e.target as any).selected[0] as CanvasLineJoin;
    this.api.updateNode(this.node, { strokeLinejoin });
    this.api.record();
  }

  private handleFillChanged(e: CustomEvent) {
    const { type, value } = e.detail;
    this.api.updateNode(this.node, {
      fill:
        type === 'solid'
          ? value.startsWith('#')
            ? value
            : `#${value}`
          : value,
    });
    this.api.record();
  }

  private handleStrokeChanged(e: CustomEvent) {
    const { type, value } = e.detail;
    this.api.updateNode(this.node, {
      stroke:
        type === 'solid'
          ? value.startsWith('#')
            ? value
            : `#${value}`
          : value,
    });
    this.api.record();
  }

  private transformTemplate() {
    const { type } = this.node;
    const { lockAspectRatio } = this.node as TextSerializedNode;

    let width = 0;
    let height = 0;
    let x = 0;
    let y = 0;
    let angle = 0;

    if (type === 'circle') {
      const { r, cx, cy } = this.node;
      width = r * 2;
      height = r * 2;
      x = cx - r;
      y = cy - r;
      angle = 0;
    } else if (type === 'ellipse') {
      const { rx, ry, cx, cy } = this.node;
      width = rx * 2;
      height = ry * 2;
      x = cx - rx;
      y = cy - ry;
      angle = 0;
    } else if (type === 'rect') {
      const { width: w, height: h, x: xx, y: yy } = this.node;
      width = w;
      height = h;
      x = xx;
      y = yy;
      angle = 0;
    }

    return html`<sp-accordion-item label="Transform" open>
      <div class="content">
        <div class="line">
          <div>
            <sp-field-label for="w" side-aligned="start">W</sp-field-label>
            <sp-number-field
              id="w"
              value=${width}
              @change=${this.handleWidthChanged}
              hide-stepper
              autocomplete="off"
              min="0"
              format-options='{
                  "style": "unit",
                  "unit": "px"
                }'
            ></sp-number-field>
            <sp-icon class="lock">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19 4.5">
                <defs>
                  <style>
                    .lock {
                      fill: none;
                      stroke: var(--spectrum-gray-500);
                      stroke-miterlimit: 10;
                    }
                  </style>
                </defs>
                <line class="lock" y1="0.5" x2="16.5" y2="0.5"></line>
                <line class="lock" x1="16.5" x2="16.5" y2="4.5"></line>
              </svg>
            </sp-icon>
          </div>

          <div>
            <sp-field-label for="x" side-aligned="end">X</sp-field-label>
            <sp-number-field
              id="x"
              value=${x}
              @change=${this.handleXChanged}
              hide-stepper
              autocomplete="off"
              format-options='{
                    "style": "unit",
                    "unit": "px"
                  }'
            ></sp-number-field>
          </div>
        </div>

        <div class="line">
          <div>
            <sp-field-label for="h" side-aligned="start">H</sp-field-label>
            <sp-number-field
              id="h"
              value=${height}
              @change=${this.handleHeightChanged}
              hide-stepper
              autocomplete="off"
              min="0"
              format-options='{
                    "style": "unit",
                    "unit": "px"
                  }'
            ></sp-number-field>
            <sp-icon class="lock">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19 7">
                <defs>
                  <style>
                    .lock {
                      fill: none;
                      stroke: var(--spectrum-gray-500);
                      stroke-miterlimit: 10;
                    }
                  </style>
                </defs>
                <line class="lock" y1="4.5" x2="17" y2="4.5"></line>
                <line class="lock" x1="16.5" x2="16.5" y2="4.5"></line>
              </svg>
            </sp-icon>
          </div>

          <div>
            <sp-field-label for="y" side-aligned="end">Y</sp-field-label>
            <sp-number-field
              id="y"
              value=${y}
              @change=${this.handleYChanged}
              hide-stepper
              autocomplete="off"
              format-options='{
                    "style": "unit",
                    "unit": "px"
                  }'
            ></sp-number-field>
          </div>
        </div>

        <sp-action-button
          quiet
          size="s"
          class="lock-button"
          @click=${this.handleLockAspectRatioChanged}
        >
          <sp-tooltip self-managed placement="bottom">
            ${when(
              lockAspectRatio,
              () => 'Constrain aspect ratio',
              () => 'Do not constrain aspect ratio',
            )}
          </sp-tooltip>
          ${when(
            lockAspectRatio,
            () => html`<sp-icon-lock-closed slot="icon"></sp-icon-lock-closed>`,
            () => html`<sp-icon-lock-open slot="icon"></sp-icon-lock-open>`,
          )}
        </sp-action-button>

        <div class="line">
          <div>
            <sp-field-label
              for="angle"
              side-aligned="start"
              format-options='{
                  "style": "unit",
                  "unit": "px"
                }'
              >Angle</sp-field-label
            >
            <sp-number-field
              id="angle"
              value=${angle}
              hide-stepper
              autocomplete="off"
              format-options='{
                  "style": "unit",
                  "unit": "deg"
                }'
            ></sp-number-field>
          </div>
        </div>
      </div>
    </sp-accordion-item>`;
  }

  render() {
    if (!this.node) {
      return;
    }

    const { type } = this.node;
    const isGroup = type === 'g';
    const isText = type === 'text';

    const {
      fill,
      stroke,
      strokeWidth,
      strokeAlignment = 'center',
      strokeLinecap = 'butt',
      strokeLinejoin = 'miter',
      fontSize,
    } = this.node as TextSerializedNode;

    const fillHTML = html`<sp-action-button quiet size="m" id="fill">
        <ic-spectrum-fill-icon
          value=${fill}
          .node=${this.node}
          slot="icon"
        ></ic-spectrum-fill-icon>
        <sp-tooltip self-managed placement="bottom"> Fill </sp-tooltip>
      </sp-action-button>
      <sp-overlay trigger="fill@click" placement="bottom" type="auto">
        <sp-popover class="fill-popover" dialog>
          <ic-spectrum-color-picker
            value=${fill}
            @color-change=${this.handleFillChanged}
          ></ic-spectrum-color-picker>
        </sp-popover>
      </sp-overlay>`;

    const strokeHTML = html`<sp-action-button quiet size="m" id="stroke">
        <ic-spectrum-stroke-icon
          value=${stroke}
          slot="icon"
        ></ic-spectrum-stroke-icon>
        <sp-tooltip self-managed placement="bottom"> Stroke </sp-tooltip>
      </sp-action-button>
      <sp-overlay trigger="stroke@click" placement="bottom" type="auto">
        <sp-popover dialog>
          <ic-spectrum-color-picker
            value=${stroke}
            .types=${[ColorType.None, ColorType.Solid]}
            @color-change=${this.handleStrokeChanged}
          ></ic-spectrum-color-picker>
        </sp-popover>
      </sp-overlay> `;

    const strokeWidthHTML = html`<div class="line">
      <sp-slider
        label="Stroke width"
        label-visibility="text"
        value=${strokeWidth}
        @input=${this.handleStrokeWidthChanging}
        @change=${this.handleStrokeWidthChanged}
      ></sp-slider>
      <sp-number-field
        class="stroke-width-field"
        value=${strokeWidth}
        @change=${this.handleStrokeWidthChanged}
        hide-stepper
        autocomplete="off"
        min="0"
        format-options='{
          "style": "unit",
          "unit": "px"
        }'
      ></sp-number-field>
    </div> `;

    const strokeAlignmentHTML = html`<div class="line">
      <sp-field-label for="stroke-alignment" side-aligned="start"
        >Stroke alignment</sp-field-label
      >
      <sp-action-group
        id="stroke-alignment"
        compact
        selects="single"
        .selected=${[strokeAlignment]}
        @change=${this.handleStrokeAlignmentChanged}
      >
        <sp-action-button value="inner">
          <sp-tooltip self-managed placement="bottom"> Inner </sp-tooltip>
          <sp-icon slot="icon">
            <svg
              role="img"
              fill="currentColor"
              viewBox="0 0 20 20"
              id="-icon"
              width="20"
              height="20"
              aria-hidden="true"
              aria-label=""
              focusable="false"
            >
              <path
                d="M17.25,8.5h-5c-.41406,0-.75-.33594-.75-.75V2.75c0-.41406.33594-.75.75-.75s.75.33594.75.75v4.25h4.25c.41406,0,.75.33594.75.75s-.33594.75-.75.75Z"
                opacity=".5"
              ></path>
              <path
                d="M17.25,15.25H5.97534c-.21826-.55859-.66406-.99805-1.22534-1.21094V2.75c0-.41406-.33594-.75-.75-.75s-.75.33594-.75.75v11.28906c-.80212.30396-1.375,1.07349-1.375,1.98193,0,1.17383.95142,2.125,2.125,2.125.91626,0,1.69019-.58301,1.98853-1.396h11.26147c.41406,0,.75-.33594.75-.75s-.33594-.75-.75-.75Z"
              ></path>
              <path
                d="M17.25,8.5h-5c-.41406,0-.75-.33594-.75-.75V2.75c0-.41406.33594-.75.75-.75H4c.41406,0,.75.33594.75.75v12.5h12.5c.41406,0,.75.33594.75.75V7.75c0,.41406-.33594.75-.75.75Z"
                opacity=".2"
              ></path>
            </svg>
          </sp-icon>
        </sp-action-button>
        <sp-action-button value="center">
          <sp-tooltip self-managed placement="bottom"> Center </sp-tooltip>
          <sp-icon slot="icon">
            <svg
              role="img"
              fill="currentColor"
              viewBox="0 0 20 20"
              id="-icon"
              width="20"
              height="20"
              aria-hidden="true"
              aria-label=""
              focusable="false"
            >
              <path
                d="M17.25,8.5h-5c-.41406,0-.75-.33594-.75-.75V2.75c0-.41406.33594-.75.75-.75H3.75c.41406,0,.75.33594.75.75v12c0,.41309.33691.75.75.75h12c.41406,0,.75.33594.75.75V7.75c0,.41406-.33594.75-.75.75Z"
                opacity=".2"
              ></path>
              <path
                d="M17.25,17H5.25c-1.24023,0-2.25-1.00977-2.25-2.25V2.75c0-.41406.33594-.75.75-.75s.75.33594.75.75v12c0,.41309.33691.75.75.75h12c.41406,0,.75.33594.75.75s-.33594.75-.75.75Z"
                opacity=".5"
              ></path>
              <path
                d="M17.25,8.5h-5c-.41406,0-.75-.33594-.75-.75V2.75c0-.41406.33594-.75.75-.75s.75.33594.75.75v4.25h4.25c.41406,0,.75.33594.75.75s-.33594.75-.75.75Z"
                opacity=".5"
              ></path>
              <path
                d="M17.25,11.25h-7.26843c-.21545-.56738-.66418-1.01611-1.23157-1.23145V2.75c0-.41406-.33594-.75-.75-.75s-.75.33594-.75.75v7.26855c-.80139.30444-1.375,1.07446-1.375,1.98145,0,1.17188.95312,2.125,2.125,2.125.90698,0,1.677-.57373,1.98145-1.375h7.26855c.41406,0,.75-.33594.75-.75s-.33594-.75-.75-.75Z"
              ></path>
            </svg>
          </sp-icon>
        </sp-action-button>
        <sp-action-button value="outer">
          <sp-tooltip self-managed placement="bottom"> Outer </sp-tooltip>
          <sp-icon slot="icon">
            <svg
              role="img"
              fill="currentColor"
              viewBox="0 0 20 20"
              id="-icon"
              width="20"
              height="20"
              aria-hidden="true"
              aria-label=""
              focusable="false"
            >
              <path
                d="M17.25,17H5.25c-1.24023,0-2.25-1.00977-2.25-2.25V2.75c0-.41406.33594-.75.75-.75s.75.33594.75.75v12c0,.41309.33691.75.75.75h12c.41406,0,.75.33594.75.75s-.33594.75-.75.75Z"
                opacity=".5"
              ></path>
              <path
                d="M12,8V2H3.75c.41406,0,.75.33594.75.75v12c0,.41309.33691.75.75.75h12c.41406,0,.75.33594.75.75v-8.25h-6Z"
                opacity=".2"
              ></path>
              <path
                d="M17.25,7.25h-3.27466c-.21826-.55859-.66406-.99805-1.22534-1.21094v-3.28906c0-.41406-.33594-.75-.75-.75s-.75.33594-.75.75v3.28906c-.80212.30396-1.375,1.07349-1.375,1.98193,0,1.17383.95142,2.125,2.125,2.125.91626,0,1.69019-.58301,1.98853-1.396h3.26147c.41406,0,.75-.33594.75-.75s-.33594-.75-.75-.75Z"
              ></path>
            </svg>
          </sp-icon>
        </sp-action-button>
      </sp-action-group>
    </div> `;

    const strokeLinecapHTML = html`<div class="line">
      <sp-field-label for="stroke-linecap" side-aligned="start"
        >Stroke linecap</sp-field-label
      >
      <sp-action-group
        id="stroke-linecap"
        compact
        selects="single"
        .selected=${[strokeLinecap]}
        @change=${this.handleStrokeLinecapChanged}
      >
        <sp-action-button value="butt">
          <sp-tooltip self-managed placement="bottom"> Butt </sp-tooltip>
          <sp-icon slot="icon">
            <svg
              role="img"
              fill="currentColor"
              viewBox="0 0 20 20"
              id="-icon"
              width="20"
              height="20"
              aria-hidden="true"
              aria-label=""
              focusable="false"
            >
              <path
                d="M18,16h-10c-.41406,0-.75-.33594-.75-.75V4.75c0-.41406.33594-.75.75-.75h10c.41406,0,.75.33594.75.75s-.33594.75-.75.75h-9.25v9h9.25c.41406,0,.75.33594.75.75s-.33594.75-.75.75Z"
                opacity=".5"
              ></path>
              <path
                d="M18,5.5h-9.25v9h9.25c.41406,0,.75.33594.75.75V4.75c0,.41406-.33594.75-.75.75Z"
                opacity=".2"
              ></path>
              <path
                d="M18,9.25h-8.15479c-.302-.72168-1.01416-1.229-1.84521-1.229-1.10449,0-2,.89551-2,2,0,1.10474.89551,2,2,2,.84668,0,1.56641-.52783,1.85815-1.271h8.14185c.41406,0,.75-.33594.75-.75s-.33594-.75-.75-.75Z"
              ></path>
            </svg>
          </sp-icon>
        </sp-action-button>
        <sp-action-button value="round">
          <sp-tooltip self-managed placement="bottom"> Round </sp-tooltip>
          <sp-icon slot="icon">
            <svg
              role="img"
              fill="currentColor"
              viewBox="0 0 20 20"
              id="-icon"
              width="20"
              height="20"
              aria-hidden="true"
              aria-label=""
              focusable="false"
            >
              <path
                d="M18,16.02148h-10c-3.30859,0-6-2.69141-6-6s2.69141-6,6-6h10c.41406,0,.75.33594.75.75s-.33594.75-.75.75h-10c-2.48145,0-4.5,2.01855-4.5,4.5s2.01855,4.5,4.5,4.5h10c.41406,0,.75.33594.75.75s-.33594.75-.75.75Z"
                opacity=".5"
              ></path>
              <path
                d="M18,5.52148h-10c-2.48145,0-4.5,2.01855-4.5,4.5s2.01855,4.5,4.5,4.5h10c.41394,0,.74976.33569.75.74951h0V4.77148c0,.41406-.33594.75-.75.75Z"
                opacity=".2"
              ></path>
              <path
                d="M18,9.25h-8.02466c-.3092-.79126-1.07446-1.354-1.97534-1.354-1.17358,0-2.125.95166-2.125,2.125,0,1.17383.95142,2.125,2.125,2.125.91626,0,1.69019-.58301,1.98853-1.396h8.01147c.41406,0,.75-.33594.75-.75s-.33594-.75-.75-.75Z"
              ></path>
            </svg>
          </sp-icon>
        </sp-action-button>
        <sp-action-button value="square">
          <sp-tooltip self-managed placement="bottom"> Square </sp-tooltip>
          <sp-icon slot="icon">
            <svg
              role="img"
              fill="currentColor"
              viewBox="0 0 20 20"
              id="-icon"
              width="20"
              height="20"
              aria-hidden="true"
              aria-label=""
              focusable="false"
            >
              <path
                d="M18,16H2.75c-.41406,0-.75-.33594-.75-.75V4.75c0-.41406.33594-.75.75-.75h15.25c.41406,0,.75.33594.75.75s-.33594.75-.75.75H3.5v9h14.5c.41406,0,.75.33594.75.75s-.33594.75-.75.75Z"
                opacity=".5"
              ></path>
              <path
                d="M18,5.5H3.5v9h14.5c.41406,0,.75.33594.75.75V4.75c0,.41406-.33594.75-.75.75Z"
                opacity=".2"
              ></path>
              <path
                d="M18,9.25h-8.02466c-.3092-.79126-1.07446-1.354-1.97534-1.354-1.17358,0-2.125.95166-2.125,2.125,0,1.17383.95142,2.125,2.125,2.125.91626,0,1.69019-.58301,1.98853-1.396h8.01147c.41406,0,.75-.33594.75-.75s-.33594-.75-.75-.75Z"
              ></path>
            </svg>
          </sp-icon>
        </sp-action-button>
      </sp-action-group>
    </div> `;

    const strokeLinejoinHTML = html`<div class="line">
      <sp-field-label for="stroke-linejoin" side-aligned="start"
        >Stroke linejoin</sp-field-label
      >
      <sp-action-group
        id="stroke-linejoin"
        compact
        selects="single"
        .selected=${[strokeLinejoin]}
        @change=${this.handleStrokeLinejoinChanged}
      >
        <sp-action-button value="miter">
          <sp-tooltip self-managed placement="bottom"> Miter </sp-tooltip>
          <sp-icon slot="icon">
            <svg
              role="img"
              fill="currentColor"
              viewBox="0 0 20 20"
              id="-icon"
              width="20"
              height="20"
              aria-hidden="true"
              aria-label=""
              focusable="false"
            >
              <path
                d="M3,2c-.41406,0-.75.33594-.75.75v14.25c0,.41406.33594.75.75.75h14.25c.41406,0,.75-.33594.75-.75s-.33594-.75-.75-.75H3.75V2.75c0-.41406-.33594-.75-.75-.75Z"
              ></path>
              <path
                d="M12.25,2c-.41406,0-.75.33594-.75.75v5c0,.41406.33594.75.75.75h5c.41406,0,.75-.33594.75-.75s-.33594-.75-.75-.75h-4.25V2.75c0-.41406-.33594-.75-.75-.75Z"
                opacity=".5"
              ></path>
              <path
                d="M4.5,17c-.82837,0-1.5-.67163-1.5-1.5V2h9v.05054c-.28979.10376-.5.37402-.5.69946v5c0,.41406.33594.75.75.75h5c.32544,0,.5957-.21021.69946-.5h.05054v9H4.5Z"
                opacity=".2"
              ></path>
            </svg>
          </sp-icon>
        </sp-action-button>
        <sp-action-button value="round">
          <sp-tooltip self-managed placement="bottom"> Round </sp-tooltip>
          <sp-icon slot="icon">
            <svg
              role="img"
              fill="currentColor"
              viewBox="0 0 20 20"
              id="-icon"
              width="20"
              height="20"
              aria-hidden="true"
              aria-label=""
              focusable="false"
            >
              <path
                d="M3,2c-.41406,0-.75.33594-.75.75v7.25c0,4.27344,3.47656,7.75,7.75,7.75h7.25c.41406,0,.75-.33594.75-.75s-.33594-.75-.75-.75h-7.25c-3.44629,0-6.25-2.80371-6.25-6.25V2.75c0-.41406-.33594-.75-.75-.75Z"
              ></path>
              <path
                d="M12.25,2c-.41406,0-.75.33594-.75.75v5c0,.41406.33594.75.75.75h5c.41406,0,.75-.33594.75-.75s-.33594-.75-.75-.75h-4.25V2.75c0-.41406-.33594-.75-.75-.75Z"
                opacity=".5"
              ></path>
              <path
                d="M10,17c-3.86597,0-7-3.13403-7-7V2h9v.05054c-.28979.10376-.5.37402-.5.69946v5c0,.41406.33594.75.75.75h5c.32544,0,.5957-.21021.69946-.5h.05054v9h-8Z"
                opacity=".2"
              ></path>
            </svg>
          </sp-icon>
        </sp-action-button>
        <sp-action-button value="bevel">
          <sp-tooltip self-managed placement="bottom"> Bevel </sp-tooltip>
          <sp-icon slot="icon">
            <svg
              role="img"
              fill="currentColor"
              viewBox="0 0 20 20"
              id="-icon"
              width="20"
              height="20"
              aria-hidden="true"
              aria-label=""
              focusable="false"
            >
              <path
                d="M3,2c-.41406,0-.75.33594-.75.75v7.25c0,.19922.0791.38965.21973.53027l7,7c.14062.14062.33105.21973.53027.21973h7.25c.41406,0,.75-.33594.75-.75s-.33594-.75-.75-.75h-6.93945l-6.56055-6.56055V2.75c0-.41406-.33594-.75-.75-.75Z"
              ></path>
              <path
                d="M12.25,2c-.41406,0-.75.33594-.75.75v5c0,.41406.33594.75.75.75h5c.41406,0,.75-.33594.75-.75s-.33594-.75-.75-.75h-4.25V2.75c0-.41406-.33594-.75-.75-.75Z"
                opacity=".4"
              ></path>
              <path
                d="M10,17l-7-7V2h9v.05054c-.28979.10376-.5.37402-.5.69946v5c0,.41406.33594.75.75.75h5c.32544,0,.5957-.21021.69946-.5h.05054v9h-8Z"
                opacity=".2"
              ></path>
            </svg>
          </sp-icon>
        </sp-action-button>
      </sp-action-group>
    </div> `;

    const fontSizeHTML = html`<div class="line">
      <sp-field-label for="font-size" side-aligned="start"
        >Font size</sp-field-label
      >
      <sp-number-field
        id="font-size"
        value=${fontSize}
        hide-stepper
        autocomplete="off"
        @change=${this.handleFontSizeChanged}
        format-options='{
        "style": "unit",
        "unit": "px"
      }'
      ></sp-number-field>
    </div> `;

    return html`
      <sp-accordion allow-multiple size="s">
        ${!isGroup
          ? html`
              <sp-accordion-item label=${'Shape ' + this.node.type} open>
                <div class="content style-group">
                  <div class="line">
                    <sp-field-label for="style" side-aligned="start"
                      >Style</sp-field-label
                    >
                    <div>${fillHTML} ${!isText ? strokeHTML : ''}</div>
                  </div>

                  ${!isText ? strokeWidthHTML : ''}
                  ${!isText ? strokeAlignmentHTML : ''}
                  ${!isText ? strokeLinecapHTML : ''}
                  ${!isText ? strokeLinejoinHTML : ''}
                  ${isText ? fontSizeHTML : ''}
                </div>
              </sp-accordion-item>
            `
          : ''}
        ${this.transformTemplate()}
      </sp-accordion>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-spectrum-properties-panel-content': PropertiesPanelContent;
  }
}
