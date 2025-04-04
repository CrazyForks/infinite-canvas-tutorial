import {
  vert as wireframe_vert,
  vert_declaration as wireframe_vert_declaration,
  frag as wireframe_frag,
  frag_declaration as wireframe_frag_declaration,
  Location as WireframeLocation,
} from './wireframe';

export enum Location {
  BARYCENTRIC = WireframeLocation.BARYCENTRIC,
  POSITION = 1,
}

export const vert = /* wgsl */ `
layout(std140) uniform SceneUniforms {
  mat3 u_ProjectionMatrix;
  mat3 u_ViewMatrix;
  mat3 u_ViewProjectionInvMatrix;
  vec4 u_BackgroundColor;
  vec4 u_GridColor;
  float u_ZoomScale;
  float u_CheckboardStyle;
};

${wireframe_vert_declaration}
layout(location = ${Location.POSITION}) in vec2 a_Position;

layout(std140) uniform ShapeUniforms {
  mat3 u_ModelMatrix;
  vec4 u_FillColor;
  vec4 u_StrokeColor;
  vec4 u_ZIndexStrokeWidth;
  vec4 u_Opacity;
};

void main() {
  ${wireframe_vert}

  mat3 model;
  vec4 fillColor;
  vec4 strokeColor;
  float zIndex;
  float strokeWidth;
  float strokeAlignment;
  float sizeAttenuation;
  model = u_ModelMatrix;
  fillColor = u_FillColor;
  strokeColor = u_StrokeColor;
  zIndex = u_ZIndexStrokeWidth.x;
  strokeWidth = u_ZIndexStrokeWidth.y;
  strokeAlignment = u_ZIndexStrokeWidth.w;
  sizeAttenuation = u_Opacity.w;

  float scale = 1.0;
  if (sizeAttenuation > 0.5) {
    scale = 1.0 / u_ZoomScale;
  }

  gl_Position = vec4((u_ProjectionMatrix 
    * u_ViewMatrix
    * model 
    * vec3(a_Position * scale, 1)).xy, zIndex, 1);
}
`;

export const frag = /* wgsl */ `
layout(std140) uniform SceneUniforms {
  mat3 u_ProjectionMatrix;
  mat3 u_ViewMatrix;
  mat3 u_ViewProjectionInvMatrix;
  vec4 u_BackgroundColor;
  vec4 u_GridColor;
  float u_ZoomScale;
  float u_CheckboardStyle;
};

layout(std140) uniform ShapeUniforms {
  mat3 u_ModelMatrix;
  vec4 u_FillColor;
  vec4 u_StrokeColor;
  vec4 u_ZIndexStrokeWidth;
  vec4 u_Opacity;
};

${wireframe_frag_declaration}

out vec4 outputColor;

float epsilon = 0.000001;

void main() {
  float strokeWidth;
  vec4 fillColor;
  vec4 strokeColor;
  float opacity;
  float fillOpacity;
  float strokeOpacity;
  float cornerRadius;
  float strokeAlignment;
  
  fillColor = u_FillColor;
  strokeColor = u_StrokeColor;
  strokeWidth = u_ZIndexStrokeWidth.y;
  opacity = u_Opacity.x;
  fillOpacity = u_Opacity.y;
  strokeOpacity = u_Opacity.z;
  cornerRadius = u_ZIndexStrokeWidth.z;
  strokeAlignment = u_ZIndexStrokeWidth.w;

  // based on the target alpha compositing mode.
  fillColor.a *= fillOpacity;
  strokeColor.a *= strokeOpacity;
  
  outputColor = fillColor;
  outputColor.a *= opacity;

  ${wireframe_frag}

  if (outputColor.a < epsilon)
    discard;
}
`;
