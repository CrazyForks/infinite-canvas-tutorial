import _gl from 'gl';
import { NodeJSAdapter } from '../utils';
import '../useSnapshotMatchers';
import {
  Canvas,
  DOMAdapter,
  ImageExporter,
  Text,
} from '../../packages/core/src';

const dir = `${__dirname}/snapshots`;
let $canvas: HTMLCanvasElement;
let canvas: Canvas;
let exporter: ImageExporter;

DOMAdapter.set(NodeJSAdapter);

describe('Text', () => {
  beforeEach(async () => {
    $canvas = DOMAdapter.get().createCanvas(200, 200) as HTMLCanvasElement;
    canvas = await new Canvas({
      canvas: $canvas,
    }).initialized;
    exporter = new ImageExporter({
      canvas,
    });
  });

  afterEach(() => {
    canvas.destroy();
  });

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Element/text#example
   */
  it('should render multiple text elements correctly.', async () => {
    const my = new Text({
      x: 20,
      y: 35,
      content: 'My',
      fontFamily: 'sans-serif',
      fontSize: 13,
      fontStyle: 'italic',
    });
    canvas.appendChild(my);

    const cat = new Text({
      x: 40,
      y: 35,
      content: 'cat',
      fontFamily: 'sans-serif',
      fontSize: 30,
      fontWeight: 700,
    });
    canvas.appendChild(cat);

    const is = new Text({
      x: 55,
      y: 55,
      content: 'is',
      fontFamily: 'sans-serif',
      fontSize: 13,
      fontStyle: 'italic',
    });
    canvas.appendChild(is);

    const grumpy = new Text({
      x: 65,
      y: 55,
      content: 'Grumpy!',
      fill: 'red',
      fontFamily: 'serif',
      fontSize: 40,
      fontStyle: 'italic',
    });
    canvas.appendChild(grumpy);

    canvas.render();

    expect($canvas.getContext('webgl1')).toMatchWebGLSnapshot(dir, 'text', {
      maxError: 1000,
    });
    expect(exporter.toSVG({ grid: true })).toMatchSVGSnapshot(dir, 'text');
  });

  it('should render text with edt correctly.', async () => {
    const text = new Text({
      x: 20,
      y: 35,
      content: 'My',
      fontFamily: 'sans-serif',
      fontSize: 40,
      esdt: false,
    });
    canvas.appendChild(text);
    canvas.render();
    expect($canvas.getContext('webgl1')).toMatchWebGLSnapshot(dir, 'text-edt', {
      maxError: 1000,
    });
    expect(exporter.toSVG({ grid: true })).toMatchSVGSnapshot(dir, 'text-edt');
  });

  it('should render emoji correctly.', async () => {
    const text = new Text({
      x: 20,
      y: 35,
      content: '🐱🌞🌛',
      fontFamily: 'sans-serif',
      fontSize: 40,
    });
    canvas.appendChild(text);
    canvas.render();
    expect($canvas.getContext('webgl1')).toMatchWebGLSnapshot(
      dir,
      'text-emoji',
      {
        maxError: 1000,
      },
    );
    expect(exporter.toSVG({ grid: true })).toMatchSVGSnapshot(
      dir,
      'text-emoji',
    );
  });
});
