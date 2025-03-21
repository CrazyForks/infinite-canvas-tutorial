---
outline: deep
publish: false
---

<script setup>
import WebFontLoader from '../components/WebFontLoader.vue';
import Opentype from '../components/Opentype.vue';
import Harfbuzz from '../components/Harfbuzz.vue';
import TeXMath from '../components/TeXMath.vue';
import TextDropShadow from '../components/TextDropShadow.vue';
import PhysicalText from '../components/PhysicalText.vue';
</script>

# Lesson 16 - Advanced Text Features

In the previous lesson, we introduced the principles of SDF-based text rendering, experimented with ESDT and MSDF to improve rendering quality, and mentioned the advanced text rendering features that CanvasKit provides compared to Canvas.

In this lesson, we'll first look at rendering methods beyond SDF, then discuss and try to implement features like: decorative lines, shadows, text following paths. Finally, text should not only be renderable but also have good interaction - we'll discuss topics like input boxes, text selection, and A11y.

Let's first look at what text rendering methods are available besides SDF.

## Rendering Text with Bezier Curves {#render-text-with-bezier-curve}

Using Figma's SVG export feature, you can see that its text is also rendered using Paths. If we don't consider rendering performance and CJK characters, using Bezier curves to render text is indeed a good choice. To obtain vector information for characters in a browser environment, we can use:

-   [opentype.js]
-   use-gpu uses [use-gpu-text] which is wrapped based on [ab-glyph](https://github.com/alexheretic/ab-glyph)
-   More and more applications are using [harfbuzzjs], see: [State of Text Rendering 2024]. For example, [font-mesh-pipeline] is a simple demonstration

Below we'll show examples of rendering text using opentype.js and harfbuzzjs, both of which support the `ttf` font format.

### opentype.js {#opentypejs}

opentype.js provides the `getPath` method, which completes Shaping and obtains SVG [path-commands] given text content, position, and font size.

```ts
opentype.load('fonts/Roboto-Black.ttf', function (err, font) {
    const path = font.getPath('Hello, World!', 0, 0, 32); // x, y, fontSize
    // convert to svg path definition
});
```

<Opentype />

### harfbuzzjs {#harfbuzzjs}

First initialize harfbuzzjs WASM using Vite's ?init syntax. Then load the font file and create a font object.

```ts
import init from 'harfbuzzjs/hb.wasm?init';
import hbjs from 'harfbuzzjs/hbjs.js';

const instance = await init();
hb = hbjs(instance);

const data = await (
    await window.fetch('/fonts/NotoSans-Regular.ttf')
).arrayBuffer();
blob = hb.createBlob(data);
face = hb.createFace(blob, 0);
font = hb.createFont(face);
font.setScale(32, 32); // Set font size
```

Then create a buffer object and add text content. As mentioned before, harfbuzz doesn't handle BiDi, so we need to manually set the text direction. Finally, call hb.shape method to perform Shaping calculation.

```ts
buffer = hb.createBuffer();
buffer.addText('Hello, world!');
buffer.guessSegmentProperties();
// TODO: use BiDi
// buffer.setDirection(segment.direction);

hb.shape(font, buffer);
const result = buffer.json(font);
```

Now we have the glyph data, and we can use Path to draw it

```ts
result.forEach(function (x) {
    const d = font.glyphToPath(x.g);
    const path = new Path({
        d,
        fill: '#F67676',
    });
});
```

<Harfbuzz />

### TeX math rendering {#tex-math-rendering}

We can use [MathJax] to render TeX mathematical formulas, convert them to SVG, and then render them using Path. Here we follow the approach from [LaTeX in motion-canvas] to get SVGElement:

```ts
const JaxDocument = mathjax.document('', {
    InputJax: new TeX({ packages: AllPackages }),
    OutputJax: new SVG({ fontCache: 'local' }),
});

const svg = Adaptor.innerHTML(JaxDocument.convert(formula));
const parser = new DOMParser();
const doc = parser.parseFromString(svg, 'image/svg+xml');
const $svg = doc.documentElement;
```

Then use the method introduced in [Lesson 10 - From SVGElement to Serialized Node] to convert SVGElement to graphics and add them to the canvas.

```ts
const root = await deserializeNode(fromSVGElement($svg));
```

<TeXMath />

## Text Decoration {#text-decoration}

[text-decoration]

## Shadows {#dropshadow}

Pixi.js provides [DropShadowFilter], but we can implement it directly in SDF without using post-processing. Use `shadowOffset` and `shadowBlurRadius` to control the offset and blurring of the SDF texture.

```glsl
// @see https://github.com/soimy/pixi-msdf-text/blob/master/src/msdf.frag#L49
vec3 shadowSample = texture2D(uSampler, vTextureCoord - shadowOffset).rgb;
float shadowDist = median(shadowSample.r, shadowSample.g, shadowSample.b);
float distAlpha = smoothstep(0.5 - shadowSmoothing, 0.5 + shadowSmoothing, shadowDist);
vec4 shadow = vec4(shadowColor, shadowAlpha * distAlpha);
gl_FragColor = mix(shadow, text, text.a);
```

<TextDropShadow />

## Text Along Path {#text-along-path}

In the Figma community, many users are looking forward to this feature, for example: [Make text follow a path or a circle]

In SVG, this can be achieved through [textPath], see: [Curved Text Along a Path]

```html
<path
    id="curve"
    d="M73.2,148.6c4-6.1,65.5-96.8,178.6-95.6c111.3,1.2,170.8,90.3,175.1,97"
/>
<text width="500">
    <textPath xlink:href="#curve"> Dangerous Curves Ahead </textPath>
</text>
```

Skia provides the `MakeOnPath` method, see [Draw text along a path]:

```ts
const textblob = CanvasKit.TextBlob.MakeOnPath(text, skPath, skFont);
canvas.drawTextBlob(textblob, 0, 0, textPaint);
```

In Mapbox, placing labels along roads and rivers is a common scenario, see [Map Label Placement in Mapbox GL]

![Map Label Placement in Mapbox GL](https://miro.medium.com/v2/resize:fit:480/format:webp/0*qVAASwC-tjIXnjax.gif)

Kittl provides a [Easily Type Text On Any Path] tool.

## More Friendly Interaction {#more-friendly-interaction}

### Text Input {#textarea}

Currently, we've only implemented text rendering, but in actual applications, text input boxes are essential. The image below is from Figma

![textarea in figma](/textarea-in-figma.png)

### Text Selection {#text-selection}

## Special Effects {#special-effects}

### Loading Web Fonts {#load-web-font}

For solutions using Canvas2D API to generate SDF, just use [webfontloader] to load fonts first, then specify the font using `fontFamily`.

```ts
import WebFont from 'webfontloader';
WebFont.load({
    google: {
        families: ['Gaegu'], // specify font
    },
    active: () => {
        const text = new Text({
            x: 150,
            y: 150,
            content: 'Hello, world',
            fontFamily: 'Gaegu', // specify font
            fontSize: 55,
            fill: '#F67676',
        });
    },
});
```

<WebFontLoader />

### Material Design on the GPU {#material-design-on-the-gpu}

[Material Design on the GPU] introduce a material effect based on SDF text, using normal maps and lighting to simulate ink spreading on paper. We don't need to consider lighting, just use simplex noise to implement it, and add multiple absorption effects:

```js
import { simplex_2d } from './simplex-2d';
import { aastep } from './aastep';
export const absorb = /* wgsl */ `
  ${aastep}
  ${simplex_2d}
  float absorb(float sdf, vec2 uv, float scale, float falloff) {
    float distort = sdf + snoise(uv * scale) * falloff;
    return aastep(0.5, distort);
  }
`;
```

<PhysicalText />

## Extended Reading {#extended-reading}

-   [Material Design on the GPU]
-   [Make text follow a path or a circle]
-   [Curved Text Along a Path]
-   [Draw text along a path]
-   [textPath]
-   [Map Label Placement in Mapbox GL]

[Material Design on the GPU]: https://mattdesl.svbtle.com/material-design-on-the-gpu
[Make text follow a path or a circle]: https://forum.figma.com/t/make-text-follow-a-path-or-a-circle/23476/34
[Curved Text Along a Path]: https://css-tricks.com/snippets/svg/curved-text-along-path/
[Draw text along a path]: https://fiddle.skia.org/c/@Canvas_drawTextRSXform
[textPath]: https://developer.mozilla.org/en-US/docs/Web/SVG/Element/textPath
[Map Label Placement in Mapbox GL]: https://blog.mapbox.com/map-label-placement-in-mapbox-gl-c6f843a7caaa
[font-mesh-pipeline]: https://github.com/beanandbean/font-mesh-pipeline
[opentype.js]: https://github.com/opentypejs/opentype.js
[use-gpu-text]: https://gitlab.com/unconed/use.gpu/-/tree/master/rust/use-gpu-text
[harfbuzzjs]: https://github.com/harfbuzz/harfbuzzjs
[State of Text Rendering 2024]: https://behdad.org/text2024/
[webfontloader]: https://github.com/typekit/webfontloader
[DropShadowFilter]: https://pixijs.io/filters/docs/DropShadowFilter.html
[MathJax]: https://github.com/mathjax/MathJax-src
[LaTeX in motion-canvas]: https://github.com/motion-canvas/motion-canvas/issues/190
[Lesson 10 - From SVGElement to Serialized Node]: /guide/lesson-010#svgelement-to-serialized-node
[path-commands]: https://github.com/opentypejs/opentype.js?tab=readme-ov-file#path-commands
[shadowBlur]: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/shadowBlur
[text-decoration]: https://developer.mozilla.org/en-US/docs/Web/CSS/text-decoration
[Easily Type Text On Any Path]: https://www.kittl.com/article/easily-type-text-on-any-path
