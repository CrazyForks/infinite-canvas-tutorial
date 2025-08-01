import { Pen, CheckboardStyle, Theme, ThemeMode } from './components';
import {
  TRANSFORMER_ANCHOR_STROKE_COLOR,
  TRANSFORMER_MASK_FILL_COLOR,
} from './systems/RenderTransformer';
import {
  FillAttributes,
  RoughAttributes,
  SerializedNode,
  StrokeAttributes,
  TextSerializedNode,
} from './utils';

export enum Task {
  SHOW_LAYERS_PANEL = 'show-layers-panel',
  SHOW_PROPERTIES_PANEL = 'show-properties-panel',
}

/**
 * Prefer flat objects.
 * @see https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/initialdata
 */
export interface AppState {
  theme: Theme;
  checkboardStyle: CheckboardStyle;
  cameraZoom: number;
  cameraX: number;
  cameraY: number;
  cameraRotation: number;
  contextBarVisible: boolean;
  contextMenuVisible: boolean;
  topbarVisible: boolean;
  penbarVisible: boolean;
  penbarAll: Pen[];
  penbarSelected: Pen[];
  penbarDrawRect: Partial<StrokeAttributes & FillAttributes>;
  penbarDrawEllipse: Partial<StrokeAttributes & FillAttributes>;
  penbarDrawLine: Partial<StrokeAttributes>;
  penbarDrawRoughRect: Partial<
    RoughAttributes & StrokeAttributes & FillAttributes
  >;
  penbarPencil: Partial<StrokeAttributes>;
  penbarText: Partial<TextSerializedNode>;
  taskbarVisible: boolean;
  taskbarAll: Task[];
  taskbarSelected: Task[];
  layersSelected: SerializedNode['id'][];
  layersHighlighted: SerializedNode['id'][];
  propertiesOpened: SerializedNode['id'][];
  /**
   * Allow rotate in transformer
   */
  rotateEnabled: boolean;
  /**
   * Allow flip in transformer
   */
  flipEnabled: boolean;
}

export const getDefaultAppState: () => AppState = () => {
  return {
    // TODO: Flatten theme
    theme: {
      mode: ThemeMode.LIGHT,
      colors: {
        [ThemeMode.LIGHT]: {
          swatches: [
            TRANSFORMER_ANCHOR_STROKE_COLOR,
            TRANSFORMER_MASK_FILL_COLOR,
            'black',
            'white',
            'red',
            'green',
            'blue',
            'yellow',
          ],
        },
        [ThemeMode.DARK]: {
          swatches: [
            TRANSFORMER_ANCHOR_STROKE_COLOR,
            TRANSFORMER_MASK_FILL_COLOR,
            'black',
            'white',
            'red',
            'green',
            'blue',
            'yellow',
          ],
        },
      },
    },
    checkboardStyle: CheckboardStyle.GRID,
    cameraZoom: 1,
    cameraX: 0,
    cameraY: 0,
    cameraRotation: 0,
    contextBarVisible: true,
    contextMenuVisible: true,
    topbarVisible: true,
    penbarVisible: true,
    penbarAll: [
      Pen.HAND,
      Pen.SELECT,
      Pen.DRAW_RECT,
      Pen.DRAW_ELLIPSE,
      Pen.DRAW_LINE,
      Pen.DRAW_ROUGH_RECT,
      Pen.IMAGE,
      Pen.TEXT,
      Pen.PENCIL,
      Pen.BRUSH,
      Pen.VECTOR_NETWORK,
    ],
    penbarSelected: [Pen.HAND],
    penbarDrawRect: {
      fill: TRANSFORMER_MASK_FILL_COLOR,
      fillOpacity: 0.5,
      stroke: TRANSFORMER_ANCHOR_STROKE_COLOR,
      strokeWidth: 1,
      strokeOpacity: 1,
    },
    penbarDrawEllipse: {
      fill: TRANSFORMER_MASK_FILL_COLOR,
      fillOpacity: 0.5,
      stroke: TRANSFORMER_ANCHOR_STROKE_COLOR,
      strokeWidth: 1,
      strokeOpacity: 1,
    },
    penbarDrawLine: {
      stroke: TRANSFORMER_ANCHOR_STROKE_COLOR,
      strokeWidth: 1,
      strokeOpacity: 1,
    },
    penbarDrawRoughRect: {
      fill: 'black',
      fillOpacity: 1,
      stroke: 'black',
      strokeWidth: 10,
      strokeOpacity: 1,
      roughBowing: 1,
      roughRoughness: 1,
      roughFillStyle: 'hachure',
    },
    penbarPencil: {
      stroke: TRANSFORMER_ANCHOR_STROKE_COLOR,
      strokeWidth: 1,
      strokeOpacity: 1,
    },
    penbarText: {
      fontFamily: 'system-ui',
      fontSize: 16,
      fill: 'black',
    },
    taskbarVisible: true,
    taskbarAll: [Task.SHOW_LAYERS_PANEL, Task.SHOW_PROPERTIES_PANEL],
    taskbarSelected: [],
    layersSelected: [],
    layersHighlighted: [],
    propertiesOpened: [],
    rotateEnabled: true,
    flipEnabled: true,
  };
};

export const SIBLINGS_MAX_Z_INDEX = 1000000;
export const SIBLINGS_MIN_Z_INDEX = -1000000;
export const TRANSFORMER_Z_INDEX = SIBLINGS_MAX_Z_INDEX * 10;
export const HIGHLIGHTER_Z_INDEX = TRANSFORMER_Z_INDEX - 1;
export const DRAW_RECT_Z_INDEX = HIGHLIGHTER_Z_INDEX - 10;
