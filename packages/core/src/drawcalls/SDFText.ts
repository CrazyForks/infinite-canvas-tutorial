import {
  type RenderPass,
  Buffer,
  BufferFrequencyHint,
  BufferUsage,
  BlendMode,
  BlendFactor,
  ChannelWriteMask,
  Format,
  VertexStepMode,
  CompareFunction,
  BindingsDescriptor,
  AddressMode,
  FilterMode,
  MipmapFilterMode,
  TransparentBlack,
  Texture,
  StencilOp,
} from '@antv/g-device-api';
import { Shape, Text } from '../shapes';
import { Drawcall, ZINDEX_FACTOR } from './Drawcall';
import { vert, frag, physical_frag, Location } from '../shaders/sdf_text';
import {
  BASE_FONT_WIDTH,
  GlyphManager,
  paddingMat3,
  getGlyphQuads,
  SDF_SCALE,
  BitmapFont,
  GlyphPositions,
  containsEmoji,
  yOffsetFromTextBaseline,
  rotateAroundOrigin,
} from '../utils';
import { vec2 } from 'gl-matrix';

export class SDFText extends Drawcall {
  #glyphManager = new GlyphManager();
  #uniformBuffer: Buffer;
  #texture: Texture;

  validate(shape: Shape) {
    const result = super.validate(shape);
    if (!result) {
      return false;
    }

    if (this.shapes.length === 0) {
      return true;
    }

    if (this.hash(this.shapes[0] as Text) !== this.hash(shape as Text)) {
      return false;
    }

    return true;
  }

  private hash(shape: Text) {
    const { metrics, bitmapFont, physical, dropShadowBlurRadius } =
      shape as Text;
    return `${metrics?.font}-${bitmapFont?.fontFamily}-${physical}-${dropShadowBlurRadius}`;
  }

  private get useBitmapFont() {
    return !!(this.shapes[0] as Text)?.bitmapFont;
  }

  createGeometry(): void {
    const {
      metrics,
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
      bitmapFont,
      esdt,
      content,
      fill,
    } = this.shapes[0] as Text;

    const hasEmoji = containsEmoji(content);

    const indices: number[] = [];
    const positions: number[] = [];
    const uvOffsets: number[] = [];
    let indicesOff = 0;
    let fontScale: number;

    if (this.useBitmapFont) {
      fontScale =
        metrics.fontMetrics.fontSize / bitmapFont.baseMeasurementFontSize;
    } else {
      // scale current font size to base(24)
      fontScale = Number(fontSize) / (BASE_FONT_WIDTH / SDF_SCALE);
      const allText = this.shapes.map((text: Text) => text.bidiChars).join('');
      this.#glyphManager.generateAtlas(
        metrics.font,
        fontFamily,
        fontWeight.toString(),
        fontStyle,
        allText,
        this.device,
        esdt,
        hasEmoji ? (fill as string) : '',
      );
    }

    this.shapes.forEach((object: Text) => {
      const { metrics, letterSpacing, bitmapFont } = object;
      const { font, lines, lineHeight } = metrics;

      const {
        indicesOffset,
        indexBuffer,
        charUVOffsetBuffer,
        charPositionsBuffer,
      } = this.buildTextBuffers({
        object,
        lines,
        fontStack: font,
        lineHeight,
        letterSpacing: letterSpacing,
        indicesOffset: indicesOff,
        bitmapFont,
        fontScale,
      });
      indicesOff = indicesOffset;

      uvOffsets.push(...charUVOffsetBuffer);
      positions.push(...charPositionsBuffer);
      indices.push(...indexBuffer);
    });

    this.indexBufferData = new Uint32Array(indices);

    if (this.vertexBuffers[0]) {
      this.vertexBuffers[0].destroy();
    }
    this.vertexBufferDatas[0] = new Float32Array(positions);
    this.vertexBuffers[0] = this.device.createBuffer({
      viewOrSize: this.vertexBufferDatas[0],
      usage: BufferUsage.VERTEX,
      hint: BufferFrequencyHint.STATIC,
    });

    if (this.vertexBuffers[1]) {
      this.vertexBuffers[1].destroy();
    }
    this.vertexBufferDatas[1] = new Float32Array(uvOffsets);
    this.vertexBuffers[1] = this.device.createBuffer({
      viewOrSize: this.vertexBufferDatas[1],
      usage: BufferUsage.VERTEX,
      hint: BufferFrequencyHint.STATIC,
    });

    if (this.indexBuffer) {
      this.indexBuffer.destroy();
    }
    this.indexBuffer = this.device.createBuffer({
      viewOrSize: this.indexBufferData,
      usage: BufferUsage.INDEX,
      hint: BufferFrequencyHint.STATIC,
    });

    this.vertexBufferDescriptors = [
      {
        arrayStride: 4 * 3,
        stepMode: VertexStepMode.VERTEX,
        attributes: [
          {
            shaderLocation: Location.POSITION, // a_Position
            offset: 0,
            format: Format.F32_RGB,
          },
        ],
      },
      {
        arrayStride: 4 * 4,
        stepMode: VertexStepMode.VERTEX,
        attributes: [
          {
            shaderLocation: Location.UV_OFFSET, // a_UvOffset
            offset: 0,
            format: Format.F32_RGBA,
          },
        ],
      },
    ];
  }

  createMaterial(defines: string, uniformBuffer: Buffer): void {
    const { content, dropShadowBlurRadius, physical } = this.shapes[0] as Text;

    let glyphAtlasTexture: Texture;
    if (this.useBitmapFont) {
      const { bitmapFont } = this.shapes[0] as Text;
      bitmapFont.createTexture(this.device);
      glyphAtlasTexture = bitmapFont.pages[0].texture;

      const { distanceField } = bitmapFont;
      if (distanceField.type === 'msdf') {
        defines += '#define USE_MSDF\n';
      } else if (distanceField.type === 'sdf') {
        defines += '#define USE_SDF\n';
      } else {
        defines += '#define USE_SDF_NONE\n';
      }
    } else {
      defines += '#define USE_SDF\n';
      const hasEmoji = containsEmoji(content);
      if (hasEmoji) {
        defines += '#define USE_EMOJI\n';
      }

      glyphAtlasTexture = this.#glyphManager.getAtlasTexture();
    }

    if (dropShadowBlurRadius > 0) {
      defines += '#define USE_SHADOW\n';
    }

    this.device.setResourceName(glyphAtlasTexture, 'SDFText Texture');

    this.createProgram(vert, physical ? physical_frag : frag, defines);

    if (!this.#uniformBuffer) {
      this.#uniformBuffer = this.device.createBuffer({
        viewOrSize:
          Float32Array.BYTES_PER_ELEMENT * (16 + 4 + 4 + 4 + 4 + 4 + 4 + 4 + 4),
        usage: BufferUsage.UNIFORM,
        hint: BufferFrequencyHint.DYNAMIC,
      });
    }

    this.pipeline = this.renderCache.createRenderPipeline({
      inputLayout: this.inputLayout,
      program: this.program,
      colorAttachmentFormats: [Format.U8_RGBA_RT],
      depthStencilAttachmentFormat: Format.D24_S8,
      megaStateDescriptor: {
        attachmentsState: [
          {
            channelWriteMask: ChannelWriteMask.ALL,
            rgbBlendState: {
              blendMode: BlendMode.ADD,
              blendSrcFactor: BlendFactor.SRC_ALPHA,
              blendDstFactor: BlendFactor.ONE_MINUS_SRC_ALPHA,
            },
            alphaBlendState: {
              blendMode: BlendMode.ADD,
              blendSrcFactor: BlendFactor.ONE,
              blendDstFactor: BlendFactor.ONE_MINUS_SRC_ALPHA,
            },
          },
        ],
        blendConstant: TransparentBlack,
        depthWrite: true,
        depthCompare: CompareFunction.GREATER,
        stencilWrite: false,
        stencilFront: {
          compare: CompareFunction.ALWAYS,
          passOp: StencilOp.KEEP,
          failOp: StencilOp.KEEP,
          depthFailOp: StencilOp.KEEP,
        },
        stencilBack: {
          compare: CompareFunction.ALWAYS,
          passOp: StencilOp.KEEP,
          failOp: StencilOp.KEEP,
          depthFailOp: StencilOp.KEEP,
        },
      },
    });
    this.device.setResourceName(this.pipeline, 'SDFTextPipeline');

    const sampler = this.renderCache.createSampler({
      addressModeU: AddressMode.CLAMP_TO_EDGE,
      addressModeV: AddressMode.CLAMP_TO_EDGE,
      minFilter: FilterMode.POINT,
      magFilter: FilterMode.BILINEAR,
      mipmapFilter: MipmapFilterMode.LINEAR,
      lodMinClamp: 0,
      lodMaxClamp: 0,
    });

    const bindings: BindingsDescriptor = {
      pipeline: this.pipeline,
      uniformBufferBindings: [
        {
          buffer: uniformBuffer,
        },
        {
          buffer: this.#uniformBuffer,
        },
      ],
      samplerBindings: [
        {
          texture: glyphAtlasTexture,
          sampler,
        },
      ],
    };

    this.bindings = this.renderCache.createBindings(bindings);
  }

  render(renderPass: RenderPass, uniformLegacyObject: Record<string, unknown>) {
    if (
      this.shapes.some((shape) => shape.renderDirtyFlag) ||
      this.geometryDirty
    ) {
      const { worldTransform } = this.shapes[0];

      const [buffer, legacyObject] = this.generateBuffer(
        this.shapes[0] as Text,
        this.useBitmapFont
          ? (this.shapes[0] as Text).bitmapFont.pages[0]
          : this.#glyphManager.getAtlas().image,
      );
      const u_ModelMatrix = worldTransform.toArray(true);
      this.#uniformBuffer.setSubData(
        0,
        new Uint8Array(
          new Float32Array([...paddingMat3(u_ModelMatrix), ...buffer]).buffer,
        ),
      );
      const uniformLegacyObject: Record<string, unknown> = {
        u_ModelMatrix,
        ...legacyObject,
      };
      this.program.setUniformsLegacy(uniformLegacyObject);

      if (this.useWireframe && this.geometryDirty) {
        this.generateWireframe();
      }
    }

    this.program.setUniformsLegacy(uniformLegacyObject);
    renderPass.setPipeline(this.pipeline);
    const vertexBuffers = this.vertexBuffers.map((buffer) => ({ buffer }));
    if (this.useWireframe) {
      vertexBuffers.push({ buffer: this.barycentricBuffer });
    }
    renderPass.setVertexInput(this.inputLayout, vertexBuffers, {
      buffer: this.indexBuffer,
    });
    renderPass.setBindings(this.bindings);
    renderPass.drawIndexed(this.indexBufferData.length);
  }

  destroy(): void {
    super.destroy();
    if (this.program) {
      this.#uniformBuffer?.destroy();
      this.#texture?.destroy();
    }

    this.#glyphManager.destroy();
  }

  private generateBuffer(
    shape: Text,
    image: { width: number; height: number },
  ): [number[], Record<string, unknown>] {
    const {
      fillRGB,
      strokeRGB: { r: sr, g: sg, b: sb, opacity: so },
      strokeWidth,
      opacity,
      fillOpacity,
      strokeOpacity,
      sizeAttenuation,
      fontSize,
      dropShadowColorRGB: { r: dsR, g: dsG, b: dsB, opacity: dsO },
      dropShadowOffsetX,
      dropShadowOffsetY,
      dropShadowBlurRadius,
    } = shape;

    const { width: atlasWidth, height: atlasHeight } = image;

    const { r: fr, g: fg, b: fb, opacity: fo } = fillRGB || {};

    const u_FillColor = [fr / 255, fg / 255, fb / 255, fo];
    const u_StrokeColor = [sr / 255, sg / 255, sb / 255, so];

    const u_ZIndexStrokeWidth = [
      shape.globalRenderOrder / ZINDEX_FACTOR,
      strokeWidth,
      fontSize as number,
      0,
    ];

    const u_Opacity = [
      opacity,
      fillOpacity,
      strokeOpacity,
      sizeAttenuation ? 1 : 0,
    ];

    const u_DropShadowColor = [dsR / 255, dsG / 255, dsB / 255, dsO];
    const u_DropShadow = [
      dropShadowOffsetX,
      dropShadowOffsetY,
      dropShadowBlurRadius,
      0,
    ];

    const u_AtlasSize = [atlasWidth, atlasHeight];

    return [
      [
        ...u_FillColor,
        ...u_StrokeColor,
        ...u_ZIndexStrokeWidth,
        ...u_Opacity,
        ...u_DropShadowColor,
        ...u_DropShadow,
        ...u_AtlasSize,
      ],
      {
        u_FillColor,
        u_StrokeColor,
        u_ZIndexStrokeWidth,
        u_Opacity,
        u_DropShadowColor,
        u_DropShadow,
        u_AtlasSize,
      },
    ];
  }

  private buildTextBuffers({
    object,
    lines,
    fontStack,
    lineHeight,
    letterSpacing,
    indicesOffset,
    bitmapFont,
    fontScale,
  }: {
    object: Text;
    lines: string[];
    fontStack: string;
    lineHeight: number;
    letterSpacing: number;
    indicesOffset: number;
    bitmapFont: BitmapFont;
    fontScale: number;
  }) {
    const {
      textAlign,
      textBaseline,
      x = 0,
      y = 0,
      bitmapFontKerning,
      metrics,
      path,
      side,
      startOffset,
    } = object;

    const charUVOffsetBuffer: number[] = [];
    const charPositionsBuffer: number[] = [];
    const indexBuffer: number[] = [];

    let i = indicesOffset;

    const dy =
      yOffsetFromTextBaseline(textBaseline, metrics.fontMetrics) +
        metrics.fontMetrics.fontBoundingBoxAscent || 0;

    const positionedGlyphs = this.#glyphManager.layout(
      lines,
      fontStack,
      lineHeight,
      textAlign,
      letterSpacing,
      bitmapFont,
      fontScale,
      bitmapFontKerning,
      0,
      dy,
      path,
      side,
      startOffset,
    );

    let positions: GlyphPositions;
    if (bitmapFont) {
      positions = {
        [fontStack]: Object.keys(bitmapFont.chars).reduce((acc, char) => {
          const { xAdvance, xOffset, yOffset, rect } = bitmapFont.chars[char];
          acc[char] = {
            rect,
            metrics: {
              width: xAdvance,
              height: bitmapFont.lineHeight,
              left: xOffset,
              // top: -yOffset + metrics.fontMetrics.fontBoundingBoxAscent,
              top: -yOffset + bitmapFont.lineHeight,
              advance: xAdvance,
            },
          };
          return acc;
        }, {}),
      };
    } else {
      // calculate position information for each individual character relative to the anchor point
      positions = this.#glyphManager.getAtlas().positions;
    }

    getGlyphQuads(positionedGlyphs, positions, this.useBitmapFont).forEach(
      (quad, index, total) => {
        const rotation = quad.rotation;
        const tl = vec2.fromValues(quad.tl.x, quad.tl.y);
        const tr = vec2.fromValues(quad.tr.x, quad.tr.y);
        const bl = vec2.fromValues(quad.bl.x, quad.bl.y);
        const br = vec2.fromValues(quad.br.x, quad.br.y);

        if (rotation !== 0) {
          const width = quad.width;
          const height = quad.br.y - quad.tl.y;
          const center = vec2.fromValues(tl[0] + width / 2, tl[1] + height);

          rotateAroundOrigin(tl, rotation, center);
          rotateAroundOrigin(tr, rotation, center);
          rotateAroundOrigin(bl, rotation, center);
          rotateAroundOrigin(br, rotation, center);
        }

        // interleaved uv & offsets
        charUVOffsetBuffer.push(quad.tex.x, quad.tex.y, tl[0], tl[1]);
        charUVOffsetBuffer.push(
          quad.tex.x + quad.tex.w,
          quad.tex.y,
          tr[0],
          tr[1],
        );
        charUVOffsetBuffer.push(
          quad.tex.x + quad.tex.w,
          quad.tex.y + quad.tex.h,
          br[0],
          br[1],
        );
        charUVOffsetBuffer.push(
          quad.tex.x,
          quad.tex.y + quad.tex.h,
          bl[0],
          bl[1],
        );

        const zIndex =
          (object.globalRenderOrder + (1 / total.length) * index) /
          ZINDEX_FACTOR;
        charPositionsBuffer.push(
          x,
          y,
          zIndex,
          x,
          y,
          zIndex,
          x,
          y,
          zIndex,
          x,
          y,
          zIndex,
        );

        indexBuffer.push(0 + i, 2 + i, 1 + i);
        indexBuffer.push(2 + i, 0 + i, 3 + i);
        i += 4;
      },
    );

    return {
      indexBuffer,
      charUVOffsetBuffer,
      charPositionsBuffer,
      indicesOffset: i,
    };
  }
}
