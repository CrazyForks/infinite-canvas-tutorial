import { html, css, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { load } from '@loaders.gl/core';
import { ImageLoader } from '@loaders.gl/images';

import { isColor, isGradient, isPattern } from '@infinite-canvas-tutorial/core';
import '@shoelace-style/shoelace/dist/components/radio-group/radio-group.js';
import '@shoelace-style/shoelace/dist/components/radio-button/radio-button.js';
import { panelStyles } from './styles';

@customElement('ic-fill-panel')
export class FillPanel extends LitElement {
  static styles = [
    panelStyles,
    css`
      .fill-panel-content {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
    `,
  ];

  @property()
  fill: string;

  @property({ type: Number })
  fillOpacity: number;

  @state()
  type: 'solid' | 'gradient' | 'image' | 'none' | 'pattern';

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('fill')) {
      this.type =
        this.fill === 'none'
          ? 'none'
          : isGradient(this.fill)
          ? 'gradient'
          : isColor(this.fill)
          ? 'solid'
          : isPattern(this.fill)
          ? 'pattern'
          : 'image';
    }
  }

  private handleSolidChange(e: CustomEvent) {
    const { rgb, opacity } = e.detail;
    const event = new CustomEvent('fillchanged', {
      detail: { fill: rgb, fillOpacity: opacity },
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    this.dispatchEvent(event);
  }

  private handleImageChange(e: CustomEvent) {
    const { dataURI, opacity } = e.detail;

    load(dataURI, ImageLoader).then((image) => {
      const event = new CustomEvent('fillchanged', {
        detail: { fill: dataURI, fillOpacity: opacity, fillImage: image },
        bubbles: true,
        composed: true,
        cancelable: true,
      });
      this.dispatchEvent(event);
    });
  }

  private handleGradientChange(e: CustomEvent) {
    const { gradient, opacity } = e.detail;
    const event = new CustomEvent('fillchanged', {
      detail: { fill: gradient, fillOpacity: opacity },
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    this.dispatchEvent(event);
  }

  private handleFillTypeChange(e: CustomEvent) {
    this.type = (e.target as any).value;

    if (this.type === 'none') {
      const event = new CustomEvent('fillchanged', {
        detail: { fill: 'none', fillOpacity: 1 },
        bubbles: true,
        composed: true,
        cancelable: true,
      });
      this.dispatchEvent(event);
    }
  }

  render() {
    return html`
      <div class="fill-panel-content">
        <sl-select
          name="fill"
          label="Color"
          size="small"
          placeholder="center"
          hoist
          value=${this.type}
          @sl-change=${this.handleFillTypeChange}
        >
          <sl-option value="solid">Solid</sl-option>
          <sl-option value="gradient">Gradient</sl-option>
          <sl-option value="image">Image</sl-option>
          <sl-option value="pattern">Pattern</sl-option>
          <sl-option value="none">None</sl-option>
        </sl-select>
        ${this.type === 'solid'
          ? html`
              <ic-input-solid
                rgb=${this.fill}
                opacity=${this.fillOpacity}
                @colorchanged=${this.handleSolidChange}
              ></ic-input-solid>
            `
          : this.type === 'gradient'
          ? html` <ic-input-gradient
              value=${this.fill}
              opacity=${this.fillOpacity}
              @gradientchanged=${this.handleGradientChange}
            ></ic-input-gradient>`
          : this.type === 'image'
          ? html`
              <ic-input-image
                dataURI=${this.fill}
                opacity=${this.fillOpacity}
                @filechanged=${this.handleImageChange}
              ></ic-input-image>
            `
          : html``}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-fill-panel': FillPanel;
  }
}
