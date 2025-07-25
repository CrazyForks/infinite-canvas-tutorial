import {
  Camera,
  CameraControl,
  Canvas,
  ComputeBounds,
  Plugin,
  PreStartUp,
  PropagateTransforms,
  SetupDevice,
  SyncSimpleTransforms,
  system,
  Select,
  Last,
  RenderTransformer,
  RenderHighlighter,
} from '@infinite-canvas-tutorial/ecs';
import {
  DownloadScreenshot,
  InitCanvas,
  ListenTransformableStatus,
  ZoomLevel,
} from '../systems';

export const UIPlugin: Plugin = () => {
  /**
   * Solve the following error:
   * Uncaught (in promise) p: Multiple component types named o; names must be unique at eG.createSystems
   *
   * Usually, this error is caused when the code is bundled.
   */
  Object.defineProperty(InitCanvas, 'name', {
    value: 'InitCanvas',
  });
  Object.defineProperty(ZoomLevel, 'name', {
    value: 'ZoomLevel',
  });
  Object.defineProperty(DownloadScreenshot, 'name', {
    value: 'DownloadScreenshot',
  });

  system((s) => s.after(PreStartUp).before(ZoomLevel).beforeWritersOf(Canvas))(
    InitCanvas,
  );
  system((s) =>
    s
      .inAnyOrderWithWritersOf(Camera)
      .after(
        SetupDevice,
        SyncSimpleTransforms,
        PropagateTransforms,
        ComputeBounds,
        CameraControl,
        Select,
        RenderTransformer,
        RenderHighlighter,
      )
      .before(Last),
  )(ZoomLevel);
  system((s) => s.before(PreStartUp))(DownloadScreenshot);
  system(PreStartUp)(ListenTransformableStatus);
};
