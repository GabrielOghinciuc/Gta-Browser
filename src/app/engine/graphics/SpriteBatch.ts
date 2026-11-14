import { mat4 } from 'gl-matrix';
import { Shader } from './Shader';
import { Texture } from './Texture';
import { UVCoords } from './TextureAtlas';

const VERTEX_SHADER_SRC = `#version 300 es
precision mediump float;

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_texCoord;
layout(location = 2) in vec4 a_color;

uniform mat4 u_viewProjection;

out vec2 v_texCoord;
out vec4 v_color;

void main() {
  v_texCoord = a_texCoord;
  v_color = a_color;
  gl_Position = u_viewProjection * vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SRC = `#version 300 es
precision mediump float;

in vec2 v_texCoord;
in vec4 v_color;

uniform sampler2D u_texture;

out vec4 fragColor;

void main() {
  vec4 texColor = texture(u_texture, v_texCoord);
  fragColor = texColor * v_color;
}
`;

export class SpriteBatch {
  private readonly maxQuads = 4096;
  private readonly vertexSize = 8; // x, y, u, v, r, g, b, a
  private readonly floatsPerQuad = 4 * this.vertexSize; // 32 floats

  private vertices: Float32Array;
  private vao: WebGLVertexArrayObject;
  private vbo: WebGLBuffer;
  private ibo: WebGLBuffer;
  private quadCount = 0;

  private shader: Shader;
  private currentTexture: Texture | null = null;
  private isDrawing = false;

  constructor(private gl: WebGL2RenderingContext) {
    this.shader = new Shader(gl, VERTEX_SHADER_SRC, FRAGMENT_SHADER_SRC);
    this.vertices = new Float32Array(this.maxQuads * this.floatsPerQuad);

    // Create Index Buffer for quads: 0, 1, 2, 2, 3, 0
    const indices = new Uint16Array(this.maxQuads * 6);
    for (let i = 0; i < this.maxQuads; i++) {
      const vOffset = i * 4;
      const iOffset = i * 6;
      indices[iOffset + 0] = vOffset + 0;
      indices[iOffset + 1] = vOffset + 1;
      indices[iOffset + 2] = vOffset + 2;
      indices[iOffset + 3] = vOffset + 2;
      indices[iOffset + 4] = vOffset + 3;
      indices[iOffset + 5] = vOffset + 0;
    }

    const vao = gl.createVertexArray();
    if (!vao) throw new Error('Failed to create VAO');
    this.vao = vao;
    gl.bindVertexArray(this.vao);

    const vbo = gl.createBuffer();
    if (!vbo) throw new Error('Failed to create VBO');
    this.vbo = vbo;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices.byteLength, gl.DYNAMIC_DRAW);

    const ibo = gl.createBuffer();
    if (!ibo) throw new Error('Failed to create IBO');
    this.ibo = ibo;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    const stride = this.vertexSize * 4; // 32 bytes

    // a_position (vec2)
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);

    // a_texCoord (vec2)
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 2 * 4);

    // a_color (vec4)
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 4 * 4);

    gl.bindVertexArray(null);
  }

  begin(viewProjection: mat4, texture: Texture): void {
    if (this.isDrawing) {
      throw new Error('SpriteBatch.begin() called twice without end()');
    }
    this.isDrawing = true;
    this.quadCount = 0;
    this.currentTexture = texture;

    this.shader.use();
    this.shader.setMat4('u_viewProjection', viewProjection);
    this.shader.set1i('u_texture', 0);

    texture.bind(0);
  }

  setTexture(texture: Texture): void {
    if (this.currentTexture !== texture) {
      this.flush();
      this.currentTexture = texture;
      this.currentTexture.bind(0);
    }
  }

  drawRegion(
    uv: UVCoords,
    x: number,
    y: number,
    width: number,
    height: number,
    rotation = 0,
    originX = 0.5,
    originY = 0.5,
    r = 1,
    g = 1,
    b = 1,
    a = 1
  ): void {
    if (this.quadCount >= this.maxQuads) {
      this.flush();
    }

    const ox = width * originX;
    const oy = height * originY;

    // Local coordinates relative to origin
    const lx0 = -ox;
    const ly0 = -oy;
    const lx1 = width - ox;
    const ly1 = -oy;
    const lx2 = width - ox;
    const ly2 = height - oy;
    const lx3 = -ox;
    const ly3 = height - oy;

    let x0: number, y0: number, x1: number, y1: number;
    let x2: number, y2: number, x3: number, y3: number;

    if (rotation !== 0) {
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);

      x0 = x + (lx0 * cos - ly0 * sin);
      y0 = y + (lx0 * sin + ly0 * cos);

      x1 = x + (lx1 * cos - ly1 * sin);
      y1 = y + (lx1 * sin + ly1 * cos);

      x2 = x + (lx2 * cos - ly2 * sin);
      y2 = y + (lx2 * sin + ly2 * cos);

      x3 = x + (lx3 * cos - ly3 * sin);
      y3 = y + (lx3 * sin + ly3 * cos);
    } else {
      x0 = x + lx0;
      y0 = y + ly0;
      x1 = x + lx1;
      y1 = y + ly1;
      x2 = x + lx2;
      y2 = y + ly2;
      x3 = x + lx3;
      y3 = y + ly3;
    }

    const offset = this.quadCount * this.floatsPerQuad;

    // Vertex 0: Top-left
    this.vertices[offset + 0] = x0;
    this.vertices[offset + 1] = y0;
    this.vertices[offset + 2] = uv.u0;
    this.vertices[offset + 3] = uv.v0;
    this.vertices[offset + 4] = r;
    this.vertices[offset + 5] = g;
    this.vertices[offset + 6] = b;
    this.vertices[offset + 7] = a;

    // Vertex 1: Top-right
    this.vertices[offset + 8] = x1;
    this.vertices[offset + 9] = y1;
    this.vertices[offset + 10] = uv.u1;
    this.vertices[offset + 11] = uv.v0;
    this.vertices[offset + 12] = r;
    this.vertices[offset + 13] = g;
    this.vertices[offset + 14] = b;
    this.vertices[offset + 15] = a;

    // Vertex 2: Bottom-right
    this.vertices[offset + 16] = x2;
    this.vertices[offset + 17] = y2;
    this.vertices[offset + 18] = uv.u1;
    this.vertices[offset + 19] = uv.v1;
    this.vertices[offset + 20] = r;
    this.vertices[offset + 21] = g;
    this.vertices[offset + 22] = b;
    this.vertices[offset + 23] = a;

    // Vertex 3: Bottom-left
    this.vertices[offset + 24] = x3;
    this.vertices[offset + 25] = y3;
    this.vertices[offset + 26] = uv.u0;
    this.vertices[offset + 27] = uv.v1;
    this.vertices[offset + 28] = r;
    this.vertices[offset + 29] = g;
    this.vertices[offset + 30] = b;
    this.vertices[offset + 31] = a;

    this.quadCount++;
  }

  drawLine(
    whiteUV: UVCoords,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    thickness: number,
    r = 1,
    g = 1,
    b = 1,
    a = 1
  ): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 0.001) return;

    const angle = Math.atan2(dy, dx);
    this.drawRegion(whiteUV, x1, y1, len, thickness, angle, 0, 0.5, r, g, b, a);
  }

  drawTriangle(
    uv: UVCoords,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    r0 = 1,
    g0 = 1,
    b0 = 1,
    a0 = 1,
    r1 = r0,
    g1 = g0,
    b1 = b0,
    a1 = a0,
    r2 = r0,
    g2 = g0,
    b2 = b0,
    a2 = a0
  ): void {
    if (this.quadCount >= this.maxQuads) {
      this.flush();
    }

    const offset = this.quadCount * this.floatsPerQuad;

    // Vertex 0: Apex (x0, y0)
    this.vertices[offset + 0] = x0;
    this.vertices[offset + 1] = y0;
    this.vertices[offset + 2] = uv.u0;
    this.vertices[offset + 3] = uv.v0;
    this.vertices[offset + 4] = r0;
    this.vertices[offset + 5] = g0;
    this.vertices[offset + 6] = b0;
    this.vertices[offset + 7] = a0;

    // Vertex 1: Base 1 (x1, y1)
    this.vertices[offset + 8] = x1;
    this.vertices[offset + 9] = y1;
    this.vertices[offset + 10] = uv.u1;
    this.vertices[offset + 11] = uv.v0;
    this.vertices[offset + 12] = r1;
    this.vertices[offset + 13] = g1;
    this.vertices[offset + 14] = b1;
    this.vertices[offset + 15] = a1;

    // Vertex 2: Base 2 (x2, y2)
    this.vertices[offset + 16] = x2;
    this.vertices[offset + 17] = y2;
    this.vertices[offset + 18] = uv.u1;
    this.vertices[offset + 19] = uv.v1;
    this.vertices[offset + 20] = r2;
    this.vertices[offset + 21] = g2;
    this.vertices[offset + 22] = b2;
    this.vertices[offset + 23] = a2;

    // Vertex 3: Duplicate of Vertex 2 (degenerate triangle 2: v2, v2, v0)
    this.vertices[offset + 24] = x2;
    this.vertices[offset + 25] = y2;
    this.vertices[offset + 26] = uv.u1;
    this.vertices[offset + 27] = uv.v1;
    this.vertices[offset + 28] = r2;
    this.vertices[offset + 29] = g2;
    this.vertices[offset + 30] = b2;
    this.vertices[offset + 31] = a2;

    this.quadCount++;
  }

  flush(): void {
    if (this.quadCount === 0) return;

    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferSubData(
      gl.ARRAY_BUFFER,
      0,
      this.vertices.subarray(0, this.quadCount * this.floatsPerQuad)
    );

    gl.bindVertexArray(this.vao);
    gl.drawElements(gl.TRIANGLES, this.quadCount * 6, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);

    this.quadCount = 0;
  }

  end(): void {
    if (!this.isDrawing) return;
    this.flush();
    this.isDrawing = false;
  }

  destroy(): void {
    this.gl.deleteBuffer(this.vbo);
    this.gl.deleteBuffer(this.ibo);
    this.gl.deleteVertexArray(this.vao);
    this.shader.destroy();
  }
}

