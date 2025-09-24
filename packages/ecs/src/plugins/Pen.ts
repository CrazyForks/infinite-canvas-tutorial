import { component, system } from '@lastolivegames/becsy';
import { Plugin } from './types';
import {
  ComputeBounds,
  EventWriter,
  PropagateTransforms,
  RenderHighlighter,
  RenderTransformer,
  Select,
  SetupDevice,
  Sort,
  SyncSimpleTransforms,
  DrawRect,
  CameraControl,
  ComputeCamera,
  Last,
  ComputeVisibility,
  DrawPencil,
  MeshPipeline,
  RenderSnap,
} from '../systems';
import {
  Highlighted,
  Anchor,
  Selected,
  Transformable,
  UI,
  VectorNetwork,
  SnapPoint,
  Snap,
} from '../components';

export const PenPlugin: Plugin = () => {
  component(UI);
  component(Selected);
  component(Highlighted);
  component(Transformable);
  component(Anchor);
  component(SnapPoint);
  component(Snap);
  component(VectorNetwork);

  system((s) =>
    s
      .after(
        ComputeBounds,
        EventWriter,
        SetupDevice,
        SyncSimpleTransforms,
        PropagateTransforms,
        Sort,
        ComputeCamera,
        ComputeVisibility,
        CameraControl,
      )
      .before(Last),
  )(Select);
  system((s) => s.after(Select).before(Last))(DrawRect);
  system((s) => s.after(DrawRect).before(Last))(DrawPencil);
  system((s) => s.afterWritersOf(Selected).before(Last, MeshPipeline))(
    RenderTransformer,
  );
  system((s) =>
    s
      .afterWritersOf(Highlighted)
      .inAnyOrderWith(RenderTransformer)
      .before(Last, MeshPipeline),
  )(RenderHighlighter);
  system((s) =>
    s
      .afterWritersOf(SnapPoint)
      .inAnyOrderWith(RenderHighlighter, RenderTransformer)
      .before(Last, MeshPipeline, DrawRect),
  )(RenderSnap);
};
