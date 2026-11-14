import { SpriteBatch } from '../graphics/SpriteBatch';
import { TextureAtlas } from '../graphics/TextureAtlas';
import { Camera } from '../camera/Camera';
import { Car } from '../physics/Car';
import { CityMap } from '../world/CityMap';
import { Pedestrian } from '../world/Pedestrian';
import { Player } from '../world/Player';
import { TileType } from '../types';

export type WeaponType = 'fist' | 'pistol' | 'uzi' | 'shotgun' | 'rocket';

export interface WeaponDef {
  type: WeaponType;
  name: string;
  iconAtlasKey: string;
  code: string;
  damage: number;
  fireRate: number; // Seconds between shots
  spread: number; // Angle spread in radians
  bulletSpeed: number;
  bulletsPerShot: number;
  range: number;
  maxAmmo: number;
  isAutomatic: boolean;
  isExplosive?: boolean;
}

export const WEAPON_DEFS: Record<WeaponType, WeaponDef> = {
  fist: {
    type: 'fist',
    name: 'Fists',
    iconAtlasKey: 'icon_fist',
    code: 'FIST',
    damage: 24,
    fireRate: 0.35,
    spread: 0,
    bulletSpeed: 80,
    bulletsPerShot: 1,
    range: 38,
    maxAmmo: 999,
    isAutomatic: false
  },
  pistol: {
    type: 'pistol',
    name: 'Pistol 9mm',
    iconAtlasKey: 'icon_pistol',
    code: '9MM',
    damage: 34,
    fireRate: 0.22,
    spread: 0.04,
    bulletSpeed: 1050,
    bulletsPerShot: 1,
    range: 650,
    maxAmmo: 150,
    isAutomatic: false
  },
  uzi: {
    type: 'uzi',
    name: 'Micro Uzi SMG',
    iconAtlasKey: 'icon_uzi',
    code: 'UZI',
    damage: 22,
    fireRate: 0.08,
    spread: 0.12,
    bulletSpeed: 980,
    bulletsPerShot: 1,
    range: 580,
    maxAmmo: 400,
    isAutomatic: true
  },
  shotgun: {
    type: 'shotgun',
    name: 'Pump Shotgun',
    iconAtlasKey: 'icon_shotgun',
    code: 'SHT',
    damage: 18, // 18 x 6 = 108 close-range blast!
    fireRate: 0.65,
    spread: 0.26,
    bulletSpeed: 920,
    bulletsPerShot: 6,
    range: 480,
    maxAmmo: 60,
    isAutomatic: false
  },
  rocket: {
    type: 'rocket',
    name: 'RPG Launcher',
    iconAtlasKey: 'icon_rocket',
    code: 'RPG',
    damage: 300,
    fireRate: 1.1,
    spread: 0.02,
    bulletSpeed: 640,
    bulletsPerShot: 1,
    range: 920,
    maxAmmo: 20,
    isAutomatic: false,
    isExplosive: true
  }
};

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  damage: number;
  distTraveled: number;
  maxRange: number;
  isExplosive: boolean;
}

interface Explosion {
  x: number;
  y: number;
  radius: number;
  damage: number;
  progress: number; // 0 to 1
  duration: number;
}

interface ScorchMark {
  x: number;
  y: number;
  alpha: number;
  scale: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: [number, number, number];
}

interface WeaponPickup {
  x: number;
  y: number;
  type: WeaponType | 'health';
  amount: number;
  active: boolean;
  respawnTimer: number;
}

export class WeaponSystem {
  currentWeapon: WeaponType = 'pistol';
  infiniteAmmo = false;

  readonly ammo: Record<WeaponType, number> = {
    fist: 999,
    pistol: 80,
    uzi: 150,
    shotgun: 24,
    rocket: 8
  };

  private fireCooldown = 0;
  private muzzleFlashTimer = 0;
  private muzzleFlashPos: [number, number, number] | null = null; // x, y, angle

  private bullets: Bullet[] = [];
  private explosions: Explosion[] = [];
  private scorchMarks: ScorchMark[] = [];
  private sparks: Spark[] = [];
  private pickups: WeaponPickup[] = [];

  constructor(map?: CityMap) {
    if (map) {
      this.initPickupsOnGrass(map);
    }
  }

  /**
   * Generates weapon and health pickups exclusively on grass tiles (parks and green plazas).
   * Pickups will never be placed on roads or sidewalks.
   */
  initPickupsOnGrass(map: CityMap): void {
    this.pickups = [];
    const grassTiles = map.getGrassTiles();
    if (grassTiles.length === 0) return;

    const S = map.tileSize;
    const defs: Array<{ type: WeaponType | 'health'; amount: number }> = [
      { type: 'health', amount: 50 },
      { type: 'health', amount: 50 },
      { type: 'uzi', amount: 120 },
      { type: 'shotgun', amount: 20 },
      { type: 'rocket', amount: 5 },
      { type: 'health', amount: 50 },
      { type: 'pistol', amount: 80 },
      { type: 'uzi', amount: 150 },
      { type: 'shotgun', amount: 24 },
      { type: 'rocket', amount: 6 }
    ];

    const targetPickups = 36;
    const step = Math.max(1, Math.floor(grassTiles.length / targetPickups));

    for (let i = 0; i < grassTiles.length && this.pickups.length < targetPickups; i += step) {
      const tile = grassTiles[i];
      // STRICT CHECK: Tile MUST be GRASS, never ROAD, SIDEWALK, or BUILDING
      if (map.getTile(tile.c, tile.r) !== TileType.GRASS) continue;

      const def = defs[this.pickups.length % defs.length];
      this.pickups.push({
        x: tile.c * S + S / 2,
        y: tile.r * S + S / 2,
        type: def.type,
        amount: def.amount,
        active: true,
        respawnTimer: 0
      });
    }
  }

  /**
   * Spawns a pickup on the nearest grass tile to a given coordinate or on a random grass tile.
   */
  spawnPickupOnGrass(
    map: CityMap,
    type: WeaponType | 'health',
    amount?: number,
    nearX?: number,
    nearY?: number
  ): { x: number; y: number } | null {
    let pos: { x: number; y: number } | null = null;
    if (nearX !== undefined && nearY !== undefined) {
      pos = map.getNearestGrassPosition(nearX, nearY);
    }

    if (!pos) {
      const grassTiles = map.getGrassTiles();
      if (grassTiles.length > 0) {
        const randTile = grassTiles[Math.floor(Math.random() * grassTiles.length)];
        pos = {
          x: randTile.c * map.tileSize + map.tileSize / 2,
          y: randTile.r * map.tileSize + map.tileSize / 2
        };
      }
    }

    if (!pos) return null;

    const defaultAmounts: Record<WeaponType | 'health', number> = {
      health: 50,
      fist: 999,
      pistol: 80,
      uzi: 150,
      shotgun: 24,
      rocket: 6
    };

    this.pickups.push({
      x: pos.x,
      y: pos.y,
      type,
      amount: amount ?? defaultAmounts[type],
      active: true,
      respawnTimer: 0
    });

    return pos;
  }

  spawnRandomGrassPickups(map: CityMap, count: number): void {
    const types: Array<WeaponType | 'health'> = ['health', 'uzi', 'shotgun', 'rocket', 'pistol'];
    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      this.spawnPickupOnGrass(map, type);
    }
  }

  setWeapon(type: WeaponType): void {
    this.currentWeapon = type;
  }

  cycleWeapon(direction: number): void {
    const list: WeaponType[] = ['fist', 'pistol', 'uzi', 'shotgun', 'rocket'];
    let idx = list.indexOf(this.currentWeapon);
    idx = (idx + direction + list.length) % list.length;
    this.currentWeapon = list[idx];
  }

  tryShoot(
    fromX: number,
    fromY: number,
    aimAngle: number,
    camera: Camera
  ): boolean {
    if (this.fireCooldown > 0) return false;

    const def = WEAPON_DEFS[this.currentWeapon];
    if (!this.infiniteAmmo && this.ammo[this.currentWeapon] <= 0 && !['fist', 'pistol'].includes(this.currentWeapon)) {
      // Out of ammo for current weapon, fallback to pistol
      this.currentWeapon = 'pistol';
      return false;
    }

    if (!this.infiniteAmmo) {
      if (this.currentWeapon !== 'fist' && (this.currentWeapon !== 'pistol' || this.ammo.pistol > 0)) {
        this.ammo[this.currentWeapon] = Math.max(0, this.ammo[this.currentWeapon] - 1);
      }
    }

    this.fireCooldown = def.fireRate;

    // Camera recoil punch
    const recoil = def.isExplosive ? 6 : def.bulletsPerShot > 1 ? 4 : 2;
    camera.addShake(recoil, 0.15);

    // Muzzle flash at gun tip
    const gunOffset = 18;
    const muzzleX = fromX + Math.cos(aimAngle) * gunOffset;
    const muzzleY = fromY + Math.sin(aimAngle) * gunOffset;
    this.muzzleFlashPos = [muzzleX, muzzleY, aimAngle];
    this.muzzleFlashTimer = 0.06;

    // Spawn projectile(s)
    for (let i = 0; i < def.bulletsPerShot; i++) {
      const spreadOffset = (Math.random() - 0.5) * def.spread;
      const bulletAngle = aimAngle + spreadOffset;
      const speed = def.bulletSpeed * (0.95 + Math.random() * 0.1);

      this.bullets.push({
        x: muzzleX,
        y: muzzleY,
        vx: Math.cos(bulletAngle) * speed,
        vy: Math.sin(bulletAngle) * speed,
        angle: bulletAngle,
        damage: def.damage,
        distTraveled: 0,
        maxRange: def.range,
        isExplosive: !!def.isExplosive
      });
    }

    return true;
  }

  triggerExplosion(
    x: number,
    y: number,
    radius: number,
    damage: number,
    camera: Camera
  ): void {
    this.explosions.push({
      x,
      y,
      radius,
      damage,
      progress: 0,
      duration: 0.45
    });

    // Lingering scorch crater on ground
    if (this.scorchMarks.length > 50) this.scorchMarks.shift();
    this.scorchMarks.push({
      x,
      y,
      alpha: 0.85,
      scale: radius * 0.75
    });

    // Heavy explosion screen shake!
    camera.addShake(16, 0.45);

    // Blast spark debris
    for (let i = 0; i < 20; i++) {
      const spAngle = Math.random() * Math.PI * 2;
      const spSpeed = 150 + Math.random() * 260;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(spAngle) * spSpeed,
        vy: Math.sin(spAngle) * spSpeed,
        alpha: 1.0,
        color: [1.0, 0.5 + Math.random() * 0.4, 0.1]
      });
    }
  }

  update(
    dt: number,
    map: CityMap,
    allCars: Car[],
    pedestrians: Pedestrian[],
    player: Player,
    camera: Camera,
    onScoreAdd: (score: number, toast?: string) => void,
    onWantedAdd: () => void
  ): void {
    if (this.fireCooldown > 0) {
      this.fireCooldown -= dt;
    }

    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.muzzleFlashTimer <= 0) {
        this.muzzleFlashPos = null;
      }
    }

    // 1. Update Projectiles
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      const stepX = b.vx * dt;
      const stepY = b.vy * dt;
      b.x += stepX;
      b.y += stepY;
      b.distTraveled += Math.hypot(stepX, stepY);

      let bulletDestroyed = false;

      // Rocket smoke trail
      if (b.isExplosive && Math.random() < 0.6) {
        this.sparks.push({
          x: b.x - Math.cos(b.angle) * 12,
          y: b.y - Math.sin(b.angle) * 12,
          vx: (Math.random() - 0.5) * 20,
          vy: (Math.random() - 0.5) * 20,
          alpha: 0.6,
          color: [0.85, 0.85, 0.85]
        });
      }

      // Check map obstacle collision (building / wall)
      const tileC = Math.floor(b.x / map.tileSize);
      const tileR = Math.floor(b.y / map.tileSize);
      if (map.isSolid(tileC, tileR)) {
        bulletDestroyed = true;
        if (b.isExplosive) {
          this.triggerExplosion(b.x, b.y, 95, b.damage, camera);
        } else {
          // Ricochet sparks
          for (let s = 0; s < 4; s++) {
            this.sparks.push({
              x: b.x,
              y: b.y,
              vx: -b.vx * 0.3 + (Math.random() - 0.5) * 120,
              vy: -b.vy * 0.3 + (Math.random() - 0.5) * 120,
              alpha: 0.9,
              color: [1.0, 0.9, 0.3]
            });
          }
        }
      }

      // Check Cars collision
      if (!bulletDestroyed) {
        for (const car of allCars) {
          if (car.isWreck) continue;
          const dist = Math.hypot(car.x - b.x, car.y - b.y);
          if (dist < car.width * 0.45) {
            bulletDestroyed = true;
            const isProtectedPlayerCar = car.isPlayerControlled && player.isGodMode;
            if (b.isExplosive) {
              if (!isProtectedPlayerCar) {
                car.takeDamage(b.damage);
                car.explode();
              }
              this.triggerExplosion(car.x, car.y, 110, b.damage, camera);
              onScoreAdd(300, `DESTROYED ${car.config.name.toUpperCase()}! +300`);
              onWantedAdd();
            } else {
              if (!isProtectedPlayerCar) {
                const destroyed = car.takeDamage(b.damage);
                if (destroyed) {
                  onScoreAdd(150, `${car.config.name.toUpperCase()} ON FIRE!`);
                }
              }
              // Impact sparks
              for (let s = 0; s < 5; s++) {
                this.sparks.push({
                  x: b.x,
                  y: b.y,
                  vx: (Math.random() - 0.5) * 160,
                  vy: (Math.random() - 0.5) * 160,
                  alpha: 1.0,
                  color: [1.0, 0.8, 0.2]
                });
              }
            }
            break;
          }
        }
      }

      // Check Pedestrians collision
      if (!bulletDestroyed) {
        for (const ped of pedestrians) {
          if (!ped.alive) continue;
          const dist = Math.hypot(ped.x - b.x, ped.y - b.y);
          if (dist < 18) {
            bulletDestroyed = true;
            ped.alive = false;
            if (b.isExplosive) {
              this.triggerExplosion(b.x, b.y, 85, b.damage, camera);
            }
            onScoreAdd(100);
            if (Math.random() < 0.45) {
              onWantedAdd();
            }
            // Blood / impact sparks
            for (let s = 0; s < 6; s++) {
              this.sparks.push({
                x: b.x,
                y: b.y,
                vx: (Math.random() - 0.5) * 140,
                vy: (Math.random() - 0.5) * 140,
                alpha: 1.0,
                color: [0.9, 0.15, 0.15]
              });
            }
            break;
          }
        }
      }

      // Range check
      if (b.distTraveled >= b.maxRange) {
        bulletDestroyed = true;
        if (b.isExplosive) {
          this.triggerExplosion(b.x, b.y, 85, b.damage, camera);
        }
      }

      if (bulletDestroyed) {
        this.bullets.splice(i, 1);
      }
    }

    // 2. Update Explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const ex = this.explosions[i];
      ex.progress += dt / ex.duration;

      // Blast damage on first frame
      if (ex.progress < dt * 2.5) {
        // Damage cars in radius
        for (const car of allCars) {
          if (car.isWreck) continue;
          const dist = Math.hypot(car.x - ex.x, car.y - ex.y);
          if (dist < ex.radius * 1.35) {
            if (!car.isPlayerControlled || !player.isGodMode) {
              car.takeDamage(150);
            }
            // Push car away violently
            const pushAngle = Math.atan2(car.y - ex.y, car.x - ex.x);
            car.vx += Math.cos(pushAngle) * 320;
            car.vy += Math.sin(pushAngle) * 320;
          }
        }

        // Kill pedestrians in radius
        for (const ped of pedestrians) {
          if (!ped.alive) continue;
          const dist = Math.hypot(ped.x - ex.x, ped.y - ex.y);
          if (dist < ex.radius) {
            ped.alive = false;
            onScoreAdd(100);
          }
        }

        // Damage player if caught in explosion
        const distToPlayer = Math.hypot(player.x - ex.x, player.y - ex.y);
        if (distToPlayer < ex.radius && !player.isGodMode) {
          player.health = Math.max(0, player.health - 35);
          const pushAngle = Math.atan2(player.y - ex.y, player.x - ex.x);
          player.x += Math.cos(pushAngle) * 45;
          player.y += Math.sin(pushAngle) * 45;
        }
      }

      if (ex.progress >= 1.0) {
        this.explosions.splice(i, 1);
      }
    }

    // 3. Update Sparks & Smoke
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.alpha -= dt * 2.2;
      if (sp.alpha <= 0) {
        this.sparks.splice(i, 1);
      }
    }

    // 4. Update Weapon Pickups
    for (const p of this.pickups) {
      if (!p.active) {
        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) {
          p.active = true;
        }
      } else {
        // Check player proximity
        const dist = Math.hypot(player.x - p.x, player.y - p.y);
        if (dist < 36) {
          p.active = false;
          p.respawnTimer = 25.0; // 25s respawn

          if (p.type === 'health') {
            player.health = Math.min(100, player.health + p.amount);
            onScoreAdd(50, '+50 HEALTH PACK!');
          } else {
            this.ammo[p.type] = Math.min(
              WEAPON_DEFS[p.type].maxAmmo,
              this.ammo[p.type] + p.amount
            );
            this.currentWeapon = p.type;
            onScoreAdd(
              50,
              `PICKED UP ${WEAPON_DEFS[p.type].name.toUpperCase()} (+${p.amount} AMMO)!`
            );
          }
        }
      }
    }
  }

  render(batch: SpriteBatch, atlas: TextureAtlas, time = 0): void {
    const whiteUV = atlas.getUVs('white');
    const lightHaloUV = atlas.getUVs('light_halo');
    const scorchUV = atlas.getUVs('scorch_mark');
    const rocketUV = atlas.getUVs('projectile_rocket');
    const flashUV = atlas.getUVs('muzzle_flash');
    const pickupHaloUV = atlas.getUVs('pickup_base');

    // 1. Scorch Marks on Pavement
    for (const sm of this.scorchMarks) {
      batch.drawRegion(
        scorchUV,
        sm.x,
        sm.y,
        sm.scale * 2,
        sm.scale * 2,
        0,
        0.5,
        0.5,
        1,
        1,
        1,
        sm.alpha
      );
    }

    // 2. Weapon Pickups (Rotating 2.5D tokens with glowing halos)
    for (const p of this.pickups) {
      if (!p.active) continue;

      const bobY = Math.sin(time * 3.5 + p.x) * 4;
      const glowColor =
        p.type === 'health'
          ? [0.2, 0.95, 0.3]
          : p.type === 'rocket'
          ? [1.0, 0.2, 0.4]
          : p.type === 'shotgun'
          ? [1.0, 0.5, 0.1]
          : [0.95, 0.85, 0.2];

      // Ground glow halo
      batch.drawRegion(
        lightHaloUV,
        p.x,
        p.y + 4,
        48,
        48,
        0,
        0.5,
        0.5,
        glowColor[0],
        glowColor[1],
        glowColor[2],
        0.45
      );

      // Rotating base ring
      batch.drawRegion(
        pickupHaloUV,
        p.x,
        p.y,
        34,
        34,
        time * 2.2,
        0.5,
        0.5,
        glowColor[0],
        glowColor[1],
        glowColor[2],
        0.85
      );

      // Floating weapon/health icon
      const iconKey =
        p.type === 'health' ? 'icon_health' : WEAPON_DEFS[p.type].iconAtlasKey;
      const iconUV = atlas.getUVs(iconKey);
      batch.drawRegion(
        iconUV,
        p.x,
        p.y - 10 + bobY,
        28,
        28,
        0,
        0.5,
        0.5,
        1,
        1,
        1,
        1
      );
    }

    // 3. Projectiles & Bullets
    for (const b of this.bullets) {
      if (b.isExplosive) {
        // Rocket projectile
        batch.drawRegion(
          rocketUV,
          b.x,
          b.y,
          26,
          14,
          b.angle,
          0.5,
          0.5,
          1,
          1,
          1,
          1
        );
        // Rocket exhaust glow
        batch.drawRegion(
          lightHaloUV,
          b.x - Math.cos(b.angle) * 14,
          b.y - Math.sin(b.angle) * 14,
          20,
          20,
          0,
          0.5,
          0.5,
          1.0,
          0.6,
          0.1,
          0.8
        );
      } else {
        // Glowing tracer line bullet
        const tracerLen = 14;
        batch.drawLine(
          whiteUV,
          b.x - Math.cos(b.angle) * tracerLen,
          b.y - Math.sin(b.angle) * tracerLen,
          b.x,
          b.y,
          2.5,
          1.0,
          0.92,
          0.3,
          0.95
        );
      }
    }

    // 4. Muzzle Flash Starburst
    if (this.muzzleFlashPos) {
      const [fx, fy, fa] = this.muzzleFlashPos;
      batch.drawRegion(
        flashUV,
        fx,
        fy,
        24,
        24,
        fa,
        0.5,
        0.5,
        1.0,
        0.95,
        0.5,
        0.95
      );
    }

    // 5. Sparks and Debris
    for (const sp of this.sparks) {
      batch.drawRegion(
        whiteUV,
        sp.x,
        sp.y,
        3.5,
        3.5,
        0,
        0.5,
        0.5,
        sp.color[0],
        sp.color[1],
        sp.color[2],
        sp.alpha
      );
    }

    // 6. Explosions (Expanding fiery shockwave rings & fireball)
    for (const ex of this.explosions) {
      const r = ex.radius * (0.3 + 0.7 * ex.progress);
      const alpha = 1.0 - ex.progress;

      // Outer fireball
      batch.drawRegion(
        lightHaloUV,
        ex.x,
        ex.y,
        r * 2.2,
        r * 2.2,
        0,
        0.5,
        0.5,
        1.0,
        0.35,
        0.05,
        alpha * 0.95
      );

      // Core white-hot blast
      batch.drawRegion(
        lightHaloUV,
        ex.x,
        ex.y,
        r * 1.1,
        r * 1.1,
        0,
        0.5,
        0.5,
        1.0,
        0.95,
        0.7,
        alpha * 0.95
      );
    }
  }
}
