import { mat4 } from 'gl-matrix';

export class Shader {
  private program: WebGLProgram;
  private uniformLocations = new Map<string, WebGLUniformLocation>();
  private attribLocations = new Map<string, number>();

  constructor(private gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string) {
    const vs = this.compileShader(gl.VERTEX_SHADER, vertexSource);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);

    const program = gl.createProgram();
    if (!program) {
      throw new Error('Failed to create WebGL program');
    }

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Shader program link error: ${info}`);
    }

    this.program = program;
    gl.deleteShader(vs);
    gl.deleteShader(fs);
  }

  private compileShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) {
      throw new Error(`Unable to create shader type ${type}`);
    }

    this.gl.shaderSource(shader, source.trim());
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const info = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      const typeName = type === this.gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT';
      throw new Error(`[${typeName}] compile error:\n${info}\nSource:\n${source}`);
    }

    return shader;
  }

  use(): void {
    this.gl.useProgram(this.program);
  }

  getUniformLocation(name: string): WebGLUniformLocation | null {
    if (this.uniformLocations.has(name)) {
      return this.uniformLocations.get(name) ?? null;
    }
    const loc = this.gl.getUniformLocation(this.program, name);
    if (loc) {
      this.uniformLocations.set(name, loc);
    }
    return loc;
  }

  getAttribLocation(name: string): number {
    if (this.attribLocations.has(name)) {
      return this.attribLocations.get(name)!;
    }
    const loc = this.gl.getAttribLocation(this.program, name);
    this.attribLocations.set(name, loc);
    return loc;
  }

  setMat4(name: string, matrix: mat4 | Float32Array): void {
    const loc = this.getUniformLocation(name);
    if (loc) {
      this.gl.uniformMatrix4fv(loc, false, matrix);
    }
  }

  set1i(name: string, value: number): void {
    const loc = this.getUniformLocation(name);
    if (loc) {
      this.gl.uniform1i(loc, value);
    }
  }

  set1f(name: string, value: number): void {
    const loc = this.getUniformLocation(name);
    if (loc) {
      this.gl.uniform1f(loc, value);
    }
  }

  set2f(name: string, x: number, y: number): void {
    const loc = this.getUniformLocation(name);
    if (loc) {
      this.gl.uniform2f(loc, x, y);
    }
  }

  set4f(name: string, x: number, y: number, z: number, w: number): void {
    const loc = this.getUniformLocation(name);
    if (loc) {
      this.gl.uniform4f(loc, x, y, z, w);
    }
  }

  destroy(): void {
    this.gl.deleteProgram(this.program);
  }
}

