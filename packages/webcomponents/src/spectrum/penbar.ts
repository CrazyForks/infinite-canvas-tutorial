import { html, css, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { when } from 'lit/directives/when.js';
import { Pen, AppState } from '@infinite-canvas-tutorial/ecs';
import { apiContext, appStateContext } from '../context';
import { ExtendedAPI } from '../API';
import { fileOpen } from '../utils';
import { createImage } from './context-menu';

@customElement('ic-spectrum-penbar')
export class Penbar extends LitElement {
  static styles = css`
    .penbar {
      display: flex;
      justify-content: center;

      background: var(--spectrum-gray-100);
      border-radius: var(--spectrum-corner-radius-200);

      padding: var(--spectrum-global-dimension-size-100);
      margin: 4px;

      filter: drop-shadow(
        var(--spectrum-drop-shadow-color) 0px var(--spectrum-drop-shadow-y)
          var(--spectrum-drop-shadow-blur)
      );
    }

    kbd {
      font-family: var(--spectrum-alias-body-text-font-family);
      letter-spacing: 0.1em;
      white-space: nowrap;
      border: none;
      padding: none;
      padding: 0;
      line-height: normal;
    }
  `;

  @consume({ context: appStateContext, subscribe: true })
  appState: AppState;

  @consume({ context: apiContext, subscribe: true })
  api: ExtendedAPI;

  /**
   * Record the last draw pen, so that when the penbar is changed, the last draw pen will be selected.
   */
  @state()
  lastDrawPen:
    | Pen.DRAW_RECT
    | Pen.DRAW_ELLIPSE
    | Pen.DRAW_LINE
    | Pen.DRAW_ROUGH_RECT = Pen.DRAW_RECT;

  private binded = false;

  private async handlePenChanged(e: CustomEvent) {
    const pen = (e.target as any).selected[0];

    if (!this.appState.penbarAll.includes(pen)) {
      return;
    }

    this.api.setPen(pen);
    if (
      pen === Pen.DRAW_RECT ||
      pen === Pen.DRAW_ELLIPSE ||
      pen === Pen.DRAW_LINE ||
      pen === Pen.DRAW_ROUGH_RECT
    ) {
      this.lastDrawPen = pen;
    } else if (pen === Pen.IMAGE) {
      try {
        const file = await fileOpen({
          extensions: ['jpg', 'png', 'svg'],
          description: 'Image to upload',
        });
        if (file) {
          const center = this.api.viewport2Canvas({
            x: this.api.element.clientWidth / 2,
            y: this.api.element.clientHeight / 2,
          });
          createImage(this.api, this.appState, file, center);
          this.api.setPen(Pen.SELECT);
          this.api.record();
        }
      } catch (e) {
        this.api.setPen(Pen.SELECT);
      }
    }
  }

  private setPenWithKeyboard(
    event: KeyboardEvent,
    pen: Pen.DRAW_RECT | Pen.DRAW_ELLIPSE | Pen.DRAW_LINE,
    targetKey: string,
  ) {
    if (
      event.key.toUpperCase() === targetKey.toUpperCase() &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      event.stopPropagation();

      this.api.setPen(pen);
      this.lastDrawPen = pen;
    }
  }

  // keyboard shortcuts R L O
  private handleKeyDown = (event: KeyboardEvent) => {
    if (document.activeElement !== this.api.element) {
      return;
    }
    this.setPenWithKeyboard(event, Pen.DRAW_RECT, 'R');
    this.setPenWithKeyboard(event, Pen.DRAW_LINE, 'L');
    this.setPenWithKeyboard(event, Pen.DRAW_ELLIPSE, 'O');
  };

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  render() {
    // FIXME: wait for the element to be ready.
    if (this.api?.element && !this.binded) {
      document.addEventListener('keydown', this.handleKeyDown);
      this.binded = true;
    }

    const { penbarAll, penbarSelected, penbarVisible } = this.appState;
    return when(
      penbarVisible,
      () => html`
        <sp-action-group
          class="penbar"
          vertical
          selects="single"
          .selected=${penbarSelected}
          @change=${this.handlePenChanged}
          emphasized
          quiet
        >
          ${when(
            penbarAll.includes(Pen.HAND),
            () => html`
              <sp-action-button value="${Pen.HAND}">
                <sp-icon-hand slot="icon"></sp-icon-hand>
                <sp-tooltip self-managed placement="right">
                  Hand (Panning tool)
                </sp-tooltip>
              </sp-action-button>
            `,
          )}
          ${when(
            penbarAll.includes(Pen.SELECT),
            () => html`
              <sp-action-button value="${Pen.SELECT}">
                <sp-icon-select slot="icon"></sp-icon-select>
                <sp-tooltip self-managed placement="right"> Select </sp-tooltip>
              </sp-action-button>
            `,
          )}
          <overlay-trigger placement="right">
            <sp-action-button
              value=${this.lastDrawPen}
              hold-affordance
              slot="trigger"
            >
              ${when(
                this.lastDrawPen === Pen.DRAW_RECT,
                () => html`<sp-icon-rectangle slot="icon"></sp-icon-rectangle>`,
              )}
              ${when(
                this.lastDrawPen === Pen.DRAW_ELLIPSE,
                () => html`<sp-icon-ellipse slot="icon"></sp-icon-ellipse>`,
              )}
              ${when(
                this.lastDrawPen === Pen.DRAW_LINE,
                () => html`<sp-icon-line slot="icon"></sp-icon-line>`,
              )}
              ${when(
                this.lastDrawPen === Pen.DRAW_ROUGH_RECT,
                () =>
                  html`<sp-icon-rect-select slot="icon"></sp-icon-rect-select>`,
              )}
            </sp-action-button>
            <sp-popover slot="hover-content" style="padding: 8px;">
              <ic-spectrum-penbar-draw-settings
                .pen=${this.lastDrawPen}
              ></ic-spectrum-penbar-draw-settings>
            </sp-popover>
            <sp-popover slot="click-content">
              <sp-menu
                @change=${this.handlePenChanged}
                selects="single"
                .selected=${penbarSelected}
              >
                ${when(
                  penbarAll.includes(Pen.DRAW_RECT),
                  () => html` <sp-menu-item value="${Pen.DRAW_RECT}">
                    <sp-icon-rectangle slot="icon"></sp-icon-rectangle>
                    Rectangle
                    <kbd slot="value">R</kbd>
                  </sp-menu-item>`,
                )}
                ${when(
                  penbarAll.includes(Pen.DRAW_ELLIPSE),
                  () => html` <sp-menu-item value="${Pen.DRAW_ELLIPSE}">
                    <sp-icon-ellipse slot="icon"></sp-icon-ellipse>
                    Ellipse
                    <kbd slot="value">O</kbd>
                  </sp-menu-item>`,
                )}
                ${when(
                  penbarAll.includes(Pen.DRAW_LINE),
                  () => html` <sp-menu-item value="${Pen.DRAW_LINE}">
                    <sp-icon-line slot="icon"></sp-icon-line>
                    Line
                    <kbd slot="value">L</kbd>
                  </sp-menu-item>`,
                )}
                ${when(
                  penbarAll.includes(Pen.DRAW_ROUGH_RECT),
                  () => html` <sp-menu-item value="${Pen.DRAW_ROUGH_RECT}">
                    <sp-icon-rect-select slot="icon"></sp-icon-rect-select>
                    Rough Rectangle
                  </sp-menu-item>`,
                )}
              </sp-menu>
            </sp-popover>
          </overlay-trigger>

          ${when(
            penbarAll.includes(Pen.IMAGE),
            () => html`
              <sp-action-button value="${Pen.IMAGE}">
                <sp-icon-image slot="icon"></sp-icon-image>
                <sp-tooltip self-managed placement="right"> Image </sp-tooltip>
              </sp-action-button>
            `,
          )}
          ${when(
            penbarAll.includes(Pen.TEXT),
            () => html`
              <sp-action-button value="${Pen.TEXT}">
                <sp-icon-text slot="icon"></sp-icon-text>
                <sp-tooltip self-managed placement="right"> Text </sp-tooltip>
              </sp-action-button>
            `,
          )}
          ${when(
            penbarAll.includes(Pen.PENCIL),
            () => html`
              <overlay-trigger placement="right">
                <sp-action-button
                  value="${Pen.PENCIL}"
                  hold-affordance
                  slot="trigger"
                >
                  <sp-icon-annotate-pen slot="icon"></sp-icon-annotate-pen>
                  <sp-tooltip self-managed placement="right">
                    Pencil
                  </sp-tooltip>
                </sp-action-button>
                <sp-popover slot="hover-content" style="padding: 8px;">
                  <ic-spectrum-penbar-pencil-settings></ic-spectrum-penbar-pencil-settings>
                </sp-popover>
              </overlay-trigger>
            `,
          )}
          ${when(
            penbarAll.includes(Pen.BRUSH),
            () => html`
              <sp-action-button value="${Pen.BRUSH}">
                <sp-icon-brush slot="icon"></sp-icon-brush>
                <sp-tooltip self-managed placement="right"> Brush </sp-tooltip>
              </sp-action-button>
            `,
          )}
          ${when(
            penbarAll.includes(Pen.VECTOR_NETWORK),
            () => html`
              <sp-action-button value="${Pen.VECTOR_NETWORK}">
                <sp-icon-shapes slot="icon"></sp-icon-shapes>
                <sp-tooltip self-managed placement="right">
                  Vector Network
                </sp-tooltip>
              </sp-action-button>
            `,
          )}
        </sp-action-group>
      `,
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-spectrum-penbar': Penbar;
  }
}
