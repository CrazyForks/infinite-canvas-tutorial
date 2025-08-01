---
outline: deep
description: 'Learn to draw complex paths and implement hand-drawn styles. Experiment with SDF for paths, use triangulation methods for fills, and create sketchy rendering effects with rough.js.'
head:
    - [
          'meta',
          {
              property: 'og:title',
              content: 'Lesson 13 - Drawing a Path & Hand Drawn Styles',
          },
      ]
---

<script setup>
import Holes from '../components/Holes.vue';
import FillRule from '../components/FillRule.vue';
</script>

# Lesson 13 - Drawing a Path & Hand Drawn Styles

In the previous lesson we introduced the drawing of a polyline, the stroke part of a Path can theoretically be converted to a polyline by sampling, [p5js - bezierDetail()] does this, but for a smooth effect you need to add more sampling points. But the fill part still needs to be implemented. We'll cover that in this lesson:

-   Experimenting with SDF
-   Trying to draw fills using some triangulating methods and strokes using polylines.
-   Draw some hand-drawn shapes

```js eval code=false
$icCanvas = call(() => {
    return document.createElement('ic-canvas-lesson13');
});
```

```js eval code=false inspector=false
call(() => {
    const {
        Canvas,
        Path,
        RoughCircle,
        RoughRect,
        deserializeNode,
        fromSVGElement,
        TesselationMethod,
    } = Lesson13;

    const stats = new Stats();
    stats.showPanel(0);
    const $stats = stats.dom;
    $stats.style.position = 'absolute';
    $stats.style.left = '0px';
    $stats.style.top = '0px';

    $icCanvas.parentElement.style.position = 'relative';
    $icCanvas.parentElement.appendChild($stats);

    $icCanvas.addEventListener('ic-ready', (e) => {
        const canvas = e.detail;

        const circle = new RoughCircle({
            cx: 600,
            cy: 100,
            r: 50,
            fill: 'black',
            strokeWidth: 2,
            stroke: 'red',
            fillStyle: 'zigzag',
        });
        canvas.appendChild(circle);

        const rect = new RoughRect({
            x: 550,
            y: 200,
            fill: 'black',
            strokeWidth: 2,
            stroke: 'red',
            fillStyle: 'dots',
        });
        rect.width = 100;
        rect.height = 50;
        canvas.appendChild(rect);

        fetch(
            '/Ghostscript_Tiger.svg',
            // '/photo-camera.svg',
        ).then(async (res) => {
            const svg = await res.text();
            const $container = document.createElement('div');
            $container.innerHTML = svg;
            const $svg = $container.children[0];
            for (const child of $svg.children) {
                const group = await deserializeNode(fromSVGElement(child));
                group.children.forEach((path) => {
                    path.cullable = false;
                });
                group.position.x = 100;
                group.position.y = 75;
                canvas.appendChild(group);

                const group2 = await deserializeNode(fromSVGElement(child));
                group2.children.forEach((path) => {
                    path.tessellationMethod = TesselationMethod.LIBTESS;
                    path.cullable = false;
                });
                group2.position.x = 300;
                group2.position.y = 75;
                canvas.appendChild(group2);
            }
        });
    });

    $icCanvas.addEventListener('ic-frame', (e) => {
        stats.update();
    });
});
```

## Some basic concepts {#basic-concepts}

### Differences with Polyline {#diff-with-polyline}

First of all, let's clarify the definition of [Paths] in SVG, especially the difference between it and `<polyline>` from MDN.

> The \<path\> element is the most powerful element in the SVG library of basic shapes. It can be used to create lines, curves, arcs, and more.
>
> While \<polyline\> and \<path\> elements can create similar-looking shapes, \<polyline\> elements require a lot of small straight lines to simulate curves and don't scale well to larger sizes.

Therefore, there is a lack of smoothing when the curve is represented by `<polyline>`, as shown in the figure below: [Draw arcs, arcs are not smooth ISSUE]

![polyline - not smooth arc](https://user-images.githubusercontent.com/89827437/191234694-5d5637f8-c59a-42a7-84ce-c319c470629f.png)

But using Path the other way around, it is possible to realize a line with something like `d=“M 100 100 L 200 200 L 200 100”`.

### SubPath {#subpath}

In addition to simple paths such as a line or curve, a single `<path>` can also contain a series of lines or curves, which can be called subpaths.

Each subpath begins with a moveto command, usually M or m, which tells the drawing tool to move to a new position in the coordinate system without drawing a line. This can be followed by a series of drawing commands, such as line segments (L or l), horizontal line segments (H or h), vertical line segments (V or v), curves (C, S, Q, T, etc.), and arcs (A or a).

## Using SDF {#sdf-path}

We've used SDF to draw Circle Ellipse and Rect before, can we do the same for Path?

It seems to work for simple paths, for example [Quadratic Bezier - distance 2D] on shadertoy as mentioned in the original author's PPT in the previous lesson, but it does work for individual Bezier curves, but it doesn't work for complex paths, and the performance can be affected by overly complex mathematical operations in the Fragment Shader. math in the Fragment Shader can also affect performance.

![SDF path](/sdf-line.png)

<iframe width="640" height="360" frameborder="0" src="https://www.shadertoy.com/embed/MlKcDD?gui=true&t=10&paused=true&muted=false" allowfullscreen></iframe>

### Path2D {#path2d}

Another idea is given by [svg-path-sdf] , and interestingly it is almost identical to the idea of drawing text that we will introduce later. there is an online example on OB: [SDF Points with regl]

![svg-path-sdf](https://github.com/dy/svg-path-sdf/raw/master/preview.png?raw=true)

The `fill()` and `stroke()` in the Canvas2D API can take [Path2D] as an argument, the latter can be created directly from SVG path definitions. The Canvas2D API is then used to generate an SDF to be passed as a texture, see [tiny-sdf] for details on how to do this, and we'll talk more about it later when we introduce text drawing.

```ts
// @see https://github.com/dy/svg-path-sdf/blob/master/index.js#L61C3-L63C31
var path2d = new Path2D(path);
ctx.fill(path2d);
ctx.stroke(path2d);

var data = bitmapSdf(ctx);
```

Of course, Path2D is a natively supported API for browser environments, so if you want to use it for server-side rendering, you'll need to use polyfill, as described in more detail here: [Support Path2D API]。

## Using mesh {#use-mesh}

So the usual way to triangulate a Path, either in 2D or 3D, is the following example from: [SVG loader in three.js]. The SVG text is first converted to a set of `ShapePath`s, then a set of `ShapeGeometry`s is created and rendered:

```ts
const shapes = SVGLoader.createShapes(path);
for (const shape of shapes) {
    const geometry = new THREE.ShapeGeometry(shape);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = renderOrder++;

    group.add(mesh);
}
```

Let's implement our own version below:

-   Normalize path definitions to absolute commands
-   Sampling on curves
-   Drawing strokes with Polyline
-   Use earcut and libtess triangulation to draw fills.

### Normalize to absolute commands {#convert-to-absolute-commands}

SVG path commands are both absolute and relative, e.g. `M 100 100 L 200 100` is equivalent to `M 100 100 l 100 0`. For ease of processing, we'll convert all relative commands to absolute first. For ease of processing, we first convert all relative commands to absolute commands, and the Canvas2D API also uses this style, similar to [lineTo], we refer to the [ShapePath] implementation of Three.js, which implements a series of [CanvasRenderingContext2D] methods such as `moveTo / lineTo / bezierCurveTo` and so on.

```ts
import { path2Absolute } from '@antv/util';

const path = new ShapePath();
const commands = path2Absolute(d);
commands.forEach((command) => {
    const type = command[0];
    const data = command.slice(1);
    switch (type) {
        case 'M':
            path.moveTo();
        case 'L':
            path.lineTo();
        //...
    }
});
```

Let's briefly introduce the methods provided by [ShapePath], which consists of a set of subPaths corresponding to multiple commands in the path definition. Take `moveTo` and `lineTo` for example, the former creates a new subPath and sets the starting point, the latter completes the line to the next point.

```ts
export class ShapePath {
    currentPath: Path | null;
    subPaths: Path[];

    moveTo(x: number, y: number) {
        this.currentPath = new Path();
        this.subPaths.push(this.currentPath);
        this.currentPath.moveTo(x, y);
        return this;
    }

    lineTo(x: number, y: number) {
        this.currentPath.lineTo(x, y);
        return this;
    }
}
```

Here's a look at the structure of each subPath.

```ts
export class Path extends CurvePath {}
```

### Sampling on a curve {#sample-on-curve}

Sample straight lines and bezier curves with different precision. This is understandable: for Bezier curves, the only way to make the line look smoother is to add more samples; for straight lines, there is no need to add any additional samples.

```ts
export class CurvePath extends Curve {
    getPoints(divisions = 12) {
        const resolution =
            curve instanceof EllipseCurve
                ? divisions * 2
                : curve instanceof LineCurve
                ? 1
                : divisions;
        const pts = curve.getPoints(resolution);
    }
}
```

Taking a third-order Bessel curve as an example, given the normalized `t`, the sampling points can be obtained by its definition: [Bézier_curve]

```ts
export class CubicBezierCurve extends Curve {
    getPoint(t: number) {
        const point = vec2.create();
        const { v0, v1, v2, v3 } = this;

        vec2.set(
            point,
            CubicBezier(t, v0[0], v1[0], v2[0], v3[0]),
            CubicBezier(t, v0[1], v1[1], v2[1], v3[1]),
        );

        return point;
    }
}
```

Here is an example of a circular Path with the following list of sampled vertices:

```js eval
points = call(() => {
    const { Path } = Lesson13;
    return new Path({
        d: 'M40,0A40,40 0 1,1 0,-40A40,40 0 0,1 40,0Z',
        fill: 'black',
        opacity: 0.5,
    }).points;
});
```

### Drawing strokes with polyline {#use-polyline-to-draw-stroke}

Now that we have all the sampled points on the subPath, we can draw fills and strokes, respectively. We'll get to the former in a moment, and the latter can be done directly using the Polyline implemented in the previous lesson, [polyline with multiple segments] which just so happens to support a range of subPaths.

```ts
SHAPE_DRAWCALL_CTORS.set(Path, [Mesh, SmoothPolyline]);
```

### Triangulation with earcut {#earcut}

![RTR 3rd - Tessellation](https://picx.zhimg.com/80/v2-f38400d225d0397f99563c96ce45053d_1440w.webp?source=d16d100b)

So how do you split a triangle? One common method is called `ear clipping`. A vertex is `ear` if the line connecting two of its neighboring vertices does not intersect any side of the polygon.
Let's take the left-hand side of the figure below as an example. Under this criterion, v2 v4 and v5 are `ear`. We then remove the found `ear` such as v4 and proceed to determine its neighbors v5 and v3, where v5 constitutes an `ear`. Eventually all `ear`s are removed, and the polygon is eventually split into triangles.

![RTR - 12.Polygonal Techniques - Ear clipping
](https://picx.zhimg.com/80/v2-7c2a99be56ca9e4af6269e2c070b853b_1440w.webp?source=d16d100b)

The detailed algorithm can be found in the paper: [Triangulation By Ear Clipping], while [earcut] provides a JS implementation:

```ts
function isEar(ear) {
    var a = ear.prev,
        b = ear,
        c = ear.next;

    if (area(a, b, c) >= 0) return false; // reflex, can't be an ear

    // now make sure we don't have other points inside the potential ear
    var p = ear.next.next;

    while (p !== ear.prev) {
        // If the poing is in triangle, it's not an ear.
        if (
            pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
            area(p.prev, p, p.next) >= 0
        )
            return false;
        p = p.next;
    }

    return true;
}
```

Triangulation is done using [earcut], which inputs the coordinates of the sampling points to get an index array, and even calculates the error. As you'll see later when comparing it to other triangulation methods, earcut greatly improves the speed of the calculation but loses some accuracy:

```ts
import earcut, { flatten, deviation } from 'earcut';

const { d } = path;
const { subPaths } = parsePath(d);
const points = subPaths
    .map((subPath) => subPath.getPoints().map((point) => [point[0], point[1]]))
    .flat(2); // [100, 100, 200, 200, 300, 100, 100, 100]

const { vertices, holes, dimensions } = flatten(points);
const indices = earcut(vertices, holes, dimensions); // [1, 3, 2]
const err = deviation(vertices, holes, dimensions, indices); // 0
```

We can then use `gl.drawElements()` or `passEncoder.drawIndexed()` to do the drawing. In the image below, the left Path is defined as follows. Comparing it to the circle on the right, which was drawn using SDF, you can see that the edges are not really smooth, and this is even more obvious when the camera zooms in:

```ts
const path = new Path({
    d: 'M40,0A40,40 0 1,1 0,-40A40,40 0 0,1 40,0Z',
    fill: 'black',
    opacity: 0.5,
});
```

```js eval code=false
$icCanvas2 = call(() => {
    return document.createElement('ic-canvas-lesson13');
});
```

```js eval code=false inspector=false
call(() => {
    const { Canvas, Path, Circle } = Lesson13;

    const stats = new Stats();
    stats.showPanel(0);
    const $stats = stats.dom;
    $stats.style.position = 'absolute';
    $stats.style.left = '0px';
    $stats.style.top = '0px';

    $icCanvas2.parentElement.style.position = 'relative';
    $icCanvas2.parentElement.appendChild($stats);

    $icCanvas2.addEventListener('ic-ready', (e) => {
        const canvas = e.detail;
        canvas.camera.zoom = 2;

        const path = new Path({
            d: 'M40,0A40,40 0 1,1 0,-40A40,40 0 0,1 40,0Z',
            fill: 'black',
            opacity: 0.5,
        });
        path.position.x = 100;
        path.position.y = 100;
        canvas.appendChild(path);

        const circle = new Circle({
            cx: 0,
            cy: 0,
            r: 40,
            fill: 'black',
            opacity: 0.5,
        });
        circle.position.x = 200;
        circle.position.y = 100;
        canvas.appendChild(circle);
    });

    $icCanvas2.addEventListener('ic-frame', (e) => {
        stats.update();
    });
});
```

I've found that many 2D rendering engines such as [vello] use [Ghostscript Tiger.svg] to test the rendering of the Path, as you can see in the example at the beginning of this article. But if you compare it to the original SVG (remember the export feature we implemented?, you'll see that it's in the top right corner of the canvas.), you'll see that something is missing.

### Other triangulation techniques {#other-tesselation-techniques}

Pixi.js uses [earcut] for triangulation of polygons. Other triangulation libraries include [cdt2d] and [libtess.js], the latter of which is less powerful but more accurate, especially for paths with a lot of `holes` and self-intersections. As [earcut] mentions in their documentation, see: [Ability to substitute earcut for libtess.js for a given Graphics object]：

> If you want to get correct triangulation even on very bad data with lots of self-intersections and earcut is not precise enough, take a look at libtess.js.

The effect of earcut and [libtess.js] is compared in [Polygon Tesselation]. Unlike earcut, which returns an array of indices, libtess.js returns an array of vertices, as shown in the example in the repository. This means that we need to generate the index array manually, but of course this is very simple: since we don't need to think about reusing vertices, we can just use an incremental array starting from `0`.

```ts
export function triangulate(contours: [number, number][][]) {
    tessy.gluTessNormal(0, 0, 1);

    const triangleVerts = [];
    tessy.gluTessBeginPolygon(triangleVerts);
    // Omit...
    return triangleVerts;
}

triangulate(points); // [100, 0, 0, 100, 0, 0, 0, 100, 100, 0, 100, 100]
// indices: [0, 1, 2, 3, 4, 5]
```

You can go back to the “two tigers” example at the beginning of the article and compare it to the one generated with earcut on the left and libtess.js on the right. We've added a `tessellationMethod` attribute to Path to switch between the two methods of triangulation:

```ts
export enum TesselationMethod {
    EARCUT,
    LIBTESS,
}
export interface PathAttributes extends ShapeAttributes {
    tessellationMethod?: TesselationMethod;
}
```

### Draw holes {#draw-holes}

In SVG, holes can be defined with a different clockwise direction than the outline. For example, in the path below, the outline is clockwise `M0 0 L100 0 L100 100 L0 100 Z`, and the two subsequent holes are counterclockwise:

```bash
M0 0 L100 0 L100 100 L0 100 Z M50 50 L50 75 L75 75 L75 50 Z M25 25 L25
```

You can also reverse the clockwise direction in your definition, for example: [Draw a hollow circle in SVG]. The key is that the hole's direction should be opposite to the outline's direction.

<Holes />

### Fill rule {#fill-rule}

The [fill-rule] in SVG is used to determine the fill area of a Path. In the example below, the left one uses nonzero rule, while the right one uses evenodd rule.

<FillRule />

Taking a point in the center hollow area as an example, the ray intersects with the shape an even number of times, therefore it is determined to be outside the shape and does not need to be filled. See details at [how does fill-rule="evenodd" work on a star SVG]。

![fill-rule evenodd](/fill-rule-evenodd.png)

Since earcut doesn't support self-intersecting paths, we use libtess.js for path triangulation.

```ts
tessy.gluTessProperty(
    libtess.gluEnum.GLU_TESS_WINDING_RULE,
    fillRule === 'evenodd'
        ? libtess.windingRule.GLU_TESS_WINDING_ODD
        : libtess.windingRule.GLU_TESS_WINDING_NONZERO,
);
```

## Bounding box and picking {#bounding-box-picking}

The bounding box can be estimated in the same way as in the previous lesson for polyline. We focus on the implementation of how to determine if a point is inside a Path.

### Use native methods {#native-methods}

CanvasRenderingContext2D provides two out-of-the-box methods, [isPointInPath] and [isPointInStroke], which can be easily used in conjunction with [Path2D], which we introduced earlier.

```ts
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const isPointInPath = ctx.isPointInPath(new Path2D(d), x, y);
```

We introduced [OffscreenCanvas] earlier, and it's particularly good for calculations like picking decisions that are unrelated to the main thread's rendering task. We do the initialization in [PickingPlugin], and then pass in `containsPoint` to be called on demand for specific graphics:

```ts
export class Picker implements Plugin {
    private ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

    private hitTest(shape: Shape, wx: number, wy: number): boolean {
        if (shape.hitArea || shape.renderable) {
            shape.worldTransform.applyInverse(
                { x: wx, y: wy },
                tempLocalPosition,
            );
            const { x, y } = tempLocalPosition;

            return shape.containsPoint(x, y); // [!code --]
            return shape.containsPoint(x, y, this.ctx); // [!code ++]
        }

        return false;
    }
}
```

### Geometry method {#geometry-method}

Each subPath of a Path can perform geometric operations on its position in relation to a point. For example, Pixi.js implements [GraphicsContext - containsPoint], read more about it.

## Hand-drawn style drawing {#hand-drawn-style-drawing}

[excalidraw] uses [rough] for hand-drawn style drawing. We don't need the actual Canvas2D or SVG based drawing functionality that rough provides by default, so using [RoughGenerator] is a better choice.

![rough.js](https://camo.githubusercontent.com/5d90838c20ae2cab9f295e3dd812800285c42e82d04787883c9d5acecaec85ed/68747470733a2f2f726f7567686a732e636f6d2f696d616765732f6361705f64656d6f2e706e67)

### Generate hand-drawn path definitions {#generate-rough-path-definitions}

RoughGenerator provides generation methods for common shapes, using rectangles as an example:

```ts
const generator = rough.generator();
const rect = generator.rectangle(0, 0, 100, 100);
```

It generates a set of subPath-like structures for us based on the input parameters, called OpSet, which contains the `move` `lineTo` and `bcurveTo` operators. We can easily convert this to a command with an absolute path, then sample it and continue drawing with Polyline!

```ts
import { AbsoluteArray } from '@antv/util';
import { OpSet } from 'roughjs/bin/core';

export function opSet2Absolute(set: OpSet) {
    const array = [];
    set.ops.forEach(({ op, data }) => {
        if (op === 'move') {
            array.push(['M', data[0], data[1]]);
        } else if (op === 'lineTo') {
            array.push(['L', data[0], data[1]]);
        } else if (op === 'bcurveTo') {
            array.push([
                'C',
                data[0],
                data[1],
                data[2],
                data[3],
                data[4],
                data[5],
            ]);
        }
    });
    return array as AbsoluteArray;
}
```

### Rough Mixin {rough-mixin}

We would like to reuse the non-hand-drawn version for these functions of the envelope box calculation and pickup for the following reasons:

-   This stylized rendering should only affect the rendering effect, it does not change its physical properties.
-   A hand-drawn graphic actually consists of several sets of Paths, so it is a waste of performance to calculate the bounding box exactly.
-   When picking up, it should be taken as a whole, and judging by the Paths will give wrong results, e.g. if the mouse is hovering inside the graphic, but is in the empty space between the lines, and thus is not inside the graphic.
    So we create a new Mixin with all the parameters supported by rough such as `seed` `roughness` etc. and redraw it as soon as these parameters change:

```ts
import { Drawable, Options } from 'roughjs/bin/core';
import { GConstructor } from '.';
import { parsePath } from '../../utils';

export interface IRough
    extends Omit<Options, 'stroke' | 'fill' | 'strokeWidth'> {
    /**
     * @see https://github.com/rough-stuff/rough/wiki#roughness
     */
    roughness: Options['roughness'];
}
export function Rough<TBase extends GConstructor>(Base: TBase) {
    abstract class Rough extends Base implements IRough {
        get roughness() {
            return this.#roughness;
        }
        set roughness(roughness: number) {
            if (this.#roughness !== roughness) {
                this.#roughness = roughness;
                this.renderDirtyFlag = true;
                this.generate();
            }
        }
    }
}
```

This way we can get hand-drawn effects by wrapping our already supported shapes in it. The way to use it is as follows, taking RoughRect as an example, which inherits from Rect:

```ts
import { RectWrapper, RectAttributes } from './Rect';

export class RoughRect extends Rough(RectWrapper(Shape)) {}
```

### fillStyle solid {#fill-style-solid}

To support the `fillStyle = 'solid'` case:

```ts
SHAPE_DRAWCALL_CTORS.set(RoughRect, [
    ShadowRect,
    Mesh, // fillStyle === 'solid' // [!code ++]
    SmoothPolyline, // fill
    SmoothPolyline, // stroke
]);
```

```js eval code=false
$icCanvas3 = call(() => {
    return document.createElement('ic-canvas-lesson13');
});
```

```js eval code=false inspector=false
call(() => {
    const { Canvas, RoughCircle } = Lesson13;

    const stats = new Stats();
    stats.showPanel(0);
    const $stats = stats.dom;
    $stats.style.position = 'absolute';
    $stats.style.left = '0px';
    $stats.style.top = '0px';

    $icCanvas3.parentElement.style.position = 'relative';
    $icCanvas3.parentElement.appendChild($stats);

    const circle1 = new RoughCircle({
        cx: 100,
        cy: 100,
        r: 50,
        fill: 'black',
        strokeWidth: 2,
        stroke: 'red',
        fillStyle: 'dots',
    });

    const circle2 = new RoughCircle({
        cx: 200,
        cy: 100,
        r: 50,
        fill: 'black',
        strokeWidth: 2,
        stroke: 'red',
        fillStyle: 'hachure',
    });

    const circle3 = new RoughCircle({
        cx: 300,
        cy: 100,
        r: 50,
        fill: 'black',
        strokeWidth: 2,
        stroke: 'red',
        fillStyle: 'zigzag',
    });

    const circle4 = new RoughCircle({
        cx: 400,
        cy: 100,
        r: 50,
        fill: 'black',
        strokeWidth: 2,
        stroke: 'red',
        fillStyle: 'cross-hatch',
    });

    const circle5 = new RoughCircle({
        cx: 500,
        cy: 100,
        r: 50,
        fill: 'black',
        strokeWidth: 2,
        stroke: 'red',
        fillStyle: 'solid',
    });

    const circle6 = new RoughCircle({
        cx: 100,
        cy: 200,
        r: 50,
        fill: 'black',
        strokeWidth: 2,
        stroke: 'red',
        fillStyle: 'dashed',
    });

    const circle7 = new RoughCircle({
        cx: 200,
        cy: 200,
        r: 50,
        fill: 'black',
        strokeWidth: 2,
        stroke: 'red',
        fillStyle: 'zigzag-line',
    });

    $icCanvas3.addEventListener('ic-ready', (e) => {
        const canvas = e.detail;

        canvas.appendChild(circle1);
        canvas.appendChild(circle2);
        canvas.appendChild(circle3);
        canvas.appendChild(circle4);
        canvas.appendChild(circle5);
        canvas.appendChild(circle6);
        canvas.appendChild(circle7);
    });

    $icCanvas3.addEventListener('ic-frame', (e) => {
        stats.update();
    });
});
```

### Export SVG {#export-svg}

As you can see the graphics generated by rough are made up of a set of Paths. Therefore you need to use `<path>` when exporting to SVG. You can try exporting in the example above:

```ts
export function exportRough(
    node: SerializedNode,
    $g: SVGElement,
    doc: Document,
) {
    const {
        attributes: { drawableSets, stroke, fill },
    } = node;

    drawableSets.forEach((drawableSet) => {
        const { type } = drawableSet;
        const commands = opSet2Absolute(drawableSet);
        const d = path2String(commands, 2); // retain two decimal places
        const $path = createSVGElement('path', doc);
        $path.setAttribute('d', d);
        $g.appendChild($path);
        if (type === 'fillSketch') {
            $path.setAttribute('stroke', fill as string);
            $path.setAttribute('fill', 'none');
        }
    });
}
```

## Extended reading {#extended-reading}

-   [Rendering SVG Paths in WebGL]
-   [Shaping Curves with Parametric Equations]
-   [WebGL 3D Geometry - Lathe]
-   [Fun with WebGL 2.0 : 027 : Bezier Curves in 3D]
-   [GPU-accelerated Path Rendering]

[Paths]: https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths
[Quadratic Bezier - distance 2D]: https://www.shadertoy.com/view/MlKcDD
[Path2D]: https://developer.mozilla.org/en-US/docs/Web/API/Path2D
[svg-path-sdf]: https://github.com/dy/svg-path-sdf/
[SDF Points with regl]: https://observablehq.com/@rreusser/sdf-points-with-regl
[WebGL 3D Geometry - Lathe]: https://webglfundamentals.org/webgl/lessons/webgl-3d-geometry-lathe.html
[Fun with WebGL 2.0 : 027 : Bezier Curves in 3D]: https://www.youtube.com/watch?v=s3k8Od9lZBE
[Shaping Curves with Parametric Equations]: https://mattdesl.svbtle.com/shaping-curves-with-parametric-equations
[Rendering SVG Paths in WebGL]: https://css-tricks.com/rendering-svg-paths-in-webgl/
[GPU-accelerated Path Rendering]: https://developer.download.nvidia.com/devzone/devcenter/gamegraphics/files/opengl/gpupathrender.pdf
[p5js - bezierDetail()]: https://p5js.org/reference/p5/bezierDetail/
[rough]: https://github.com/rough-stuff/rough
[excalidraw]: https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/scene/ShapeCache.ts#L2
[Draw arcs, arcs are not smooth ISSUE]: https://github.com/pixijs/graphics-smooth/issues/23
[SVG loader in three.js]: https://github.com/mrdoob/three.js/blob/dev/examples/webgl_loader_svg.html#L156
[earcut]: https://github.com/mapbox/earcut
[cdt2d]: https://github.com/mikolalysenko/cdt2d
[libtess.js]: https://github.com/brendankenny/libtess.js
[Ability to substitute earcut for libtess.js for a given Graphics object]: https://github.com/pixijs/pixijs/issues/4151
[lineTo]: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineTo
[Support Path2D API]: https://github.com/Automattic/node-canvas/issues/1116
[tiny-sdf]: https://github.com/mapbox/tiny-sdf
[ShapePath]: https://github.com/mrdoob/three.js/blob/dev/src/extras/core/ShapePath.js
[CanvasRenderingContext2D]: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
[Bézier_curve]: https://en.wikipedia.org/wiki/B%C3%A9zier_curve
[Ghostscript Tiger.svg]: https://en.m.wikipedia.org/wiki/File:Ghostscript_Tiger.svg
[vello]: https://github.com/linebender/vello
[Polygon Tesselation]: https://andrewmarsh.com/software/tesselation-web/
[polyline with multiple segments]: /guide/lesson-012#polyline-with-multiple-segments
[RoughGenerator]: https://github.com/rough-stuff/rough/wiki/RoughGenerator
[isPointInPath]: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/isPointInPath
[isPointInStroke]: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/isPointInStroke
[GraphicsContext - containsPoint]: https://github.com/pixijs/pixijs/blob/dev/src/scene/graphics/shared/GraphicsContext.ts#L1072
[OffscreenCanvas]: /guide/lesson-011#offscreen-canvas
[PickingPlugin]: /guide/lesson-006#picking-plugin
[Draw a hollow circle in SVG]: https://stackoverflow.com/questions/8193675/draw-a-hollow-circle-in-svg
[fill-rule]: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/fill-rule
[how does fill-rule="evenodd" work on a star SVG]: https://stackoverflow.com/a/46145333/4639324
[Triangulation By Ear Clipping]: https://www.geometrictools.com/Documentation/TriangulationByEarClipping.pdf
