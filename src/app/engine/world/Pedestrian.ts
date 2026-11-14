import { SpriteBatch } from '../graphics/SpriteBatch';
import { TextureAtlas } from '../graphics/TextureAtlas';
import { CityMap } from './CityMap';

export class Pedestrian {
  x: number;
  y: number;
  angle: number;
  speed = 45;
  targetAngle = 0;
  isPanicking = false;
  panicTimer = 0;
  alive = true;

  textureKey = 'pedestrian';
  private walkCycle = 0;

  constructor(x: number, y: number, textureKey = 'pedestrian') {
    this.x = x;
    this.y = y;
    this.textureKey = textureKey;
    this.angle = Math.random() * Math.PI * 2;
    this.targetAngle = this.angle;
  }

  update(dt: number, map: CityMap, playerX: number, playerY: number, playerSpeed: number): void {
    if (!this.alive) return;

    // Check distance to player
    const distToPlayer = Math.hypot(this.x - playerX, this.y - playerY);

    if (distToPlayer < 140 && Math.abs(playerSpeed) > 100) {
      // Panic! Run away from the car
      this.isPanicking = true;
      this.panicTimer = 3.0;
      this.targetAngle = Math.atan2(this.y - playerY, this.x - playerX);
    } else if (this.isPanicking) {
      this.panicTimer -= dt;
      if (this.panicTimer <= 0) {
        this.isPanicking = false;
      }
    } else {
      // Random wandering direction change
      if (Math.random() < 0.015) {
        this.targetAngle += (Math.random() - 0.5) * Math.PI;
      }
    }

    // Smooth angle adjustment
    this.angle += (this.targetAngle - this.angle) * Math.min(dt * 5, 1.0);

    const currentSpeed = this.isPanicking ? this.speed * 2.2 : this.speed;
    const nextX = this.x + Math.cos(this.angle) * currentSpeed * dt;
    const nextY = this.y + Math.sin(this.angle) * currentSpeed * dt;

    // Check if next tile is solid (avoid buildings and water)
    const tileC = Math.floor(nextX / map.tileSize);
    const tileR = Math.floor(nextY / map.tileSize);

    if (!map.isSolid(tileC, tileR)) {
      this.x = nextX;
      this.y = nextY;
      this.walkCycle += dt * (this.isPanicking ? 14 : 7);
    } else {
      // Turn around if hitting an obstacle
      this.targetAngle += Math.PI * 0.75;
    }
  }

  render(batch: SpriteBatch, atlas: TextureAtlas): void {
    if (!this.alive) return;

    const whiteUV = atlas.getUVs('white');
    // Ground drop shadow for depth & grounding
    batch.drawRegion(whiteUV, this.x + 2, this.y + 4, 14, 14, 0, 0.5, 0.5, 0, 0, 0, 0.32);

    const pedUV = atlas.getUVs(this.textureKey);
    // Subtle wobble animation for walking
    const wobble = Math.sin(this.walkCycle) * 0.15;
    batch.drawRegion(pedUV, this.x, this.y, 22, 22, this.angle + wobble, 0.5, 0.5, 1, 1, 1, 1);
  }
}

