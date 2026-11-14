export class Texture {
  readonly texture: WebGLTexture;

  constructor(
    private gl: WebGL2RenderingContext,
    public readonly width: number,
    public readonly height: number,
    source?: TexImageSource | Uint8Array
  ) {
    const tex = gl.createTexture();
    if (!tex) {
      throw new Error('Failed to create WebGLTexture');
    }
    this.texture = tex;

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    if (source instanceof Uint8Array) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        width,
        height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source
      );
    } else if (source) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source
      );
    } else {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        width,
        height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
      );
    }
  }

  static createWhitePixel(gl: WebGL2RenderingContext): Texture {
    const whiteData = new Uint8Array([255, 255, 255, 255]);
    return new Texture(gl, 1, 1, whiteData);
  }

  bind(unit = 0): void {
    this.gl.activeTexture(this.gl.TEXTURE0 + unit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
  }

  destroy(): void {
    this.gl.deleteTexture(this.texture);
  }
}

