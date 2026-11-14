import { SpriteBatch } from '../graphics/SpriteBatch';
import { TextureAtlas } from '../graphics/TextureAtlas';
import { SkidMark, TileType } from '../types';
import { CityMap } from '../world/CityMap';

export type CarType =
  | 'sports_red'
  | 'sports_yellow'
  | 'sedan_blue'
  | 'taxi'
  | 'cop'
  | 'muscle_green'
  | 'van_white'
  | 'ambulance';

export interface CarConfig {
  type: CarType;
  name: string;
  atlasKey: string;
  width: number;
  height: number;
  maxSpeed: number;
  maxReverseSpeed: number;
  acceleration: number;
  reverseAcceleration: number;
  brakingPower: number;
  rollResistance: number;
  steerSensitivity: number;
  mass: number;
  isCop?: boolean;
}

export const CAR_CONFIGS: Record<CarType, CarConfig> = {
  sports_red: {
    type: 'sports_red',
    name: 'Red Beast',
    atlasKey: 'car_sports_red',
    width: 56,
    height: 30,
    maxSpeed: 520,
    maxReverseSpeed: -160,
    acceleration: 390,
    reverseAcceleration: 220,
    brakingPower: 560,
    rollResistance: 0.985,
    steerSensitivity: 3.2,
    mass: 1.0
  },
  sports_yellow: {
    type: 'sports_yellow',
    name: 'Viper GT',
    atlasKey: 'car_sports_yellow',
    width: 56,
    height: 30,
    maxSpeed: 550,
    maxReverseSpeed: -170,
    acceleration: 420,
    reverseAcceleration: 230,
    brakingPower: 580,
    rollResistance: 0.986,
    steerSensitivity: 3.4,
    mass: 0.95
  },
  sedan_blue: {
    type: 'sedan_blue',
    name: 'Kuruma Sedan',
    atlasKey: 'car_sedan_blue',
    width: 56,
    height: 30,
    maxSpeed: 440,
    maxReverseSpeed: -140,
    acceleration: 320,
    reverseAcceleration: 200,
    brakingPower: 520,
    rollResistance: 0.984,
    steerSensitivity: 2.8,
    mass: 1.1
  },
  taxi: {
    type: 'taxi',
    name: 'City Cab',
    atlasKey: 'car_taxi',
    width: 56,
    height: 30,
    maxSpeed: 450,
    maxReverseSpeed: -140,
    acceleration: 330,
    reverseAcceleration: 200,
    brakingPower: 530,
    rollResistance: 0.984,
    steerSensitivity: 2.9,
    mass: 1.15
  },
  cop: {
    type: 'cop',
    name: 'Police Cruiser',
    atlasKey: 'car_cop',
    width: 56,
    height: 30,
    maxSpeed: 500,
    maxReverseSpeed: -150,
    acceleration: 360,
    reverseAcceleration: 210,
    brakingPower: 540,
    rollResistance: 0.985,
    steerSensitivity: 3.1,
    mass: 1.25,
    isCop: true
  },
  muscle_green: {
    type: 'muscle_green',
    name: 'Stallion V8',
    atlasKey: 'car_muscle_green',
    width: 56,
    height: 30,
    maxSpeed: 900,
    maxReverseSpeed: -150,
    acceleration: 900,
    reverseAcceleration: 210,
    brakingPower: 500,
    rollResistance: 0.985,
    steerSensitivity: 3.6,
    mass: 1.2
  },
  van_white: {
    type: 'van_white',
    name: 'Pony Van',
    atlasKey: 'car_van_white',
    width: 58,
    height: 32,
    maxSpeed: 380,
    maxReverseSpeed: -120,
    acceleration: 260,
    reverseAcceleration: 180,
    brakingPower: 480,
    rollResistance: 0.982,
    steerSensitivity: 2.3,
    mass: 1.55
  },
  ambulance: {
    type: 'ambulance',
    name: 'City Ambulance',
    atlasKey: 'car_ambulance',
    width: 60,
    height: 32,
    maxSpeed: 470,
    maxReverseSpeed: -140,
    acceleration: 340,
    reverseAcceleration: 200,
    brakingPower: 540,
    rollResistance: 0.984,
    steerSensitivity: 2.9,
    mass: 1.4
  }
};

export class Car {
  x = 0;
  y = 0;
  angle = 0; // In radians, 0 is pointing East (+X)

  // Velocity components in world space
  vx = 0;
  vy = 0;

  // Steering & angular dynamics
  steerAngle = 0;
  angularVelocity = 0;

  readonly config: CarConfig;
  readonly width: number;
  readonly height: number;

  isPlayerControlled = false;
  hasDriver = true; // For AI traffic cars, whether a civilian/cop is driving

  // Tuning parameters from config
  readonly maxSpeed: number;
  readonly maxReverseSpeed: number;
  readonly acceleration: number;
  readonly reverseAcceleration: number;
  readonly brakingPower: number;
  readonly rollResistance: number;
  readonly steerSensitivity: number;

  // Drifting state
  isDrifting = false;
  skidMarks: SkidMark[] = [];
  private readonly maxSkidMarks = 1000;

  // Previous tire positions for skid trail rendering
  private prevLeftTire: [number, number] | null = null;
  private prevRightTire: [number, number] | null = null;

  // Health and destruction state
  health = 100;
  readonly maxHealth = 100;
  isBurning = false;
  burnTimer = 0;
  isWreck = false;

  // AI navigation properties
  aiTargetAngle = 0;
  aiCruiseSpeed = 150;
  aiIntersectionCooldown = 0;
  aiStuckTimer = 0;
  sirenActive = false;
  sirenTimer = 0;
  aiRoundaboutExitAngle: number | null = null;
  aiRoundaboutTime = 0;

  constructor(x = 0, y = 0, angle = 0, carType: CarType = 'sports_red') {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.aiTargetAngle = angle;

    this.config = CAR_CONFIGS[carType] || CAR_CONFIGS.sports_red;
    this.width = this.config.width;
    this.height = this.config.height;

    this.maxSpeed = this.config.maxSpeed;
    this.maxReverseSpeed = this.config.maxReverseSpeed;
    this.acceleration = this.config.acceleration;
    this.reverseAcceleration = this.config.reverseAcceleration;
    this.brakingPower = this.config.brakingPower;
    this.rollResistance = this.config.rollResistance;
    this.steerSensitivity = this.config.steerSensitivity;

    // Slight variance in AI cruise speed for realistic city flow
    this.aiCruiseSpeed = 130 + Math.random() * 50;
  }

  get speed(): number {
    const forwardX = Math.cos(this.angle);
    const forwardY = Math.sin(this.angle);
    return this.vx * forwardX + this.vy * forwardY;
  }

  takeDamage(amount: number): boolean {
    if (this.isWreck) return false;
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0 && !this.isBurning) {
      this.isBurning = true;
      this.burnTimer = 1.5;
      return true; // Started burning
    }
    return false;
  }

  explode(): void {
    this.health = 0;
    this.isBurning = false;
    this.isWreck = true;
    this.hasDriver = false;
    this.isPlayerControlled = false;
  }

  update(dt: number, throttle: number, steering: number, handbrake: boolean): void {
    if (this.isWreck) {
      throttle = 0;
      steering = 0;
      handbrake = true;
    } else if (this.isBurning) {
      throttle = 0;
      this.burnTimer -= dt;
      if (this.burnTimer <= 0) {
        this.explode();
      }
    }

    const forwardX = Math.cos(this.angle);
    const forwardY = Math.sin(this.angle);
    const rightX = -Math.sin(this.angle);
    const rightY = Math.cos(this.angle);

    // Decompose current velocity into forward and lateral vectors
    let forwardSpeed = this.vx * forwardX + this.vy * forwardY;
    let lateralSpeed = this.vx * rightX + this.vy * rightY;

    // Acceleration & Braking
    if (throttle > 0) {
      if (forwardSpeed < this.maxSpeed) {
        forwardSpeed += this.acceleration * throttle * dt;
      }
    } else if (throttle < 0) {
      if (forwardSpeed > 20) {
        // Braking while going forward
        forwardSpeed -= this.brakingPower * dt;
      } else if (forwardSpeed > this.maxReverseSpeed) {
        // Reversing
        forwardSpeed += this.reverseAcceleration * throttle * dt;
      }
    }

    // Natural drag / rolling resistance
    forwardSpeed *= Math.pow(this.rollResistance, dt * 60);

    // Lateral grip and drift physics
    const lateralGrip = handbrake ? 0.88 : 0.94;
    if (handbrake) {
      forwardSpeed *= Math.pow(0.96, dt * 60); // Handbrake also slows down car
    }

    lateralSpeed *= Math.pow(1 - lateralGrip, dt * 60);

    // Check drift status
    const driftIntensity = Math.abs(lateralSpeed);
    this.isDrifting =
      (driftIntensity > 40 && Math.abs(forwardSpeed) > 60) ||
      (handbrake && Math.abs(forwardSpeed) > 40);

    // Steering: turn rate depends on forward speed (can't turn while stationary)
    const minSpeedForSteer = 20;
    const steerFactor = Math.min(Math.abs(forwardSpeed) / minSpeedForSteer, 1.0);
    const reverseMultiplier = forwardSpeed < -10 ? -1 : 1;

    let targetAngularVelocity =
      steering * this.steerSensitivity * steerFactor * reverseMultiplier;
    if (handbrake && Math.abs(steering) > 0.1) {
      // Oversteer whip when pulling handbrake!
      targetAngularVelocity *= 1.45;
    }

    this.angularVelocity = targetAngularVelocity;
    this.angle += this.angularVelocity * dt;

    // Reconstruct world velocity
    const newForwardX = Math.cos(this.angle);
    const newForwardY = Math.sin(this.angle);
    const newRightX = -Math.sin(this.angle);
    const newRightY = Math.cos(this.angle);

    this.vx = newForwardX * forwardSpeed + newRightX * lateralSpeed;
    this.vy = newForwardY * forwardSpeed + newRightY * lateralSpeed;

    // Update position
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Skid marks generation
    this.updateSkidMarks(dt, newForwardX, newForwardY, newRightX, newRightY);
  }

  // AI navigation and traffic simulation
  updateAI(
    dt: number,
    map: CityMap,
    allCars: Car[],
    targetX: number,
    targetY: number,
    wantedLevel: number,
    time = 0
  ): void {
    if (this.isPlayerControlled || !this.hasDriver) {
      // Unoccupied or player-controlled car stays parked with handbrake
      if (!this.isPlayerControlled) {
        this.update(dt, 0, 0, true);
      }
      return;
    }

    const S = map.tileSize;
    const tileC = Math.floor(this.x / S);
    const tileR = Math.floor(this.y / S);
    const currentTile = map.getTile(tileC, tileR);

    let throttle = 0.65;
    let steering = 0;

    // 1. Police pursuit mode
    if (this.config.isCop && wantedLevel > 0) {
      this.sirenActive = true;
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 1500) {
        const desiredAngle = Math.atan2(dy, dx);
        let angleDiff = desiredAngle - this.angle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        steering = Math.max(-1, Math.min(1, angleDiff * 2.5));
        throttle = dist > 45 ? 1.0 : -0.2;
        this.update(dt, throttle, steering, false);
        return;
      }
    } else {
      this.sirenActive = false;
    }

    // 2. Normal traffic lane following & intersection logic
    if (this.aiIntersectionCooldown > 0) {
      this.aiIntersectionCooldown -= dt;
    }

    if (currentTile === TileType.ROUNDABOUT) {
      const rb = map.getRoundaboutAt(this.x, this.y);
      if (rb) {
        this.aiRoundaboutTime += dt;
        const dx = this.x - rb.x;
        const dy = this.y - rb.y;
        const dist = Math.hypot(dx, dy);

        // 1. When entering, assign an exit avenue (North: -PI/2, East: 0, South: PI/2, West: PI)
        if (this.aiRoundaboutExitAngle === null) {
          const entryAngle = this.aiTargetAngle;
          const cardinals = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

          // Valid exits: anything that is not a direct 180 deg U-turn
          const validExits = cardinals.filter(ex => {
            let diff = Math.abs(ex - entryAngle);
            while (diff > Math.PI) diff = Math.PI * 2 - diff;
            return diff < Math.PI * 0.8;
          });

          if (validExits.length > 0) {
            // Favor going straight (50%) or taking right / left exits (25% each)
            const straight = validExits.find(ex => {
              let diff = Math.abs(ex - entryAngle);
              while (diff > Math.PI) diff = Math.PI * 2 - diff;
              return diff < 0.25;
            });
            if (straight && Math.random() < 0.5) {
              this.aiRoundaboutExitAngle = straight;
            } else {
              this.aiRoundaboutExitAngle = validExits[Math.floor(Math.random() * validExits.length)];
            }
          } else {
            this.aiRoundaboutExitAngle = entryAngle;
          }
        }

        // 2. Check if we are approaching our designated exit branch
        let isExiting = false;
        const exit = this.aiRoundaboutExitAngle;
        const forceExit = this.aiRoundaboutTime > 3.0;

        // North Exit (-PI/2): car coming from East side (dx > -30, dy < -35)
        if (exit === -Math.PI / 2 || (forceExit && dy < -35)) {
          if (dy < -35 && dx < 50) {
            isExiting = true;
            this.aiTargetAngle = -Math.PI / 2;
          }
        }
        // East Exit (0): car coming from South side (dy > -30, dx > 35)
        if (exit === 0 || (forceExit && dx > 35)) {
          if (dx > 35 && dy > -50) {
            isExiting = true;
            this.aiTargetAngle = 0;
          }
        }
        // South Exit (PI/2): car coming from West side (dx < 30, dy > 35)
        if (exit === Math.PI / 2 || (forceExit && dy > 35)) {
          if (dy > 35 && dx > -50) {
            isExiting = true;
            this.aiTargetAngle = Math.PI / 2;
          }
        }
        // West Exit (PI): car coming from North side (dy < 30, dx < -35)
        if (Math.abs(exit - Math.PI) < 0.1 || Math.abs(exit + Math.PI) < 0.1 || (forceExit && dx < -35)) {
          if (dx < -35 && dy < 50) {
            isExiting = true;
            this.aiTargetAngle = Math.PI;
          }
        }

        // 3. While circulating (not yet exiting), trace the smooth circular counter-clockwise arc
        if (!isExiting) {
          const currentAngle = Math.atan2(dy, dx);
          const tangentAngle = currentAngle - Math.PI / 2;
          const laneRadius = 70;
          const radialCorrection = Math.max(-0.4, Math.min(0.4, (dist - laneRadius) * 0.025));
          this.aiTargetAngle = tangentAngle - radialCorrection;
        }
      }
    } else {
      // Outside roundabout: clear exit memory so car is ready for the next junction
      this.aiRoundaboutExitAngle = null;
      this.aiRoundaboutTime = 0;

      if (currentTile === TileType.ROAD_INTERSECTION && this.aiIntersectionCooldown <= 0) {
        // Choose a direction at the intersection (straight, turn left, or turn right)
        this.aiIntersectionCooldown = 1.8;
        const roll = Math.random();
        if (roll < 0.25) {
          // Turn 90 deg clockwise
          this.aiTargetAngle += Math.PI / 2;
        } else if (roll < 0.5) {
          // Turn 90 deg counter-clockwise
          this.aiTargetAngle -= Math.PI / 2;
        }
        // Normalize target angle to [0, 2PI)
        while (this.aiTargetAngle < 0) this.aiTargetAngle += Math.PI * 2;
        while (this.aiTargetAngle >= Math.PI * 2) this.aiTargetAngle -= Math.PI * 2;
      } else if (currentTile === TileType.ROAD_HORIZONTAL) {
        // East (0) or West (PI)
        const isHeadingEast = Math.cos(this.aiTargetAngle) >= 0;
        this.aiTargetAngle = isHeadingEast ? 0 : Math.PI;
      } else if (currentTile === TileType.ROAD_VERTICAL) {
        // South (PI/2) or North (-PI/2 or 3PI/2)
        const isHeadingSouth = Math.sin(this.aiTargetAngle) >= 0;
        this.aiTargetAngle = isHeadingSouth ? Math.PI / 2 : -Math.PI / 2;
      }
    }

    // Obey traffic lights at regular intersections (roundabouts do not have traffic lights)
    if (currentTile === TileType.ROAD_INTERSECTION && !map.isRoundaboutTile(tileC, tileR)) {
      const lights = map.getTrafficLightPhase(tileC, tileR, time);
      const isHeadingEW = Math.abs(Math.cos(this.aiTargetAngle)) > 0.5;
      const myLight = isHeadingEW ? lights.ew : lights.ns;

      const intersectionCenterX = tileC * S + S / 2;
      const intersectionCenterY = tileR * S + S / 2;
      const distToCenter = Math.hypot(intersectionCenterX - this.x, intersectionCenterY - this.y);

      if (myLight === 'red' && distToCenter > 16 && distToCenter < 65) {
        // Red light! Stop at crosswalk
        throttle = -0.7;
        if (Math.abs(this.speed) < 15) throttle = 0;
      }
    }

    // Normalize angle difference for steering
    let angleDiff = this.aiTargetAngle - this.angle;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    steering = Math.max(-1, Math.min(1, angleDiff * 3.0));

    // Speed management: cruise speed (controlled cruise in roundabouts)
    if (throttle > 0) {
      const targetSpeed = currentTile === TileType.ROUNDABOUT ? 105 : this.aiCruiseSpeed;
      if (this.speed < targetSpeed) {
        throttle = 0.7;
      } else {
        throttle = 0.1;
      }
    }

    // 3. Forward collision avoidance (raycast ahead to check other cars)
    const forwardX = Math.cos(this.angle);
    const forwardY = Math.sin(this.angle);

    for (const other of allCars) {
      if (other === this) continue;

      const toOtherX = other.x - this.x;
      const toOtherY = other.y - this.y;
      const dist = Math.hypot(toOtherX, toOtherY);

      if (dist < 85) {
        const dot = (toOtherX * forwardX + toOtherY * forwardY) / dist;
        if (dot > 0.6) {
          // Another car is directly ahead in our path: brake!
          throttle = -0.6;
          if (dist < 40) throttle = -1.0;
          break;
        }
      }
    }

    // Anti-stuck detection: if AI car is not moving, try backing up slightly
    if (Math.abs(this.speed) < 10) {
      this.aiStuckTimer += dt;
      if (this.aiStuckTimer > 3.0) {
        throttle = -0.5;
        steering = -steering || 0.8;
        if (this.aiStuckTimer > 4.5) {
          this.aiStuckTimer = 0;
          this.aiTargetAngle += Math.PI; // Turn around
        }
      }
    } else {
      this.aiStuckTimer = 0;
    }

    this.update(dt, throttle, steering, false);
  }

  resolveCarCollision(other: Car): boolean {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    const distSq = dx * dx + dy * dy;
    const minDist = (this.width + other.width) * 0.36;

    if (distSq < minDist * minDist && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const ny = dy / dist;

      const overlap = minDist - dist;
      const totalMass = this.config.mass + other.config.mass;
      const m1Ratio = other.config.mass / totalMass;
      const m2Ratio = this.config.mass / totalMass;

      this.x -= nx * overlap * m1Ratio;
      this.y -= ny * overlap * m1Ratio;
      other.x += nx * overlap * m2Ratio;
      other.y += ny * overlap * m2Ratio;

      // Exchange velocities along collision normal
      const rvx = other.vx - this.vx;
      const rvy = other.vy - this.vy;
      const velAlongNormal = rvx * nx + rvy * ny;

      if (velAlongNormal < 0) {
        const restitution = 0.45;
        const impulse =
          (-(1 + restitution) * velAlongNormal) /
          (1 / this.config.mass + 1 / other.config.mass);

        this.vx -= (impulse / this.config.mass) * nx;
        this.vy -= (impulse / this.config.mass) * ny;
        other.vx += (impulse / other.config.mass) * nx;
        other.vy += (impulse / other.config.mass) * ny;
      }
      return true;
    }
    return false;
  }

  private updateSkidMarks(
    dt: number,
    fX: number,
    fY: number,
    rX: number,
    rY: number
  ): void {
    const rearOffsetX = -fX * 16;
    const rearOffsetY = -fY * 16;
    const axleHalfWidth = 12;

    const leftTireX = this.x + rearOffsetX - rX * axleHalfWidth;
    const leftTireY = this.y + rearOffsetY - rY * axleHalfWidth;

    const rightTireX = this.x + rearOffsetX + rX * axleHalfWidth;
    const rightTireY = this.y + rearOffsetY + rY * axleHalfWidth;

    if (this.isDrifting) {
      if (this.prevLeftTire && this.prevRightTire) {
        const skidAlpha = Math.min(
          0.65,
          0.2 + (Math.abs(this.angularVelocity) + Math.hypot(this.vx, this.vy) * 0.001)
        );

        this.addSkidMark(
          this.prevLeftTire[0],
          this.prevLeftTire[1],
          leftTireX,
          leftTireY,
          skidAlpha
        );
        this.addSkidMark(
          this.prevRightTire[0],
          this.prevRightTire[1],
          rightTireX,
          rightTireY,
          skidAlpha
        );
      }
      this.prevLeftTire = [leftTireX, leftTireY];
      this.prevRightTire = [rightTireX, rightTireY];
    } else {
      this.prevLeftTire = null;
      this.prevRightTire = null;
    }

    // Fade skid marks gradually
    for (let i = this.skidMarks.length - 1; i >= 0; i--) {
      this.skidMarks[i].alpha -= dt * 0.015;
      if (this.skidMarks[i].alpha <= 0) {
        this.skidMarks.splice(i, 1);
      }
    }
  }

  private addSkidMark(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    alpha: number
  ): void {
    if (this.skidMarks.length >= this.maxSkidMarks) {
      this.skidMarks.shift();
    }
    this.skidMarks.push({ x1, y1, x2, y2, alpha, width: 4 });
  }

  render(batch: SpriteBatch, atlas: TextureAtlas): void {
    const whiteUV = atlas.getUVs('white');

    // 1. Render skid marks
    for (let i = 0; i < this.skidMarks.length; i++) {
      const sk = this.skidMarks[i];
      batch.drawLine(
        whiteUV,
        sk.x1,
        sk.y1,
        sk.x2,
        sk.y2,
        sk.width,
        0.1,
        0.1,
        0.1,
        sk.alpha
      );
    }

    const forwardX = Math.cos(this.angle);
    const forwardY = Math.sin(this.angle);
    const rightX = -Math.sin(this.angle);
    const rightY = Math.cos(this.angle);

    const noseX = this.x + forwardX * (this.width / 2);
    const noseY = this.y + forwardY * (this.width / 2);

    // Left and right headlights on front bumper
    const hlOffset = this.height * 0.33;
    const hl1X = noseX - rightX * hlOffset;
    const hl1Y = noseY - rightY * hlOffset;
    const hl2X = noseX + rightX * hlOffset;
    const hl2Y = noseY + rightY * hlOffset;

    // 2. HEADLIGHTS IN SHAPE OF A TRIANGLE (Triangular Light Beams)
    // Draw triangular light cones projecting forward from both left and right headlights
    const shouldDrawBeam = !this.isWreck && (this.isPlayerControlled || (this.hasDriver && Math.abs(this.speed) > 10));
    if (shouldDrawBeam) {
      const beamDist = this.isPlayerControlled ? 200 : 130;
      const beamSpread = this.isPlayerControlled ? 48 : 32;
      const apexAlpha = this.isPlayerControlled ? 0.44 : 0.22;

      // Left triangular light beam:
      // Apex at headlight (hl1X, hl1Y), widening forward into a cone
      const far1X = hl1X + forwardX * beamDist;
      const far1Y = hl1Y + forwardY * beamDist;
      const b1LeftX = far1X - rightX * beamSpread;
      const b1LeftY = far1Y - rightY * beamSpread;
      const b1RightX = far1X + rightX * beamSpread;
      const b1RightY = far1Y + rightY * beamSpread;

      batch.drawTriangle(
        whiteUV,
        hl1X,
        hl1Y,
        b1LeftX,
        b1LeftY,
        b1RightX,
        b1RightY,
        1.0,
        0.96,
        0.65,
        apexAlpha,
        1.0,
        0.96,
        0.65,
        0.0,
        1.0,
        0.96,
        0.65,
        0.0
      );

      // Right triangular light beam:
      // Apex at headlight (hl2X, hl2Y), widening forward into a cone
      const far2X = hl2X + forwardX * beamDist;
      const far2Y = hl2Y + forwardY * beamDist;
      const b2LeftX = far2X - rightX * beamSpread;
      const b2LeftY = far2Y - rightY * beamSpread;
      const b2RightX = far2X + rightX * beamSpread;
      const b2RightY = far2Y + rightY * beamSpread;

      batch.drawTriangle(
        whiteUV,
        hl2X,
        hl2Y,
        b2LeftX,
        b2LeftY,
        b2RightX,
        b2RightY,
        1.0,
        0.96,
        0.65,
        apexAlpha,
        1.0,
        0.96,
        0.65,
        0.0,
        1.0,
        0.96,
        0.65,
        0.0
      );

      // Inner intense core triangle for player's headlights
      if (this.isPlayerControlled) {
        const coreDist = 120;
        const coreSpread = 20;

        const cFar1X = hl1X + forwardX * coreDist;
        const cFar1Y = hl1Y + forwardY * coreDist;
        batch.drawTriangle(
          whiteUV,
          hl1X,
          hl1Y,
          cFar1X - rightX * coreSpread,
          cFar1Y - rightY * coreSpread,
          cFar1X + rightX * coreSpread,
          cFar1Y + rightY * coreSpread,
          1.0,
          1.0,
          0.85,
          0.58,
          1.0,
          1.0,
          0.85,
          0.0,
          1.0,
          1.0,
          0.85,
          0.0
        );

        const cFar2X = hl2X + forwardX * coreDist;
        const cFar2Y = hl2Y + forwardY * coreDist;
        batch.drawTriangle(
          whiteUV,
          hl2X,
          hl2Y,
          cFar2X - rightX * coreSpread,
          cFar2Y - rightY * coreSpread,
          cFar2X + rightX * coreSpread,
          cFar2Y + rightY * coreSpread,
          1.0,
          1.0,
          0.85,
          0.58,
          1.0,
          1.0,
          0.85,
          0.0,
          1.0,
          1.0,
          0.85,
          0.0
        );
      }
    }

    // 3. Car Shadow
    const carUV = this.isWreck
      ? atlas.getUVs('car_wreck')
      : atlas.getUVs(this.config.atlasKey);

    batch.drawRegion(
      carUV,
      this.x + 4,
      this.y + 6,
      this.width,
      this.height,
      this.angle,
      0.5,
      0.5,
      0.0,
      0.0,
      0.0,
      0.35
    );

    // 4. Car Body
    batch.drawRegion(
      carUV,
      this.x,
      this.y,
      this.width,
      this.height,
      this.angle,
      0.5,
      0.5,
      1,
      1,
      1,
      1
    );

    // Radiator Smoke when damaged (health < 40)
    if (this.health < 40 && !this.isWreck) {
      const smokeUV = atlas.getUVs('steam_puff');
      const hoodX = this.x + forwardX * (this.width * 0.28);
      const hoodY = this.y + forwardY * (this.width * 0.28);
      const smokePulse = (performance.now() * 0.005) % 1.0;
      batch.drawRegion(
        smokeUV,
        hoodX,
        hoodY - smokePulse * 16,
        18 + smokePulse * 16,
        18 + smokePulse * 16,
        0,
        0.5,
        0.5,
        0.25,
        0.25,
        0.25,
        (1 - smokePulse) * 0.55
      );
    }

    // Burning Fire when about to explode
    if (this.isBurning) {
      const fireUV = atlas.getUVs('light_halo');
      const hoodX = this.x + forwardX * (this.width * 0.25);
      const hoodY = this.y + forwardY * (this.width * 0.25);
      const flameSize = 26 + Math.sin(performance.now() * 0.025) * 8;
      batch.drawRegion(
        fireUV,
        hoodX,
        hoodY,
        flameSize,
        flameSize,
        0,
        0.5,
        0.5,
        1.0,
        0.35,
        0.05,
        0.85
      );
      batch.drawRegion(
        fireUV,
        hoodX,
        hoodY,
        flameSize * 0.55,
        flameSize * 0.55,
        0,
        0.5,
        0.5,
        1.0,
        0.9,
        0.2,
        0.95
      );
    }

    // 5. Triangular Headlight Lenses (sharp triangular glowing lamps on car bumper)
    if (!this.isWreck) {
      const lampLen = 7;
      const lampHalfW = 3.5;
      // Left lamp triangle
      const lamp1ApexX = hl1X - forwardX * lampLen;
      const lamp1ApexY = hl1Y - forwardY * lampLen;
      batch.drawTriangle(
        whiteUV,
        lamp1ApexX,
        lamp1ApexY,
        hl1X - rightX * lampHalfW,
        hl1Y - rightY * lampHalfW,
        hl1X + rightX * lampHalfW,
        hl1Y + rightY * lampHalfW,
        1.0,
        0.95,
        0.4,
        0.95
      );

      // Right lamp triangle
      const lamp2ApexX = hl2X - forwardX * lampLen;
      const lamp2ApexY = hl2Y - forwardY * lampLen;
      batch.drawTriangle(
        whiteUV,
        lamp2ApexX,
        lamp2ApexY,
        hl2X - rightX * lampHalfW,
        hl2Y - rightY * lampHalfW,
        hl2X + rightX * lampHalfW,
        hl2Y + rightY * lampHalfW,
        1.0,
        0.95,
        0.4,
        0.95
      );
    }

    // 6. Police Cruiser Flashing Sirens
    if (this.config.isCop && (this.sirenActive || this.isPlayerControlled)) {
      this.sirenTimer += 0.016;
      const flash = Math.sin(this.sirenTimer * 14) > 0;
      const roofX = this.x;
      const roofY = this.y;
      const rSirenX = roofX - rightX * 5;
      const rSirenY = roofY - rightY * 5;
      const bSirenX = roofX + rightX * 5;
      const bSirenY = roofY + rightY * 5;

      if (flash) {
        batch.drawRegion(
          whiteUV,
          rSirenX,
          rSirenY,
          16,
          16,
          0,
          0.5,
          0.5,
          1.0,
          0.1,
          0.1,
          0.9
        );
      } else {
        batch.drawRegion(
          whiteUV,
          bSirenX,
          bSirenY,
          16,
          16,
          0,
          0.5,
          0.5,
          0.1,
          0.4,
          1.0,
          0.9
        );
      }
    }
  }

  // Collision with static box (building, wall)
  resolveBoxCollision(bx: number, by: number, bw: number, bh: number): boolean {
    const radius = 18;
    const closestX = Math.max(bx, Math.min(this.x, bx + bw));
    const closestY = Math.max(by, Math.min(this.y, by + bh));

    const distX = this.x - closestX;
    const distY = this.y - closestY;
    const distSq = distX * distX + distY * distY;

    if (distSq < radius * radius && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const nx = distX / dist;
      const ny = distY / dist;

      const overlap = radius - dist;
      this.x += nx * overlap;
      this.y += ny * overlap;

      const dot = this.vx * nx + this.vy * ny;
      if (dot < 0) {
        this.vx = (this.vx - 1.4 * dot * nx) * 0.6;
        this.vy = (this.vy - 1.4 * dot * ny) * 0.6;
      }
      return true;
    }
    return false;
  }

  // Collision with static circular obstacle (e.g. roundabout central fountain island)
  resolveCircleCollision(cx: number, cy: number, cradius: number): boolean {
    const carRadius = 18;
    const totalRadius = cradius + carRadius;
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

      const dot = this.vx * nx + this.vy * ny;
      if (dot < 0) {
        this.vx = (this.vx - 1.4 * dot * nx) * 0.6;
        this.vy = (this.vy - 1.4 * dot * ny) * 0.6;
      }
      return true;
    }
    return false;
  }
}
