---
outline: deep
description: 'Draw rectangle mode. Implementation of brush features, including line drawing algorithms to eliminate jitter and silky smooth drawing experience. Learn the implementation principles and optimization techniques of brush libraries such as p5.brush.'
head:
    - [
          'meta',
          {
              property: 'og:title',
              content: 'Lesson 25 - Drawing mode and brush',
          },
      ]
---

<script setup>
import DrawRect from '../components/DrawRect.vue'
import Pencil from '../components/Pencil.vue'
</script>

# Lesson 25 - Drawing mode and brush

在 [Lesson 14 - Canvas mode and auxiliary UI] 中我们介绍了手型和选择模式，在本节课中我们将介绍绘制模式：包括矩形和椭圆，以及更加自由的笔刷模式。

## Draw rect mode {#draw-rect-mode}

<DrawRect />

First add the following canvas mode. The implementation of drawing ellipses is almost identical, so I won't repeat the introduction:

```ts
export enum Pen {
    HAND = 'hand',
    SELECT = 'select',
    DRAW_RECT = 'draw-rect', // [!code ++]
    DRAW_Ellipse = 'draw-ellipse', // [!code ++]
}
```

In [Lesson 18 - Refactor with ECS] we introduced the ECS architecture, where a `DrawRect` System is created, and once in that mode, the cursor style is set to `crosshair`:

```ts
import { System } from '@lastolivegames/becsy';

export class DrawRect extends System {
    execute() {
        if (pen !== Pen.DRAW_RECT) {
            return;
        }

        const input = canvas.write(Input);
        const cursor = canvas.write(Cursor);

        cursor.value = 'crosshair';
        //...
    }
}
```

Then as the mouse is dragged, the rectangle is continually redrawn in the target area, similar to the box selection effect in selection mode. When the mouse is lifted to complete the creation of the rectangle, it switches from draw rectangle mode to selection mode:

```ts
export class DrawRect extends System {
    execute() {
        //...
        // Draw rect brush when dragging
        this.handleBrushing(api, x, y);

        if (input.pointerUpTrigger) {
            // Create rect when pointerup event triggered
            const node: RectSerializedNode = {
                id: uuidv4(),
                type: 'rect', // Change to 'ellipse' in draw-ellipse mode
                x,
                y,
                width,
                height,
            };
            api.setPen(Pen.SELECT); // Switch canvas mode
            api.updateNode(node);
            api.record(); // Save to history
        }
    }
}
```

Next we look at what happens during the drag and drop process.

### Redraw rect {#redraw-rect}

Similar to box selection, in order to avoid dragging a small distance and starting to draw, we need to set a threshold, calculated in the Viewport coordinate system:

```ts
handleBrushing(api: API, viewportX: number, viewportY: number) {
    const camera = api.getCamera();
    const {
        pointerDownViewportX,
        pointerDownViewportY,
    } = camera.read(ComputedCameraControl);

    // Use a threshold to avoid showing the selection brush when the pointer is moved a little.
    const shouldShowSelectionBrush =
        distanceBetweenPoints(
            viewportX,
            viewportY,
            pointerDownViewportX,
            pointerDownViewportY,
        ) > 10;
}
```

The `x/y` coordinates of the auxiliary rectangle are where the `pointerdown` was triggered, and the coordinates of the `pointermove` event object need to be converted to the Canvas coordinate system to compute the width and height:

```ts
const { x: cx, y: cy } = api.viewport2Canvas({
    x: viewportX,
    y: viewportY,
});

let x = pointerDownCanvasX;
let y = pointerDownCanvasY;
let width = cx - x;
let height = cy - y;

api.updateNode(
    selection.brush,
    {
        visibility: 'visible',
        x,
        y,
        width,
        height,
    },
    false,
);
```

It is worth to consider the scenario of reverse dragging, where the calculated `width/height` may be negative, and the corresponding `x/y` will no longer be at the position of the `pointerdown` and will have to be recalculated. Figma does the same:

```ts
if (width < 0) {
    x += width;
    width = -width;
}
if (height < 0) {
    y += height;
    height = -height;
}
```

### Size label {#size-label}

We want to show the dimensions of the rectangle in real time during the drawing process, like Figma does:

![Size label in Figma](/figma-size-label.png)

## Brush mode {#brush-mode}

You can select this sub-tool when you enter Paint mode in Photoshop Web and draw strokes by dragging and dropping continuously:

![Brush mode in Photoshop Web](/photoshopweb-brush-mode.png)

In Figma: [Draw with illustration tools].

### Pencil tool {#pencil-tool}

Let's start by looking at the simplest implementation, using a folded line display, called a Pencil in Figma.

In order to minimize the number of vertices generated by dragging and dropping, and especially the number of duplicated vertices or vertices in close proximity to each other, we will simplify the polyline using the method described in [Lesson 12 - Simplify polyline], by choosing the [simplify-js] implementation. It is worth noting the definition of the `tolerance` parameter, which affects the degree of simplification:

> Affects the amount of simplification (in the same metric as the point coordinates).

We want to set the `tolerance` differently depending on the current camera zoom level, otherwise the jitter caused by oversimplification at high zoom levels will be easily visible:

![Over simplified polyline in 4x zoom level](/over-simplified-polyline.gif)

```ts
import simplify from 'simplify-js';

// choose tolerance based on the camera zoom level
const tolerance = 1 / zoom;
selection.points = simplify(selection.pointsBeforeSimplify, tolerance);
```

<Pencil />

## Extended reading {#extended-reading}

-   [Draw with illustration tools]
-   [p5.brush]
-   [Real-Time Paint System with WebGL]
-   [简简单单实现画笔工具，轻松绘制丝滑曲线]

[Lesson 14 - Canvas mode and auxiliary UI]: /guide/lesson-014
[Lesson 18 - Refactor with ECS]: /guide/lesson-018
[Draw with illustration tools]: https://help.figma.com/hc/en-us/articles/31440438150935-Draw-with-illustration-tools
[p5.brush]: https://github.com/acamposuribe/p5.brush
[Real-Time Paint System with WebGL]: https://chrisarasin.com/paint-system-webgl
[简简单单实现画笔工具，轻松绘制丝滑曲线]: https://zhuanlan.zhihu.com/p/701668081
[Lesson 12 - Simplify polyline]: /guide/lesson-012#simplify-polyline
