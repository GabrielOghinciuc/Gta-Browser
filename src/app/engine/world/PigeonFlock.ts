import { SpriteBatch } from '../graphics/SpriteBatch';
import { TextureAtlas } from '../graphics/TextureAtlas';
import { Car } from '../physics/Car';

interface Pigeon {
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  vx: number;
  vy: number;
  angle: number;
  altitude: number;
  isFlying: boolean;
  flyTimer: number;
  peckTimer: number;
  flapCycle: number;
}

export class PigeonFlockManager {
  private pigeons: Pigeon[] = [];

  constructor() {
    this.spawnFlocks();
  }

  private spawnFlocks(): void {
    // Spawns small flocks around park plazas and sidewalks
    const parkLocations: Array<[number, number]> = [
      [8 * 64 + 120, 8 * 64 + 120],
      [16 * 64 + 100, 16 * 64 + 100],
      [24 * 64 + 80, 8 * 64 + 140],
      [8 * 64 + 140, 24 * 64 + 80],
      [32 * 64 + 100, 32 * 64 + 100],
      [40 * 64 + 120, 16 * 64 + 120],
      [16 * 64 + 120, 40 * 64 + 120],
      [48 * 64 + 100, 48 * 64 + 100],
      [24 * 64 + 120, 24 * 64 + 120],
      [32 * 64 + 80, 48 * 64 + 80]
    ];

    for (const [fx, fy] of parkLocations) {
      const flockSize = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < flockSize; i++) {
        const px = fx + (Math.random() - 0.5) * 45;
        const py = fy + (Math.random() - 0.5) * 45;
        this.pigeons.push({
          x: px,
          y: py,
          homeX: px,
          homeY: py,
          vx: 0,
          vy: 0,
          angle: Math.random() * Math.PI * 2,
          altitude: 0,
          isFlying: false,
          flyTimer: 0,
          peckTimer: Math.random() * 3,
          flapCycle: Math.random() * Math.PI * 2
        });
      }
    }
  }

  update(
    dt: number,
    cars: Car[],
    playerX: number,
    playerY: number,
    playerSpeed: number
  ): void {
    for (const p of this.pigeons) {
      p.flapCycle += dt * (p.isFlying ? 28 : 3);

      // Check for approaching threats (player or cars)
      if (!p.isFlying) {
        let scaringDistance = 0;
        let threatX = 0;
        let threatY = 0;

        // Player threat
        const distToPlayer = Math.hypot(p.x - playerX, p.y - playerY);
        if (distToPlayer < 65 || (distToPlayer < 110 && playerSpeed > 50)) {
          scaringDistance = distToPlayer;
          threatX = playerX;
          threatY = playerY;
        }

        // Cars threat
        if (scaringDistance === 0) {
          for (const car of cars) {
            const dist = Math.hypot(p.x - car.x, p.y - car.y);
            if (dist < 85 && Math.abs(car.speed) > 40) {
              scaringDistance = dist;
              threatX = car.x;
              threatY = car.y;
              break;
            }
          }
        }

        if (scaringDistance > 0) {
          // Take off in panic!
          p.isFlying = true;
          p.flyTimer = 4.0 + Math.random() * 2.5;
          const fleeAngle = Math.atan2(p.y - threatY, p.x - threatX) + (Math.random() - 0.5) * 0.5;
          p.angle = fleeAngle;
          const flySpeed = 160 + Math.random() * 60;
          p.vx = Math.cos(fleeAngle) * flySpeed;
          p.vy = Math.sin(fleeAngle) * flySpeed;
        } else {
          // On ground: occasional pecking & small hopping
          p.peckTimer -= dt;
          if (p.peckTimer <= 0) {
            p.peckTimer = 1.5 + Math.random() * 2.5;
            p.angle += (Math.random() - 0.5) * 1.2;
            if (Math.random() < 0.4) {
              p.x += Math.cos(p.angle) * 3;
              p.y += Math.sin(p.angle) * 3;
            }
          }
        }
      } else {
        // Flying state
        p.flyTimer -= dt;

        // Altitude rise & descent
        if (p.flyTimer > 1.2) {
          p.altitude = Math.min(26, p.altitude + dt * 32);
        } else {
          p.altitude = Math.max(0, p.altitude - dt * 26);
        }

        // Steer back towards home when timer is low
        if (p.flyTimer < 2.5) {
          const toHomeAngle = Math.atan2(p.homeY - p.y, p.homeX - p.x);
          let diff = toHomeAngle - p.angle;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          p.angle += diff * Math.min(dt * 3.5, 1.0);
          const currentSpeed = Math.hypot(p.vx, p.vy);
          p.vx = Math.cos(p.angle) * currentSpeed;
          p.vy = Math.sin(p.angle) * currentSpeed;
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (p.flyTimer <= 0 && p.altitude <= 0.5) {
          // Landed
          p.isFlying = false;
          p.altitude = 0;
          p.vx = 0;
          p.vy = 0;
          p.peckTimer = 2.0;
        }
      }
    }
  }

  render(batch: SpriteBatch, atlas: TextureAtlas): void {
    const pigeonUV = atlas.getUVs('pigeon');
    const shadowUV = atlas.getUVs('cloud_shadow');

    for (const p of this.pigeons) {
      if (p.isFlying) {
        // Shadow cast on ground depends on altitude
        const shadowDist = p.altitude * 1.3;
        const shadowScale = Math.max(8, 16 - p.altitude * 0.25);
        batch.drawRegion(
          shadowUV,
          p.x + shadowDist * 0.6,
          p.y + shadowDist * 0.8,
          shadowScale,
          shadowScale,
          0,
          0.5,
          0.5,
          0,
          0,
          0,
          Math.max(0.12, 0.4 - p.altitude * 0.01)
        );

        // Flying bird with wing flap
        const flapWobble = Math.sin(p.flapCycle) * 0.28;
        const birdScale = 18 + p.altitude * 0.15;
        batch.drawRegion(
          pigeonUV,
          p.x,
          p.y,
          birdScale,
          birdScale,
          p.angle + flapWobble,
          0.5,
          0.5,
          1,
          1,
          1,
          1
        );
      } else {
        // Ground shadow
        batch.drawRegion(
          shadowUV,
          p.x + 2,
          p.y + 2,
          10,
          10,
          0,
          0.5,
          0.5,
          0,
          0,
          0,
          0.35
        );

        // Ground pigeon with subtle pecking head bob
        const peckBob = Math.sin(p.flapCycle) * 0.08;
        batch.drawRegion(
          pigeonUV,
          p.x,
          p.y,
          15,
          15,
          p.angle + peckBob,
          0.5,
          0.5,
          1,
          1,
          1,
          1
        );
      }
    }
  }
}
