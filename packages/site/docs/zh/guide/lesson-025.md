---
outline: deep
description: '绘制矩形模式。实现画笔功能，包括画线消抖动算法和丝滑绘制体验。学习p5.brush等画笔库的实现原理和优化技术。'
head:
    - ['meta', { property: 'og:title', content: '课程 25 - 绘制模式与笔刷' }]
---

<script setup>
import DrawRect from '../../components/DrawRect.vue'
import Pencil from '../../components/Pencil.vue'
</script>

# 课程 25 - 绘制模式与笔刷

在 [课程 14 - 画布模式] 中我们介绍了手型和选择模式，在本节课中我们将介绍绘制模式：包括矩形和椭圆，以及更加自由的笔刷模式。

## 矩形绘制模式 {#draw-rect-mode}

<DrawRect />

首先增加以下模式，绘制椭圆的实现几乎一致，就不重复介绍了：

```ts
export enum Pen {
    HAND = 'hand',
    SELECT = 'select',
    DRAW_RECT = 'draw-rect', // [!code ++]
    DRAW_Ellipse = 'draw-ellipse', // [!code ++]
}
```

在 [课程 18 - 使用 ECS 重构] 中我们介绍了 ECS 架构，这里创建一个 `DrawRect` 的 System，一旦进入该模式，就将鼠标样式设置为 `crosshair`：

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

然后随着鼠标拖拽，在目标区域不断重绘矩形，类似选择模式中的框选效果。当鼠标抬起完成矩形的创建，从绘制矩形模式切换到选择模式：

```ts
export class DrawRect extends System {
    execute() {
        //...
        // 拖拽，绘制辅助 UI
        this.handleBrushing(api, x, y);

        if (input.pointerUpTrigger) {
            // 鼠标抬起，创建矩形
            const node: RectSerializedNode = {
                id: uuidv4(),
                type: 'rect', // 椭圆绘制模式下改成 'ellipse' 即可
                x,
                y,
                width,
                height,
            };
            api.setPen(Pen.SELECT); // 模式切换
            api.updateNode(node);
            api.record(); // 保存历史记录
        }
    }
}
```

接下来我们来看在拖拽过程中发生了什么。

### 重绘辅助矩形 {#redraw-rect}

和框选类似，为了避免拖拽一小段距离就开始绘制，我们需要设置一段阈值，在 Viewport 坐标系下计算：

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

辅助矩形的位置坐标 `x/y` 就是 `pointerdown` 触发时的位置，接下来也需要将 `pointermove` 事件对象的坐标转换到 Canvas 坐标系下计算此时的宽高：

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

值得一提的是需要考虑反向拖拽的场景，此时计算出的 `width/height` 可能为负数，相应的 `x/y` 就不再是 `pointerdown` 时的位置，需要重新计算。Figma 也是这么做的：

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

### 绘制尺寸标签 {#size-label}

我们希望在绘制过程中实时展示矩形的尺寸，就像 Figma 这样：

![Size label in Figma](/figma-size-label.png)

## 笔刷模式 {#brush-mode}

在 Photoshop Web 中进入 Paint 模式后可以选择这个子工具，通过连续拖拽绘制笔迹：

![Brush mode in Photoshop Web](/photoshopweb-brush-mode.png)

在 Figma 中称作 [Draw with illustration tools]。

### 铅笔工具 {#pencil-tool}

首先我们先来看最简单的一种实现，使用折线展示，在 Figma 中称作 Pencil。

为了尽可能减少拖拽过程中产生的顶点，尤其是大量重复的、或者距离较近的顶点，我们使用 [课程 12 - 简化折线的顶点] 中介绍的方法对折线进行简化，选择[simplify-js] 实现。值得注意的是 `tolerance` 这个参数的定义，它会影响简化程度：

> Affects the amount of simplification (in the same metric as the point coordinates).

我们希望根据当前的相机缩放等级设置不同的 `tolerance`，否则在高缩放等级下过度简化造成的抖动会被很容易看出来：

![Over simplified polyline in 4x zoom level](/over-simplified-polyline.gif)

```ts
import simplify from 'simplify-js';

// choose tolerance based on the camera zoom level
const tolerance = 1 / zoom;
selection.points = simplify(selection.pointsBeforeSimplify, tolerance);
```

<Pencil />

## 扩展阅读 {#extended-reading}

-   [Draw with illustration tools]
-   [p5.brush]
-   [Real-Time Paint System with WebGL]
-   [简简单单实现画笔工具，轻松绘制丝滑曲线]

[课程 14 - 画布模式]: /zh/guide/lesson-014
[课程 18 - 使用 ECS 重构]: /zh/guide/lesson-018
[Draw with illustration tools]: https://help.figma.com/hc/en-us/articles/31440438150935-Draw-with-illustration-tools
[p5.brush]: https://github.com/acamposuribe/p5.brush
[Real-Time Paint System with WebGL]: https://chrisarasin.com/paint-system-webgl
[简简单单实现画笔工具，轻松绘制丝滑曲线]: https://zhuanlan.zhihu.com/p/701668081
[课程 12 - 简化折线的顶点]: /zh/guide/lesson-012#simplify-polyline
[simplify-js]: https://github.com/mourner/simplify-js
