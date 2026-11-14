import { Car } from '../physics/Car';
import { CityMap } from './CityMap';

export interface WantedTier {
  level: number;
  maxCops: number;
  dispatchInterval: number;
  roadblockInterval: number;
  roadblockChance: number;
  evadeTimeNeeded: number;
  toast: string;
}

export const WANTED_TIERS: Record<number, WantedTier> = {
  0: {
    level: 0,
    maxCops: 0,
    dispatchInterval: 999,
    roadblockInterval: 999,
    roadblockChance: 0,
    evadeTimeNeeded: 0,
    toast: 'POLICE PURSUIT CALLED OFF'
  },
  1: {
    level: 1,
    maxCops: 1,
    dispatchInterval: 6.5,
    roadblockInterval: 999,
    roadblockChance: 0,
    evadeTimeNeeded: 8.0,
    toast: 'WANTED LEVEL 1 // PATROL INVESTIGATING'
  },
  2: {
    level: 2,
    maxCops: 3,
    dispatchInterval: 4.5,
    roadblockInterval: 999,
    roadblockChance: 0,
    evadeTimeNeeded: 12.0,
    toast: 'WANTED LEVEL 2 // SQUAD CARS DISPATCHED'
  },
  3: {
    level: 3,
    maxCops: 5,
    dispatchInterval: 3.2,
    roadblockInterval: 18.0,
    roadblockChance: 0.35,
    evadeTimeNeeded: 16.0,
    toast: 'WANTED LEVEL 3 // ROADBLOCKS AUTHORIZED'
  },
  4: {
    level: 4,
    maxCops: 7,
    dispatchInterval: 2.2,
    roadblockInterval: 13.0,
    roadblockChance: 0.55,
    evadeTimeNeeded: 20.0,
    toast: 'WANTED LEVEL 4 // TACTICAL INTERCEPTORS DEPLOYED'
  },
  5: {
    level: 5,
    maxCops: 9,
    dispatchInterval: 1.6,
    roadblockInterval: 9.5,
    roadblockChance: 0.75,
    evadeTimeNeeded: 24.0,
    toast: 'WANTED LEVEL 5 // HEAVY SWAT BARRICADES'
  },
  6: {
    level: 6,
    maxCops: 12,
    dispatchInterval: 1.0,
    roadblockInterval: 7.0,
    roadblockChance: 0.90,
    evadeTimeNeeded: 30.0,
    toast: 'WANTED LEVEL 6 // FULL CITY LOCKDOWN'
  }
};

export class PoliceSystem {
  wantedLevel = 0;
  isEvading = false;
  evadeTimer = 0;
  dispatchTimer = 2.0;
  roadblockTimer = 10.0;

  // Track minor crimes for gradual escalation
  private carHitCount = 0;
  private carHitTimer = 0;
  private pedHitCount = 0;
  private pedHitTimer = 0;

  getTier(): WantedTier {
    return WANTED_TIERS[this.wantedLevel] || WANTED_TIERS[0];
  }

  setWantedLevel(level: number, onToast?: (msg: string, dur?: number) => void): void {
    const clamped = Math.max(0, Math.min(6, level));
    if (this.wantedLevel === clamped) return;

    const oldLevel = this.wantedLevel;
    this.wantedLevel = clamped;
    this.evadeTimer = 0;
    this.isEvading = false;

    if (onToast) {
      if (clamped === 0) {
        onToast('POLICE SEARCH CALLED OFF // PURSUIT CLEARED', 2.5);
      } else if (clamped > oldLevel) {
        const tier = this.getTier();
        onToast(tier.toast, 2.5);
      }
    }
  }

  addWantedLevel(amount = 1, onToast?: (msg: string, dur?: number) => void): void {
    this.setWantedLevel(this.wantedLevel + amount, onToast);
  }

  clear(onToast?: (msg: string, dur?: number) => void): void {
    this.setWantedLevel(0, onToast);
  }

  recordPedestrianHit(onToast?: (msg: string, dur?: number) => void): void {
    this.pedHitCount++;
    this.pedHitTimer = 8.0;
    this.evadeTimer = 0;
    this.isEvading = false;

    if (this.wantedLevel === 0) {
      // First pedestrian hit: 50% chance of gaining 1 star
      if (Math.random() < 0.5) {
        this.setWantedLevel(1, onToast);
      }
    } else if (this.wantedLevel < 6 && (this.pedHitCount >= 2 || Math.random() < 0.45)) {
      this.addWantedLevel(1, onToast);
      this.pedHitCount = 0;
    }
  }

  recordCivilianCarHit(relSpeed: number, onToast?: (msg: string, dur?: number) => void): void {
    if (relSpeed < 120) return;
    this.carHitCount++;
    this.carHitTimer = 10.0;

    if (this.wantedLevel === 0 && this.carHitCount >= 3) {
      this.carHitCount = 0;
      this.setWantedLevel(1, onToast);
      if (onToast) onToast('HIT & RUN REPORTED! 1 STAR', 2.0);
    }
  }

  recordCopCarHit(relSpeed: number, onToast?: (msg: string, dur?: number) => void): void {
    this.evadeTimer = 0;
    this.isEvading = false;

    if (this.wantedLevel === 0) {
      this.setWantedLevel(1, onToast);
      if (onToast) onToast('ASSAULT ON LAW ENFORCEMENT! 1 STAR', 2.5);
    } else if (this.wantedLevel < 6 && Math.abs(relSpeed) > 130 && Math.random() < 0.4) {
      this.addWantedLevel(1, onToast);
    }
  }

  recordCopCarDestroyed(onToast?: (msg: string, dur?: number) => void): void {
    this.evadeTimer = 0;
    this.isEvading = false;
    this.addWantedLevel(1, onToast);
    if (onToast) onToast('POLICE VEHICLE DESTROYED! WANTED LEVEL UP!', 2.2);
  }

  recordGunfire(isNearCops: boolean, onToast?: (msg: string, dur?: number) => void): void {
    this.evadeTimer = 0;
    this.isEvading = false;

    if (this.wantedLevel === 0 && isNearCops) {
      this.setWantedLevel(1, onToast);
      if (onToast) onToast('SHOTS FIRED IN PUBLIC! 1 STAR', 2.5);
    }
  }

  recordCarjackCop(onToast?: (msg: string, dur?: number) => void): void {
    this.setWantedLevel(Math.min(6, Math.max(2, this.wantedLevel + 1)), onToast);
    if (onToast) onToast('POLICE CRUISER CARJACKED! CODE 3 ALERT', 2.5);
  }

  update(
    dt: number,
    cars: Car[],
    activeCar: Car | null,
    playerX: number,
    playerY: number,
    playerVx: number,
    playerVy: number,
    isDriving: boolean,
    isShooting: boolean,
    map: CityMap,
    onToast: (msg: string, dur?: number) => void
  ): void {
    // Crime timers decay
    if (this.carHitTimer > 0) {
      this.carHitTimer -= dt;
      if (this.carHitTimer <= 0) this.carHitCount = 0;
    }
    if (this.pedHitTimer > 0) {
      this.pedHitTimer -= dt;
      if (this.pedHitTimer <= 0) this.pedHitCount = 0;
    }

    // 1. Cleanup inactive, wrecked, or hopelessly distant police cars
    for (let i = cars.length - 1; i >= 0; i--) {
      const c = cars[i];
      if (c.config.isCop && c !== activeCar) {
        const dist = Math.hypot(c.x - playerX, c.y - playerY);
        if (c.isWreck) {
          c.wreckTimer += dt;
          if (c.wreckTimer > 9.0 || dist > 450) {
            cars.splice(i, 1);
          }
        } else if (dist > 1650) {
          // Despawn far away cop cars so new ones can be dispatched near the player
          cars.splice(i, 1);
        }
      }
    }

    if (this.wantedLevel <= 0) {
      this.isEvading = false;
      this.evadeTimer = 0;
      return;
    }

    const tier = this.getTier();

    // 2. Count active living cop cars within pursuit zone (< 1300px)
    const activeCops = cars.filter(
      c => c.config.isCop && c !== activeCar && !c.isWreck && Math.hypot(c.x - playerX, c.y - playerY) < 1350
    );

    // 3. Evasion / Cooldown System
    const searchRadius = isShooting ? 920 : 540;
    const copInSearchRange = activeCops.some(
      cop => Math.hypot(cop.x - playerX, cop.y - playerY) < searchRadius
    );

    if (!copInSearchRange) {
      // No police have visual or audio contact -> player is actively evading!
      this.isEvading = true;
      this.evadeTimer += dt;

      if (this.evadeTimer >= tier.evadeTimeNeeded) {
        // Cooldown period survived! Reduce wanted level by 1 star
        const nextLevel = this.wantedLevel - 1;
        this.setWantedLevel(nextLevel, onToast);
        this.evadeTimer = 0;

        if (nextLevel === 0) {
          onToast('POLICE SEARCH CALLED OFF // PURSUIT EVADED!', 2.5);
        } else {
          onToast(`LOST POLICE CONTACT! 1 STAR CLEARED (${nextLevel} REMAINING)`, 2.2);
        }
      }
    } else {
      // Re-acquired by police unit
      if (this.isEvading && this.evadeTimer > 2.5) {
        onToast('SUSPECT RE-ACQUIRED! POLICE CONVERGING!', 1.8);
      }
      this.isEvading = false;
      this.evadeTimer = 0;
    }

    // 4. Dynamic Gradual Police Dispatching
    if (activeCops.length < tier.maxCops) {
      this.dispatchTimer -= dt;
      if (this.dispatchTimer <= 0) {
        this.dispatchTimer = tier.dispatchInterval;
        this.spawnPursuitCruiser(cars, playerX, playerY, playerVx, playerVy, map);
      }
    } else {
      this.dispatchTimer = Math.min(this.dispatchTimer, tier.dispatchInterval);
    }

    // 5. Roadblock Spawning (Wanted 3+)
    if (this.wantedLevel >= 3 && isDriving) {
      this.roadblockTimer -= dt;
      if (this.roadblockTimer <= 0) {
        this.roadblockTimer = tier.roadblockInterval;
        const playerSpeed = Math.hypot(playerVx, playerVy);
        if (playerSpeed > 80 && Math.random() < tier.roadblockChance) {
          const spawned = this.spawnRoadblockAhead(cars, playerX, playerY, playerVx, playerVy, map);
          if (spawned) {
            onToast('WARNING // POLICE ROADBLOCK REPORTED AHEAD!', 2.2);
          }
        }
      }
    }
  }

  private spawnPursuitCruiser(
    cars: Car[],
    playerX: number,
    playerY: number,
    playerVx: number,
    playerVy: number,
    map: CityMap
  ): void {
    const S = map.tileSize;
    const playerSpeed = Math.hypot(playerVx, playerVy);

    // Prefer spawning along roads biased towards or intersecting the player
    for (let attempt = 0; attempt < 20; attempt++) {
      let angle = Math.random() * Math.PI * 2;
      if (playerSpeed > 40 && Math.random() < 0.6) {
        // Bias towards player travel direction (ambush from ahead)
        const travelAngle = Math.atan2(playerVy, playerVx);
        angle = travelAngle + (Math.random() - 0.5) * 1.6;
      }

      const dist = 680 + Math.random() * 260; // Just off-screen
      const cx = playerX + Math.cos(angle) * dist;
      const cy = playerY + Math.sin(angle) * dist;

      const col = Math.floor(cx / S);
      const row = Math.floor(cy / S);

      if (col < 2 || col >= map.cols - 2 || row < 2 || row >= map.rows - 2) continue;

      // Find nearest road avenue
      const nearestRoadRow = Math.round(row / 8) * 8;
      const nearestRoadCol = Math.round(col / 8) * 8;

      let spawnCol = col;
      let spawnRow = row;
      let isH = true;

      if (Math.abs(row - nearestRoadRow) <= 2) {
        spawnRow = nearestRoadRow;
        isH = true;
      } else if (Math.abs(col - nearestRoadCol) <= 2) {
        spawnCol = nearestRoadCol;
        isH = false;
      } else if (!map.isRoad(spawnCol, spawnRow)) {
        continue;
      }

      if (map.isSolid(spawnCol, spawnRow)) continue;

      let carX = spawnCol * S + S / 2;
      let carY = spawnRow * S + S / 2;
      let carAngle = 0;

      if (isH) {
        const headingEast = playerX > carX;
        carAngle = headingEast ? 0 : Math.PI;
        carY = headingEast ? (spawnRow + 0.68) * S : (spawnRow + 0.32) * S;
      } else {
        const headingSouth = playerY > carY;
        carAngle = headingSouth ? Math.PI / 2 : -Math.PI / 2;
        carX = headingSouth ? (spawnCol + 0.68) * S : (spawnCol + 0.32) * S;
      }

      const copCar = new Car(carX, carY, carAngle, 'cop');
      copCar.hasDriver = true;
      copCar.sirenActive = true;
      // Start car already moving with speed towards player
      const initialSpeed = 200 + Math.min(180, this.wantedLevel * 25);
      copCar.vx = Math.cos(carAngle) * initialSpeed;
      copCar.vy = Math.sin(carAngle) * initialSpeed;

      cars.push(copCar);
      return;
    }
  }

  private spawnRoadblockAhead(
    cars: Car[],
    playerX: number,
    playerY: number,
    playerVx: number,
    playerVy: number,
    map: CityMap
  ): boolean {
    const S = map.tileSize;
    const moveAngle = Math.atan2(playerVy, playerVx);
    const distAhead = 640 + Math.random() * 180;

    const tx = playerX + Math.cos(moveAngle) * distAhead;
    const ty = playerY + Math.sin(moveAngle) * distAhead;

    const col = Math.floor(tx / S);
    const row = Math.floor(ty / S);

    if (col < 2 || col >= map.cols - 2 || row < 2 || row >= map.rows - 2) return false;

    // Snap to nearest road avenue
    const nearestRoadRow = Math.round(row / 8) * 8;
    const nearestRoadCol = Math.round(col / 8) * 8;

    let targetCol = col;
    let targetRow = row;
    let isH = true;

    if (Math.abs(row - nearestRoadRow) <= 2) {
      targetRow = nearestRoadRow;
      isH = true;
    } else if (Math.abs(col - nearestRoadCol) <= 2) {
      targetCol = nearestRoadCol;
      isH = false;
    } else {
      return false;
    }

    if (map.isSolid(targetCol, targetRow)) return false;

    // Spawn 2 roadblock cruisers parked perpendicularly across the road
    if (isH) {
      // Horizontal road: cars placed perpendicular (facing North/South)
      const car1X = targetCol * S + 18;
      const car1Y = targetRow * S + 22;
      const car2X = targetCol * S + 46;
      const car2Y = targetRow * S + 42;

      const rb1 = new Car(car1X, car1Y, Math.PI / 2 + 0.1, 'cop');
      rb1.isRoadblock = true;
      rb1.hasDriver = true;
      rb1.sirenActive = true;

      const rb2 = new Car(car2X, car2Y, -Math.PI / 2 - 0.1, 'cop');
      rb2.isRoadblock = true;
      rb2.hasDriver = true;
      rb2.sirenActive = true;

      cars.push(rb1, rb2);
      return true;
    } else {
      // Vertical road: cars placed perpendicular (facing East/West)
      const car1X = targetCol * S + 22;
      const car1Y = targetRow * S + 18;
      const car2X = targetCol * S + 42;
      const car2Y = targetRow * S + 46;

      const rb1 = new Car(car1X, car1Y, 0.1, 'cop');
      rb1.isRoadblock = true;
      rb1.hasDriver = true;
      rb1.sirenActive = true;

      const rb2 = new Car(car2X, car2Y, Math.PI - 0.1, 'cop');
      rb2.isRoadblock = true;
      rb2.hasDriver = true;
      rb2.sirenActive = true;

      cars.push(rb1, rb2);
      return true;
    }
  }
}
