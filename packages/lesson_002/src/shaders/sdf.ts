export const vert = /* wgsl */ `
layout(std140) uniform Uniforms {
  vec2 u_Resolution;
};

layout(location = 0) in vec2 a_FragCoord;
layout(location = 1) in vec2 a_Position;
layout(location = 2) in vec2 a_Size;
layout(location = 3) in vec4 a_FillColor;

out vec2 v_FragCoord;
out vec4 v_FillColor;

void main() {
  v_FragCoord = a_FragCoord;
  v_FillColor = a_FillColor;

  // Pixel space to [0, 1] (Screen space)
  vec2 zeroToOne = (a_Position.x + a_Size * a_FragCoord) / u_Resolution;

  // Convert from [0, 1] to [0, 2]
  vec2 zeroToTwo = zeroToOne * 2.0;

  // Convert from [0, 2] to [-1, 1] (NDC/clip space)
  vec2 clipSpace = zeroToTwo - 1.0;

  // Flip Y axis
  gl_Position = vec4(clipSpace * vec2(1, -1), 0.0, 1.0);
}
`;

export const frag = /* wgsl */ `
out vec4 outputColor;

in vec2 v_FragCoord;
in vec4 v_FillColor;

float sdf_circle(vec2 p, float r) {
  return length(p) - r;
}

void main() {
  float distance = sdf_circle(v_FragCoord, 1.0);

  if (distance > 0.0) {
    discard;
  }

  float aaf = fwidth(distance);
  float alpha = smoothstep(0.0, -aaf, distance);

  outputColor = v_FillColor;
  outputColor.a *= alpha;
}
`;
