import { mat4, vec3 } from 'gl-matrix';

export class Camera {
  x = 0;
  y = 0;
  zoom = 1.0;
  targetZoom = 1.0;
  rotation = 0;
  targetRotation = 0;

  viewportWidth = 800;
  viewportHeight = 600;

  mode: 'north_up' | 'follow_rotation' = 'north_up';

  shakeIntensity = 0;
  shakeDuration = 0;

  private viewProjectionMatrix = mat4.create();
  private projectionMatrix = mat4.create();
  private viewMatrix = mat4.create();

  setViewport(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.updateMatrices();
  }

  follow(
    targetX: number,
    targetY: number,
    targetAngle: number,
    speed: number,
    dt: number
  ): void {
    // Dynamic lookahead: shift camera forward in the direction of motion
    const lookaheadDist = Math.min(speed * 0.35, 120);
    const forwardX = Math.cos(targetAngle);
    const forwardY = Math.sin(targetAngle);

    const desiredX = targetX + forwardX * lookaheadDist;
    const desiredY = targetY + forwardY * lookaheadDist;

    // Smooth position lerp
    const posLerp = Math.min(dt * 7.0, 1.0);
    this.x += (desiredX - this.x) * posLerp;
    this.y += (desiredY - this.y) * posLerp;

    // Dynamic zoom based on speed (zoom out at higher speeds)
    const baseZoom = 1.0;
    const speedRatio = Math.min(Math.abs(speed) / 450, 1.0);
    this.targetZoom = baseZoom - speedRatio * 0.28; // Zoom between 1.0 and 0.72

    const zoomLerp = Math.min(dt * 3.0, 1.0);
    this.zoom += (this.targetZoom - this.zoom) * zoomLerp;

    // Rotation follow mode
    if (this.mode === 'follow_rotation') {
      // In follow_rotation, we rotate so car faces upwards (-PI/2)
      let diff = -(targetAngle + Math.PI / 2) - this.rotation;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.rotation += diff * Math.min(dt * 4.0, 1.0);
    } else {
      this.rotation = 0;
    }

    // Screen Shake effect
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      const sx = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      const sy = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      this.x += sx;
      this.y += sy;
      this.shakeIntensity *= Math.pow(0.85, dt * 60);
    } else {
      this.shakeIntensity = 0;
    }

    this.updateMatrices();
  }

  addShake(intensity: number, duration = 0.25): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
  }

  screenToWorld(
    screenX: number,
    screenY: number,
    canvasW: number,
    canvasH: number
  ): [number, number] {
    const relX = (screenX - canvasW / 2) / this.zoom;
    const relY = (screenY - canvasH / 2) / this.zoom;

    if (this.rotation !== 0) {
      const cos = Math.cos(-this.rotation);
      const sin = Math.sin(-this.rotation);
      const rx = relX * cos - relY * sin;
      const ry = relX * sin + relY * cos;
      return [this.x + rx, this.y + ry];
    }

    return [this.x + relX, this.y + relY];
  }

  toggleCameraMode(): void {
    this.mode = this.mode === 'north_up' ? 'follow_rotation' : 'north_up';
  }

  setNorthUp(): void {
    this.mode = 'north_up';
    this.rotation = 0;
    this.targetRotation = 0;
    this.updateMatrices();
  }

  updateMatrices(): void {
    const halfW = (this.viewportWidth / 2) / this.zoom;
    const halfH = (this.viewportHeight / 2) / this.zoom;

    // Orthographic projection
    mat4.ortho(
      this.projectionMatrix,
      -halfW,
      halfW,
      halfH,
      -halfH,
      -1000,
      1000
    );

    // View matrix
    mat4.identity(this.viewMatrix);

    if (this.rotation !== 0) {
      mat4.rotateZ(this.viewMatrix, this.viewMatrix, this.rotation);
    }

    mat4.translate(
      this.viewMatrix,
      this.viewMatrix,
      vec3.fromValues(-this.x, -this.y, 0)
    );

    // ViewProjection = Projection * View
    mat4.multiply(
      this.viewProjectionMatrix,
      this.projectionMatrix,
      this.viewMatrix
    );
  }

  getViewProjection(): mat4 {
    return this.viewProjectionMatrix;
  }

  getVisibleBounds(margin = 64): { minX: number; minY: number; maxX: number; maxY: number } {
    const radius = Math.hypot(this.viewportWidth, this.viewportHeight) / (2 * this.zoom) + margin;
    return {
      minX: this.x - radius,
      minY: this.y - radius,
      maxX: this.x + radius,
      maxY: this.y + radius
    };
  }
}

