import { SpriteBatch } from '../graphics/SpriteBatch';
import { TextureAtlas } from '../graphics/TextureAtlas';
import { Camera } from '../camera/Camera';

export type WeatherType = 'clear' | 'rain' | 'storm' | 'fog';

interface RainDrop {
  x: number;
  y: number;
  speed: number;
  length: number;
  alpha: number;
  wind: number;
}

interface RainSplash {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export class WeatherTimeSystem {
  // Time of Day (0.00 to 24.00, starting at 12:00 Noon)
  timeHours = 12.0;
  timeSpeed = 0.5; // 1 real second = 0.5 in-game minutes (~48 real minutes for a 24h cycle)

  // Current Weather
  weather: WeatherType = 'clear';

  // Rain particles
  private rainDrops: RainDrop[] = [];
  private rainSplashes: RainSplash[] = [];
  private readonly maxRainDrops = 350;

  // Storm / Lightning
  private lightningTimer = 0;
  private lightningFlash = 0; // 0 to 1 intensity

  // Fog drift offset
  private fogTime = 0;

  constructor() {
    // Pre-populate rain pool
    for (let i = 0; i < this.maxRainDrops; i++) {
      this.rainDrops.push({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        speed: 700 + Math.random() * 400,
        length: 14 + Math.random() * 12,
        alpha: 0.4 + Math.random() * 0.4,
        wind: 0.16 + Math.random() * 0.18
      });
    }
    this.lightningTimer = 8 + Math.random() * 10;
  }

  get isNight(): boolean {
    return this.timeHours >= 20.5 || this.timeHours < 5.5;
  }

  get isDusk(): boolean {
    return this.timeHours >= 17.5 && this.timeHours < 20.5;
  }

  get isDawn(): boolean {
    return this.timeHours >= 5.5 && this.timeHours < 8.0;
  }

  get formattedTime(): string {
    const totalMinutes = Math.floor(this.timeHours * 60) % (24 * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  setTime(hours: number): void {
    this.timeHours = ((hours % 24) + 24) % 24;
  }

  setWeather(w: WeatherType): void {
    this.weather = w;
    if (w === 'storm') {
      this.lightningTimer = 3 + Math.random() * 5;
    }
  }

  update(dt: number, camera: Camera): void {
    // 1. Advance Clock
    this.timeHours = (this.timeHours + (dt * this.timeSpeed) / 60) % 24;
    this.fogTime += dt * 0.25;

    // 2. Weather Updates
    if (this.weather === 'rain' || this.weather === 'storm') {
      const bounds = camera.getVisibleBounds();
      const margin = 200;

      // Update rain drops
      const dropCount = this.weather === 'storm' ? this.maxRainDrops : Math.floor(this.maxRainDrops * 0.6);
      for (let i = 0; i < dropCount; i++) {
        const drop = this.rainDrops[i];
        drop.y += drop.speed * dt;
        const wind = this.weather === 'storm' ? drop.wind * 2.2 : drop.wind;
        drop.x += drop.speed * wind * dt;

        // Recycle if out of visible view
        if (drop.y > bounds.maxY + margin || drop.x > bounds.maxX + margin) {
          drop.y = bounds.minY - margin + Math.random() * 50;
          drop.x = bounds.minX - margin + Math.random() * (bounds.maxX - bounds.minX + margin * 2);

          // Random splash
          if (Math.random() < 0.25 && this.rainSplashes.length < 60) {
            this.rainSplashes.push({
              x: drop.x,
              y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY),
              radius: 1,
              maxRadius: 7 + Math.random() * 8,
              alpha: this.weather === 'storm' ? 0.72 : 0.52
            });
          }
        }
      }

      // Update splashes
      for (let i = this.rainSplashes.length - 1; i >= 0; i--) {
        const sp = this.rainSplashes[i];
        sp.radius += dt * 28;
        sp.alpha -= dt * 3.5;
        if (sp.alpha <= 0 || sp.radius >= sp.maxRadius) {
          this.rainSplashes.splice(i, 1);
        }
      }

      // Lightning in storms
      if (this.weather === 'storm') {
        this.lightningTimer -= dt;
        if (this.lightningTimer <= 0) {
          this.lightningFlash = 1.0;
          this.lightningTimer = 6 + Math.random() * 12;
          camera.addShake(8, 0.35);
        }
      }
    }

    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 5.0);
    }
  }

  getAmbientOverlayColor(): [number, number, number, number] {
    // Base ambient color by time of day
    // Returns [r, g, b, alpha]
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;

    const t = this.timeHours;

    if (t >= 0 && t < 5.0) {
      // Midnight / Late Night
      r = 0.05; g = 0.08; b = 0.22; a = 0.68;
    } else if (t >= 5.0 && t < 7.5) {
      // Dawn / Sunrise
      const f = (t - 5.0) / 2.5;
      r = 0.75 - f * 0.3;
      g = 0.45 + f * 0.3;
      b = 0.4 + f * 0.4;
      a = 0.55 * (1.0 - f);
    } else if (t >= 7.5 && t < 17.5) {
      // Bright Day
      r = 1.0; g = 1.0; b = 1.0; a = 0.0;
    } else if (t >= 17.5 && t < 20.5) {
      // Dusk / Sunset
      const f = (t - 17.5) / 3.0;
      r = 0.85 - f * 0.55;
      g = 0.45 - f * 0.25;
      b = 0.25 + f * 0.1;
      a = 0.15 + f * 0.45;
    } else {
      // Evening into Night
      const f = (t - 20.5) / 3.5;
      r = 0.05; g = 0.08; b = 0.22;
      a = 0.60 + f * 0.08;
    }

    // Weather modifications
    if (this.weather === 'rain') {
      a = Math.min(0.85, a + 0.22);
      r = Math.min(r, 0.18);
      g = Math.min(g, 0.22);
      b = Math.max(b, 0.28);
    } else if (this.weather === 'storm') {
      a = Math.min(0.92, a + 0.35);
      r = Math.min(r, 0.1);
      g = Math.min(g, 0.14);
      b = Math.max(b, 0.25);
    } else if (this.weather === 'fog') {
      a = Math.min(0.75, a + 0.35);
      r = 0.65;
      g = 0.70;
      b = 0.75;
    }

    return [r, g, b, a];
  }

  render(batch: SpriteBatch, atlas: TextureAtlas, bounds: { minX: number; maxX: number; minY: number; maxY: number }): void {
    const whiteUV = atlas.getUVs('white');
    const lightHaloUV = atlas.getUVs('light_halo');
    const w = bounds.maxX - bounds.minX + 100;
    const h = bounds.maxY - bounds.minY + 100;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;

    // 1. Fullscreen Ambient Light & Day/Night Overlay
    const [ar, ag, ab, aa] = this.getAmbientOverlayColor();
    if (aa > 0.02) {
      batch.drawRegion(whiteUV, cx, cy, w, h, 0, 0.5, 0.5, ar, ag, ab, aa);
    }

    // 2. Thunder / Lightning Flash
    if (this.lightningFlash > 0.01) {
      batch.drawRegion(
        whiteUV,
        cx,
        cy,
        w,
        h,
        0,
        0.5,
        0.5,
        1.0,
        1.0,
        1.0,
        this.lightningFlash * 0.88
      );
    }

    // 3. Fog Volumetric Patches
    if (this.weather === 'fog') {
      const patchSize = 480;
      const startX = Math.floor(bounds.minX / patchSize) * patchSize;
      const startY = Math.floor(bounds.minY / patchSize) * patchSize;

      for (let px = startX - patchSize; px <= bounds.maxX + patchSize; px += patchSize) {
        for (let py = startY - patchSize; py <= bounds.maxY + patchSize; py += patchSize) {
          const driftX = Math.sin(this.fogTime + px * 0.01) * 35;
          const driftY = Math.cos(this.fogTime + py * 0.01) * 35;
          batch.drawRegion(
            lightHaloUV,
            px + driftX,
            py + driftY,
            patchSize * 1.5,
            patchSize * 1.5,
            0,
            0.5,
            0.5,
            0.78,
            0.82,
            0.88,
            0.28
          );
        }
      }
    }

    // 4. Rain Streaks & Splashes
    if (this.weather === 'rain' || this.weather === 'storm') {
      const dropCount = this.weather === 'storm' ? this.maxRainDrops : Math.floor(this.maxRainDrops * 0.6);
      for (let i = 0; i < dropCount; i++) {
        const drop = this.rainDrops[i];
        if (
          drop.x >= bounds.minX - 50 &&
          drop.x <= bounds.maxX + 50 &&
          drop.y >= bounds.minY - 50 &&
          drop.y <= bounds.maxY + 50
        ) {
          const slantX = drop.length * 0.28;
          batch.drawLine(
            whiteUV,
            drop.x,
            drop.y,
            drop.x + slantX,
            drop.y + drop.length,
            this.weather === 'storm' ? 2.2 : 1.4,
            0.75,
            0.85,
            1.0,
            drop.alpha * (this.weather === 'storm' ? 1.15 : 0.9)
          );
        }
      }

      // Splashes on ground
      for (const sp of this.rainSplashes) {
        batch.drawLine(
          whiteUV,
          sp.x - sp.radius,
          sp.y,
          sp.x + sp.radius,
          sp.y,
          1.1,
          0.55,
          0.78,
          1.0,
          sp.alpha * 0.5
        );
        batch.drawRegion(
          lightHaloUV,
          sp.x,
          sp.y,
          sp.radius * 2,
          sp.radius * 2,
          0,
          0.5,
          0.5,
          0.7,
          0.85,
          1.0,
          sp.alpha * 0.6
        );
      }
    }
  }
}
