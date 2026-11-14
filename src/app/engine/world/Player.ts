import { SpriteBatch } from '../graphics/SpriteBatch';
import { TextureAtlas } from '../graphics/TextureAtlas';
import { CityMap } from './CityMap';
import { Car } from '../physics/Car';

export class Player {
  x: number;
  y: number;
  angle = 0;

  vx = 0;
  vy = 0;
  speed = 0;

  readonly radius = 12;
  health = 100;
  alive = true;
  isGodMode = false;

  isMoving = false;
  isSprinting = false;
  walkCycle = 0;

  constructor(x = 0, y = 0, angle = 0) {
    this.x = x;
    this.y = y;
    this.angle = angle;
  }

  update(
    dt: number,
    throttle: number,
    steering: number,
    sprint: boolean,
    map: CityMap,
    aimWorldX?: number,
    aimWorldY?: number,
    isShooting = false
  ): void {
    if (!this.alive) return;

    // steering: -1 (A/Left) to +1 (D/Right)
    // throttle: +1 (W/Up) to -1 (S/Down) -> in canvas coordinates -Y is up, +Y is down
    const moveX = steering;
    const moveY = -throttle;

    this.isMoving = Math.abs(moveX) > 0.1 || Math.abs(moveY) > 0.1;
    this.isSprinting = sprint && this.isMoving && !isShooting;

    const targetSpeed = this.isMoving ? (this.isSprinting ? 220 : 125) : 0;

    // Direction facing: if shooting or aiming with mouse, turn towards mouse; otherwise turn towards movement
    if (aimWorldX !== undefined && aimWorldY !== undefined && (isShooting || Math.hypot(aimWorldX - this.x, aimWorldY - this.y) > 30)) {
      const aimAngle = Math.atan2(aimWorldY - this.y, aimWorldX - this.x);
      let diff = aimAngle - this.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.angle += diff * Math.min(dt * 24, 1.0);
    } else if (this.isMoving) {
      const moveAngle = Math.atan2(moveY, moveX);
      let diff = moveAngle - this.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.angle += diff * Math.min(dt * 18, 1.0);
    }

    if (this.isMoving) {
      const moveDir = Math.atan2(moveY, moveX);
      this.vx = Math.cos(moveDir) * targetSpeed;
      this.vy = Math.sin(moveDir) * targetSpeed;
      this.walkCycle += dt * (this.isSprinting ? 18 : 10);
    } else {
      this.vx *= Math.pow(0.8, dt * 60);
      this.vy *= Math.pow(0.8, dt * 60);
      if (Math.hypot(this.vx, this.vy) < 5) {
        this.vx = 0;
        this.vy = 0;
      }
    }

    this.speed = Math.hypot(this.vx, this.vy);

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Building & obstacle collisions
    const obstacles = map.getNearbyObstacles(this.x, this.y, 40);
    for (const obs of obstacles) {
      this.resolveBoxCollision(obs.x, obs.y, obs.width, obs.height);
    }

    // Roundabout central fountain collision
    for (const rb of map.roundabouts) {
      this.resolveCircleCollision(rb.x, rb.y, 46);
    }
  }

  resolveCircleCollision(cx: number, cy: number, cradius: number): boolean {
    const totalRadius = cradius + this.radius;
    const distX = this.x - cx;
    const distY = this.y - cy;
    const distSq = distX * distX + distY * distY;

    if (distSq < totalRadius * totalRadius && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const nx = distX / dist;
      const ny = distY / dist;

      const overlap = totalRadius - dist;
      this.x += nx * overlap;
      this.y += ny * overlap;
      this.vx = 0;
      this.vy = 0;
      return true;
    }
    return false;
  }

  resolveBoxCollision(bx: number, by: number, bw: number, bh: number): boolean {
    const closestX = Math.max(bx, Math.min(this.x, bx + bw));
    const closestY = Math.max(by, Math.min(this.y, by + bh));

    const distX = this.x - closestX;
    const distY = this.y - closestY;
    const distSq = distX * distX + distY * distY;

    if (distSq < this.radius * this.radius && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const nx = distX / dist;
      const ny = distY / dist;

      const overlap = this.radius - dist;
      this.x += nx * overlap;
      this.y += ny * overlap;
      return true;
    }
    return false;
  }

  getNearestCar(cars: Car[], maxDist = 55): Car | null {
    let nearest: Car | null = null;
    let minDist = maxDist;

    for (const car of cars) {
      const dist = Math.hypot(car.x - this.x, car.y - this.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = car;
      }
    }

    return nearest;
  }

  render(batch: SpriteBatch, atlas: TextureAtlas): void {
    if (!this.alive) return;

    const plyUV = atlas.getUVs('player_foot');
    const wobble = this.isMoving ? Math.sin(this.walkCycle) * 0.14 : 0;

    batch.drawRegion(plyUV, this.x, this.y, 28, 28, this.angle + wobble, 0.5, 0.5, 1, 1, 1, 1);
  }
}

