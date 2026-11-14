import { Camera } from './camera/Camera';
import { SpriteBatch } from './graphics/SpriteBatch';
import { TextureAtlas } from './graphics/TextureAtlas';
import { InputManager } from './input/InputManager';
import { Car, CarType } from './physics/Car';
import { CityMap } from './world/CityMap';
import { Pedestrian } from './world/Pedestrian';
import { Player } from './world/Player';
import { PigeonFlockManager } from './world/PigeonFlock';
import { WeaponSystem, WEAPON_DEFS, WeaponType } from './weapons/WeaponSystem';
import { TileType } from './types';
import { DevConsole, IGameEngineConsoleBridge } from './console/DevConsole';
import { WeatherTimeSystem, WeatherType } from './world/WeatherTimeSystem';
import { ShopSystem, Shop } from './world/ShopSystem';
import { PoliceSystem } from './world/PoliceSystem';

export interface RadarBlip {
  x: number;
  y: number;
  type: 'player' | 'shop' | 'car' | 'cop';
  color: string;
  label?: string;
}

export interface GameState {
  speed: number;
  score: number;
  multiplier: number;
  wantedLevel: number;
  isEvading?: boolean;
  health: number;
  armor: number;
  cameraMode: string;
  playerMode: 'driving' | 'on_foot';
  vehicleName: string;
  actionPrompt?: string;
  toastMessage: string;
  weaponName: string;
  weaponCode: string;
  ammo: number;
  currentWeapon: WeaponType;
  timeString: string;
  weather: string;
  district: string;
  playerAngle: number;
  radarBlips: RadarBlip[];
  isDrifting: boolean;
  gear: string;
}

export class GameEngine implements IGameEngineConsoleBridge {
  private gl: WebGL2RenderingContext;
  private batch: SpriteBatch;
  private atlas: TextureAtlas;
  private camera: Camera;
  private input: InputManager;
  private map: CityMap;

  // Entities & Systems
  private cars: Car[] = [];
  private activeCar: Car | null = null;
  private playerOnFoot: Player;
  private playerMode: 'driving' | 'on_foot' = 'driving';
  private pedestrians: Pedestrian[] = [];
  private pigeons: PigeonFlockManager;
  readonly weapons: WeaponSystem;
  readonly devConsole: DevConsole;
  readonly weatherTime: WeatherTimeSystem;
  readonly shops: ShopSystem;

  // Cheats / Dev state
  isGodMode = false;
  speedMultiplier = 1.0;

  private isRunning = false;
  private animFrameId: number | null = null;
  private lastTime = 0;
  private gameTime = 0;

  // Stats & HUD
  private score = 0;
  private multiplier = 1;
  readonly police = new PoliceSystem();
  get wantedLevel(): number {
    return this.police.wantedLevel;
  }
  set wantedLevel(val: number) {
    this.police.setWantedLevel(val, (msg, dur) => this.showToast(msg, dur));
  }
  private health = 100;
  private armor = 100;
  private toastMessage = 'Welcome to GTA 2 WebGL!';
  private toastTimer = 3.5;

  onStateUpdate?: (state: GameState) => void;
  onShopOpen?: (shop: Shop) => void;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance'
    });

    if (!gl) {
      throw new Error('WebGL2 is not supported in this browser.');
    }
    this.gl = gl;

    // WebGL configuration
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.1, 0.12, 0.14, 1.0);

    this.atlas = new TextureAtlas(gl);
    this.batch = new SpriteBatch(gl);
    this.camera = new Camera();
    this.input = new InputManager();
    this.map = new CityMap();

    // Spawn player initial car on road intersection (col 8, row 8)
    const spawnX = 8 * this.map.tileSize + this.map.tileSize / 2;
    const spawnY = 8 * this.map.tileSize + this.map.tileSize / 2;

    const initialCar = new Car(spawnX, spawnY, 0, 'sports_red');
    initialCar.isPlayerControlled = true;
    initialCar.hasDriver = false;
    this.cars.push(initialCar);
    this.activeCar = initialCar;
    this.playerMode = 'driving';

    // Player on foot character
    this.playerOnFoot = new Player(spawnX, spawnY, 0);

    // Weapons & Pickups System - strictly generates pickups on grass parks
    this.weapons = new WeaponSystem(this.map);

    // Weather & Day/Night Clock System
    this.weatherTime = new WeatherTimeSystem();

    // City Shops System
    this.shops = new ShopSystem(this.map);

    // Developer Console
    this.devConsole = new DevConsole(this);

    // Pigeon Flocks in parks and plazas
    this.pigeons = new PigeonFlockManager();

    // Spawn traffic and parked cars across the city
    this.spawnCars(18);

    // Spawn initial pedestrians in proximity to player
    this.spawnPedestriansNear(this.playerOnFoot.x, this.playerOnFoot.y, 35);

    this.input.attach(window);
    this.resize(
      canvas.clientWidth || window.innerWidth,
      canvas.clientHeight || window.innerHeight
    );
  }

  private spawnCars(count: number): void {
    const S = this.map.tileSize;
    const carTypes: CarType[] = [
      'sports_yellow',
      'sedan_blue',
      'taxi',
      'cop',
      'muscle_green',
      'van_white',
      'sports_red',
      'ambulance',
      'pickup',
      'truck_box',
      'hotrod'
    ];

    const roadAvenues = [8, 16, 24, 32, 40, 48, 56];
    let spawned = 0;
    let attempts = 0;

    // 1. Cruising & Avenue Traffic
    while (spawned < count && attempts < 1000) {
      attempts++;
      const isHorizontal = Math.random() < 0.5;
      const type = carTypes[Math.floor(Math.random() * carTypes.length)];

      if (isHorizontal) {
        const row = roadAvenues[Math.floor(Math.random() * roadAvenues.length)];
        const col = Math.floor(Math.random() * (this.map.cols - 8)) + 4;

        // Skip close to initial player spawn
        if (row === 8 && Math.abs(col - 8) < 4) continue;

        const headingEast = Math.random() < 0.5;
        const cy = headingEast ? (row + 0.68) * S : (row + 0.32) * S;
        const cx = col * S + S / 2;
        const angle = headingEast ? 0 : Math.PI;

        const car = new Car(cx, cy, angle, type);
        // 20% of cars are parked on curb with no driver
        if (Math.random() < 0.2) {
          car.hasDriver = false;
        }
        this.cars.push(car);
        spawned++;
      } else {
        const col = roadAvenues[Math.floor(Math.random() * roadAvenues.length)];
        const row = Math.floor(Math.random() * (this.map.rows - 8)) + 4;

        if (col === 8 && Math.abs(row - 8) < 4) continue;

        const headingSouth = Math.random() < 0.5;
        const cx = headingSouth ? (col + 0.68) * S : (col + 0.32) * S;
        const cy = row * S + S / 2;
        const angle = headingSouth ? Math.PI / 2 : -Math.PI / 2;

        const car = new Car(cx, cy, angle, type);
        if (Math.random() < 0.2) {
          car.hasDriver = false;
        }
        this.cars.push(car);
        spawned++;
      }
    }

    // 2. Parked Vehicles in City Parking Lots (Parcari, Hospital & Police compounds)
    for (const lot of this.map.parkingLots) {
      const isHospitalLot = lot.name.includes('HOSPITAL');
      const isPoliceLot = lot.name.includes('POLICE');

      const spotsToFill = isHospitalLot || isPoliceLot ? 2 : 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < spotsToFill && i < lot.spots.length; i++) {
        const spot = lot.spots[i];
        let pType: CarType = carTypes[Math.floor(Math.random() * (carTypes.length - 1))];

        if (isHospitalLot && i === 0) {
          pType = 'ambulance';
        } else if (isPoliceLot && i === 0) {
          pType = 'cop';
        } else if (lot.name.includes('FINANCIAL')) {
          pType = Math.random() < 0.5 ? 'sports_yellow' : 'sedan_blue';
        }

        const parkedCar = new Car(spot.x, spot.y, spot.angle, pType);
        parkedCar.hasDriver = false;
        this.cars.push(parkedCar);
      }
    }

    // 3. Signature Parked Vehicles Outside POI Facilities
    const fireStations = [{ blockC: 6, blockR: 2 }, { blockC: 9, blockR: 11 }, { blockC: 2, blockR: 6 }];
    for (const fs of fireStations) {
      const ft = new Car((fs.blockC * 8 + 4) * S + S / 2, (fs.blockR * 8 + 7) * S + S / 2, 0, 'firetruck');
      ft.hasDriver = false;
      this.cars.push(ft);
    }

    const nightclubs = [{ blockC: 5, blockR: 9 }, { blockC: 13, blockR: 8 }, { blockC: 9, blockR: 4 }];
    for (const nc of nightclubs) {
      const limo = new Car((nc.blockC * 8 + 4) * S + S / 2, (nc.blockR * 8 + 7) * S + S / 2, 0, 'limo');
      limo.hasDriver = false;
      this.cars.push(limo);
    }

    const gasStations = [{ blockC: 7, blockR: 5 }, { blockC: 1, blockR: 9 }, { blockC: 12, blockR: 6 }, { blockC: 5, blockR: 12 }];
    for (const [idx, gs] of gasStations.entries()) {
      const gType: CarType = idx % 2 === 0 ? 'gas_tanker' : 'pickup';
      const tanker = new Car((gs.blockC * 8 + 4) * S + S / 2, (gs.blockR * 8 + 7) * S + S / 2, 0, gType);
      tanker.hasDriver = false;
      this.cars.push(tanker);
    }
  }

  private spawnPedestriansNear(targetX: number, targetY: number, count: number): void {
    const S = this.map.tileSize;
    let spawned = 0;
    let attempts = 0;
    const variants = ['pedestrian', 'pedestrian_2', 'pedestrian_3'];

    while (spawned < count && attempts < count * 25) {
      attempts++;
      const angle = Math.random() * Math.PI * 2;
      const dist = 100 + Math.random() * 650;
      const px = targetX + Math.cos(angle) * dist;
      const py = targetY + Math.sin(angle) * dist;

      const c = Math.floor(px / S);
      const r = Math.floor(py / S);

      if (c >= 2 && c < this.map.cols - 2 && r >= 2 && r < this.map.rows - 2) {
        const tile = this.map.getTile(c, r);
        if (tile === TileType.SIDEWALK || tile === TileType.GRASS) {
          const variant = variants[Math.floor(Math.random() * variants.length)];
          this.pedestrians.push(new Pedestrian(px, py, variant));
          spawned++;
        }
      }
    }
  }

  private trySpawnSinglePedestrianAround(targetX: number, targetY: number): boolean {
    const S = this.map.tileSize;
    const variants = ['pedestrian', 'pedestrian_2', 'pedestrian_3'];
    for (let attempts = 0; attempts < 14; attempts++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 360 + Math.random() * 450;
      const px = targetX + Math.cos(angle) * dist;
      const py = targetY + Math.sin(angle) * dist;

      const c = Math.floor(px / S);
      const r = Math.floor(py / S);

      if (c >= 2 && c < this.map.cols - 2 && r >= 2 && r < this.map.rows - 2) {
        const tile = this.map.getTile(c, r);
        if (tile === TileType.SIDEWALK || tile === TileType.GRASS) {
          const variant = variants[Math.floor(Math.random() * variants.length)];
          this.pedestrians.push(new Pedestrian(px, py, variant));
          return true;
        }
      }
    }
    return false;
  }

  private showToast(msg: string, duration = 2.5): void {
    this.toastMessage = msg;
    this.toastTimer = duration;
  }

  resize(width: number, height: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.floor(width * dpr);
    const pixelHeight = Math.floor(height * dpr);

    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }

    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.camera.setViewport(this.canvas.width, this.canvas.height);
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    this.animFrameId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  setWeapon(type: WeaponType): void {
    this.weapons.setWeapon(type);
  }

  setInputEnabled(enabled: boolean): void {
    this.input.enabled = enabled;
    if (!enabled) {
      this.input.clearAllInputs();
    }
  }

  healPlayer(): void {
    this.health = 100;
    this.armor = 100;
    this.playerOnFoot.health = 100;
    if (this.activeCar) {
      this.activeCar.health = 100;
      this.activeCar.isBurning = false;
      this.activeCar.isWreck = false;
    }
    this.showToast('FULL HEALTH, ARMOR & VEHICLE RESTORED (100%)', 2.0);
  }

  toggleGodMode(): boolean {
    this.isGodMode = !this.isGodMode;
    this.playerOnFoot.isGodMode = this.isGodMode;
    this.showToast(this.isGodMode ? 'GOD MODE: ON (INVULNERABLE)' : 'GOD MODE: OFF', 2.0);
    return this.isGodMode;
  }

  spawnCarNearPlayer(typeStr?: string): Car {
    let type: CarType = 'sports_red';
    const s = (typeStr || '').toLowerCase();
    if (s.includes('cop') || s.includes('police')) type = 'cop';
    else if (s.includes('taxi') || s.includes('cab')) type = 'taxi';
    else if (s.includes('muscle') || s.includes('green') || s.includes('stallion')) type = 'muscle_green';
    else if (s.includes('van') || s.includes('pony') || s.includes('white')) type = 'van_white';
    else if (s.includes('sport') || s.includes('red') || s.includes('beast')) type = 'sports_red';
    else if (!typeStr) {
      const types: CarType[] = ['sports_red', 'cop', 'taxi', 'muscle_green', 'van_white'];
      type = types[Math.floor(Math.random() * types.length)];
    }

    const currentX = this.playerMode === 'driving' && this.activeCar ? this.activeCar.x : this.playerOnFoot.x;
    const currentY = this.playerMode === 'driving' && this.activeCar ? this.activeCar.y : this.playerOnFoot.y;
    const currentAngle = this.playerMode === 'driving' && this.activeCar ? this.activeCar.angle : this.playerOnFoot.angle;

    // Spawn 80px in front of player
    let spawnX = currentX + Math.cos(currentAngle) * 80;
    let spawnY = currentY + Math.sin(currentAngle) * 80;

    const tileC = Math.floor(spawnX / this.map.tileSize);
    const tileR = Math.floor(spawnY / this.map.tileSize);
    if (this.map.isSolid(tileC, tileR)) {
      spawnX = currentX;
      spawnY = currentY;
    }

    const car = new Car(spawnX, spawnY, currentAngle, type);
    car.hasDriver = false; // Parked, ready to drive
    this.cars.push(car);
    this.showToast(`SPAWNED ${car.config.name.toUpperCase()}!`, 2.5);
    return car;
  }

  repairActiveCar(): boolean {
    if (this.activeCar) {
      this.activeCar.health = 100;
      this.activeCar.isBurning = false;
      this.activeCar.isWreck = false;
      this.showToast('VEHICLE FULLY REPAIRED!', 2.0);
      return true;
    }
    return false;
  }

  giveAllWeapons(): void {
    this.weapons.ammo.pistol = 250;
    this.weapons.ammo.uzi = 500;
    this.weapons.ammo.shotgun = 80;
    this.weapons.ammo.rocket = 30;
    this.weapons.setWeapon('rocket');
    this.showToast('ALL WEAPONS & MAX AMMO GRANTED!', 2.5);
  }

  giveWeapon(type: WeaponType, amount?: number): void {
    const defaultAmts: Record<WeaponType, number> = {
      fist: 999,
      pistol: 100,
      uzi: 200,
      shotgun: 30,
      rocket: 10
    };
    const amt = amount ?? defaultAmts[type];
    this.weapons.ammo[type] = Math.min(WEAPON_DEFS[type].maxAmmo, this.weapons.ammo[type] + amt);
    this.weapons.setWeapon(type);
    this.showToast(`GRANTED ${WEAPON_DEFS[type].name.toUpperCase()} (+${amt})`, 2.0);
  }

  refillAmmo(): void {
    this.weapons.ammo.pistol = WEAPON_DEFS.pistol.maxAmmo;
    this.weapons.ammo.uzi = WEAPON_DEFS.uzi.maxAmmo;
    this.weapons.ammo.shotgun = WEAPON_DEFS.shotgun.maxAmmo;
    this.weapons.ammo.rocket = WEAPON_DEFS.rocket.maxAmmo;
    this.showToast('ALL AMMO REFILLED!', 2.0);
  }

  toggleInfiniteAmmo(): boolean {
    this.weapons.infiniteAmmo = !this.weapons.infiniteAmmo;
    this.showToast(this.weapons.infiniteAmmo ? 'INFINITE AMMO: ON' : 'INFINITE AMMO: OFF', 2.0);
    return this.weapons.infiniteAmmo;
  }

  setWantedLevel(level: number): void {
    this.police.setWantedLevel(level, (msg, dur) => this.showToast(msg, dur));
  }

  addMoney(amount: number): void {
    this.score += amount;
    this.showToast(`+$${amount.toLocaleString()} REWARD!`, 2.0);
  }

  explodeTrafficCars(): number {
    const pX = this.playerMode === 'driving' && this.activeCar ? this.activeCar.x : this.playerOnFoot.x;
    const pY = this.playerMode === 'driving' && this.activeCar ? this.activeCar.y : this.playerOnFoot.y;

    let count = 0;
    for (const car of this.cars) {
      if (car !== this.activeCar && !car.isWreck) {
        const dist = Math.hypot(car.x - pX, car.y - pY);
        if (dist < 1200) {
          car.takeDamage(200);
          car.explode();
          this.weapons.triggerExplosion(car.x, car.y, 110, 200, this.camera);
          count++;
        }
      }
    }
    this.showToast(`DETONATED ${count} VEHICLES!`, 2.5);
    return count;
  }

  spawnPickupOnNearestGrass(type: WeaponType | 'health', amount?: number): { x: number; y: number } | null {
    const pX = this.playerMode === 'driving' && this.activeCar ? this.activeCar.x : this.playerOnFoot.x;
    const pY = this.playerMode === 'driving' && this.activeCar ? this.activeCar.y : this.playerOnFoot.y;

    const pos = this.weapons.spawnPickupOnGrass(this.map, type, amount, pX, pY);
    if (pos) {
      this.showToast(`SPAWNED ${type.toUpperCase()} ON GRASS PARK!`, 2.0);
    }
    return pos;
  }

  spawnRandomGrassPickups(count: number): void {
    this.weapons.spawnRandomGrassPickups(this.map, count);
    this.showToast(`SPAWNED ${count} BONUS PICKUPS ON GRASS!`, 2.0);
  }

  setSpeedMultiplier(mult: number): void {
    this.speedMultiplier = mult;
    this.showToast(`SPEED MULTIPLIER: ${mult}x`, 2.0);
  }

  respawnPlayer(): void {
    const spawnX = 8 * this.map.tileSize + this.map.tileSize / 2;
    const spawnY = 8 * this.map.tileSize + this.map.tileSize / 2;
    if (this.activeCar) {
      this.activeCar.x = spawnX;
      this.activeCar.y = spawnY;
      this.activeCar.vx = 0;
      this.activeCar.vy = 0;
      this.activeCar.angle = 0;
    }
    this.playerOnFoot.x = spawnX;
    this.playerOnFoot.y = spawnY;
    this.health = 100;
    this.playerOnFoot.health = 100;
    this.showToast('RESPAWNED AT PLAZA', 2.0);
  }

  setTime(hours: number): void {
    this.weatherTime.setTime(hours);
    this.showToast(`TIME SET TO ${this.weatherTime.formattedTime}`, 2.0);
  }

  setTimeSpeed(speed: number): void {
    this.weatherTime.timeSpeed = speed;
    this.showToast(`TIME SPEED: ${speed}x`, 2.0);
  }

  setWeather(w: WeatherType): void {
    this.weatherTime.setWeather(w);
    this.showToast(`WEATHER SET TO ${w.toUpperCase()}`, 2.0);
  }

  private handleShopInteraction(): void {
    const px = this.playerMode === 'driving' && this.activeCar ? this.activeCar.x : this.playerOnFoot.x;
    const py = this.playerMode === 'driving' && this.activeCar ? this.activeCar.y : this.playerOnFoot.y;

    const shop = this.shops.getNearestShop(px, py, 46);
    if (shop) {
      if (this.input.interact) {
        if (this.onShopOpen) {
          this.onShopOpen(shop);
        } else {
          this.interactWithShop(shop);
        }
      }
    }
  }

  buyShopItem(item: { type: string; cost: number; name: string }): boolean {
    if (this.score < item.cost) {
      this.showToast('TRANSACTION FAILED: INSUFFICIENT FUNDS', 2.0);
      return false;
    }

    this.score -= item.cost;
    switch (item.type) {
      case 'pistol_ammo':
        this.weapons.ammo.pistol += 60;
        this.showToast(`PURCHASED: ${item.name} (-$${item.cost})`, 2.5);
        break;
      case 'uzi_ammo':
        this.weapons.ammo.uzi += 150;
        this.showToast(`PURCHASED: ${item.name} (-$${item.cost})`, 2.5);
        break;
      case 'shotgun_ammo':
        this.weapons.ammo.shotgun += 30;
        this.showToast(`PURCHASED: ${item.name} (-$${item.cost})`, 2.5);
        break;
      case 'rocket_ammo':
        this.weapons.ammo.rocket += 5;
        this.showToast(`PURCHASED: ${item.name} (-$${item.cost})`, 2.5);
        break;
      case 'armor':
        this.armor = 100;
        this.showToast(`BODY ARMOR EQUIPPED 100% (-$${item.cost})`, 2.5);
        break;
      case 'heal':
        this.health = 100;
        this.playerOnFoot.health = 100;
        this.showToast(`HEALTH RESTORED 100% (-$${item.cost})`, 2.5);
        break;
      case 'respray':
        if (this.activeCar) {
          this.activeCar.health = 100;
          this.activeCar.isBurning = false;
          this.activeCar.isWreck = false;
        }
        this.wantedLevel = 0;
        this.showToast(`PAY N SPRAY: REPAIRED & WANTED CLEARED (-$${item.cost})`, 3.0);
        break;
      case 'heist':
        this.score += 50000;
        this.wantedLevel = Math.min(6, this.wantedLevel + 2);
        this.showToast('BANK HEIST: +$50,000 CASH // WANTED +2 STARS!', 3.5);
        break;
      case 'hospital_heal':
        this.health = 100;
        this.armor = 100;
        this.playerOnFoot.health = 100;
        this.showToast(`EMERGENCY SURGERY: 100% HEALTH & 100% ARMOR (-$${item.cost})`, 3.0);
        break;
      case 'police_bribe':
        this.wantedLevel = 0;
        this.showToast(`POLICE BRIBE: ALL WANTED STARS CLEARED (-$${item.cost})`, 3.0);
        break;
      case 'police_kevlar':
        this.armor = 100;
        this.showToast(`SWAT HEAVY BODY ARMOR EQUIPPED 100% (-$${item.cost})`, 3.0);
        break;
      case 'police_impound': {
        const px = this.playerOnFoot.x;
        const py = this.playerOnFoot.y;
        const copCar = new Car(px + 45, py, 0, 'cop');
        copCar.hasDriver = false;
        this.cars.push(copCar);
        this.showToast(`IMPOUND RELEASED: POLICE CRUISER DELIVERED (-$${item.cost})`, 3.5);
        break;
      }
      case 'police_swat_truck': {
        const px = this.playerOnFoot.x;
        const py = this.playerOnFoot.y;
        const swat = new Car(px + 45, py, 0, 'swat_enforcer');
        swat.hasDriver = false;
        this.cars.push(swat);
        this.showToast(`SWAT ENFORCER TACTICAL TRUCK DELIVERED (-$${item.cost})`, 3.5);
        break;
      }
      case 'fire_suit':
        this.health = 100;
        this.armor = 100;
        this.playerOnFoot.health = 100;
        this.showToast(`FIREFIGHTER HAZMAT GEAR: 100% HP & 100% ARMOR (-$${item.cost})`, 3.0);
        break;
      case 'fire_extinguisher':
        this.health = Math.min(100, this.health + 50);
        this.playerOnFoot.health = this.health;
        this.showToast(`CO2 FOAM KIT USED: +50 HP (-$${item.cost})`, 2.5);
        break;
      case 'fire_truck': {
        const px = this.playerOnFoot.x;
        const py = this.playerOnFoot.y;
        const ft = new Car(px + 50, py, 0, 'firetruck');
        ft.hasDriver = false;
        this.cars.push(ft);
        this.showToast(`ENGINE 01 FIRE TRUCK DELIVERED (-$${item.cost})`, 3.5);
        break;
      }
      case 'school_sprint':
        this.playerOnFoot.speedMultiplier = Math.min(1.5, this.playerOnFoot.speedMultiplier + 0.25);
        this.showToast(`ATHLETIC DRILLS COMPLETE: SPRINT SPEED +25% (-$${item.cost})`, 3.5);
        break;
      case 'school_scholarship':
        this.score += 1200;
        this.showToast(`ACADEMIC GRANT COLLECTED: +$1,200 ENDOWMENT FUNDS!`, 3.5);
        break;
      case 'school_nurse':
        this.health = 100;
        this.playerOnFoot.health = 100;
        this.showToast(`CAMPUS CLINIC: HEALTH RESTORED 100% (-$${item.cost})`, 2.5);
        break;
      case 'gas_tanker': {
        const px = this.playerOnFoot.x;
        const py = this.playerOnFoot.y;
        const tanker = new Car(px + 50, py, 0, 'gas_tanker');
        tanker.hasDriver = false;
        this.cars.push(tanker);
        this.showToast(`OCTANE-99 FUEL TANKER DELIVERED (-$${item.cost})`, 3.5);
        break;
      }
      case 'gas_pickup': {
        const px = this.playerOnFoot.x;
        const py = this.playerOnFoot.y;
        const pickup = new Car(px + 45, py, 0, 'pickup');
        pickup.hasDriver = false;
        this.cars.push(pickup);
        this.showToast(`BISON 4x4 PICKUP DELIVERED (-$${item.cost})`, 3.5);
        break;
      }
      case 'car_hotrod': {
        const px = this.playerOnFoot.x;
        const py = this.playerOnFoot.y;
        const hotrod = new Car(px + 45, py, 0, 'hotrod');
        hotrod.hasDriver = false;
        this.cars.push(hotrod);
        this.showToast(`INFERNO V8 HOTROD DELIVERED (-$${item.cost})`, 3.5);
        break;
      }
      case 'car_box_truck': {
        const px = this.playerOnFoot.x;
        const py = this.playerOnFoot.y;
        const boxTruck = new Car(px + 50, py, 0, 'truck_box');
        boxTruck.hasDriver = false;
        this.cars.push(boxTruck);
        this.showToast(`ZAIBATSU BOX TRUCK DELIVERED (-$${item.cost})`, 3.5);
        break;
      }
      case 'club_limo': {
        const px = this.playerOnFoot.x;
        const py = this.playerOnFoot.y;
        const limo = new Car(px + 55, py, 0, 'limo');
        limo.hasDriver = false;
        this.cars.push(limo);
        this.showToast(`VIP EXECUTIVE LIMOUSINE DELIVERED (-$${item.cost})`, 3.5);
        break;
      }
      case 'bar_beer':
        this.health = Math.min(100, this.health + 40);
        this.playerOnFoot.health = this.health;
        this.showToast(`ICE-COLD PINT DOWNED: +40 HP (-$${item.cost})`, 2.5);
        break;
      case 'bar_whiskey':
        this.health = 100;
        this.playerOnFoot.health = 100;
        this.showToast(`KENTUCKY BOURBON SHOT: 100% HEALTH & ADRENALINE! (-$${item.cost})`, 3.0);
        break;
      case 'bar_brawl':
        this.armor = 100;
        this.showToast(`BRASS KNUCKLES & BRAWLER ARMOR EQUIPPED 100% (-$${item.cost})`, 3.0);
        break;
      case 'gas_nitro':
        if (this.activeCar) {
          this.activeCar.health = 100;
          this.activeCar.isBurning = false;
          this.activeCar.isWreck = false;
          const boostDir = this.activeCar.speed >= 0 ? 1 : -1;
          this.activeCar.vx = Math.cos(this.activeCar.angle) * 350 * boostDir;
          this.activeCar.vy = Math.sin(this.activeCar.angle) * 350 * boostDir;
        }
        this.showToast(`NITRO INJECTION & TUNE APPLIED (-$${item.cost})`, 3.0);
        break;
      case 'car_viper': {
        const px = this.playerOnFoot.x;
        const py = this.playerOnFoot.y;
        const viper = new Car(px + 45, py, 0, 'sports_yellow');
        viper.hasDriver = false;
        this.cars.push(viper);
        this.showToast(`VIPER GT DELIVERED OUTSIDE (-$${item.cost})`, 3.5);
        break;
      }
      case 'car_stallion': {
        const px = this.playerOnFoot.x;
        const py = this.playerOnFoot.y;
        const stallion = new Car(px + 45, py, 0, 'muscle_green');
        stallion.hasDriver = false;
        this.cars.push(stallion);
        this.showToast(`STALLION V8 DELIVERED OUTSIDE (-$${item.cost})`, 3.5);
        break;
      }
      case 'donut_glazed':
        this.health = Math.min(100, this.health + 50);
        this.playerOnFoot.health = this.health;
        this.showToast(`GLAZED DONUTS EATEN: +50 HP (-$${item.cost})`, 2.5);
        break;
      case 'donut_combo':
        this.health = 100;
        this.playerOnFoot.health = 100;
        this.wantedLevel = Math.max(0, this.wantedLevel - 1);
        this.showToast(`COFFEE & DONUT COMBO: 100% HP // WANTED -1 STAR (-$${item.cost})`, 3.0);
        break;
      case 'club_drinks':
        this.score += 2500;
        this.showToast('VIP SYNDICATE LOUNGE: +$2,500 STREET PAYOUT!', 3.5);
        break;
    }
    return true;
  }

  applyPlayerDamage(amount: number): void {
    if (this.isGodMode) return;

    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, Math.round(amount * 0.7));
      this.armor = Math.max(0, this.armor - absorbed);
      const directHealth = amount - absorbed;
      this.health = Math.max(0, Math.round(this.health - directHealth));
    } else {
      this.health = Math.max(0, Math.round(this.health - amount));
    }
    this.playerOnFoot.health = this.health;

    if (this.health <= 0) {
      this.handlePlayerDeath();
    }
  }

  private handlePlayerDeath(): void {
    this.showToast('WASTED // RESPAWNED AT CITY HOSPITAL -$100', 4.0);
    this.score = Math.max(0, this.score - 100);
    this.health = 100;
    this.armor = 100;
    this.playerOnFoot.health = 100;
    this.playerOnFoot.alive = true;
    this.wantedLevel = 0;

    // Find Central Hospital entrance or fallback to c=8, r=8
    const hosp = this.shops.shops.find(s => s.type === 'hospital');
    const spawnX = hosp ? hosp.doorX : 8 * this.map.tileSize + this.map.tileSize / 2;
    const spawnY = hosp ? hosp.doorY + 24 : 8 * this.map.tileSize + this.map.tileSize / 2;

    this.playerOnFoot.x = spawnX;
    this.playerOnFoot.y = spawnY;
    if (this.playerMode === 'driving' && this.activeCar) {
      this.playerMode = 'on_foot';
      this.activeCar.hasDriver = false;
      this.activeCar = null;
    }
  }

  private interactWithShop(shop: Shop): void {
    switch (shop.type) {
      case 'ammu_nation':
        this.weapons.ammo.pistol = 150;
        this.weapons.ammo.uzi = 400;
        this.weapons.ammo.shotgun = 60;
        this.weapons.ammo.rocket = 20;
        this.armor = 100;
        this.showToast('AMMU-NATION: FULL AMMO & ARMOR RESTOCKED! -$300', 3.0);
        this.score = Math.max(0, this.score - 300);
        break;

      case 'burger_shot':
        this.health = 100;
        this.playerOnFoot.health = 100;
        this.showToast('BURGER SHOT: MEAL CONSUMED! 100% HEALTH! -$25', 3.0);
        this.score = Math.max(0, this.score - 25);
        break;

      case 'pay_n_spray':
        if (this.activeCar) {
          this.activeCar.health = 100;
          this.activeCar.isBurning = false;
          this.activeCar.isWreck = false;
        }
        this.wantedLevel = 0;
        this.showToast('PAY N SPRAY: VEHICLE OVERHAULED & WANTED CLEARED! -$500', 3.0);
        this.score = Math.max(0, this.score - 500);
        break;

      case 'bank':
        this.score += 50000;
        this.wantedLevel = Math.min(6, this.wantedLevel + 2);
        this.showToast('BANK HEIST: +$50,000 CASH STOLEN! WANTED +2 STARS!', 3.5);
        break;

      case 'pharmacy':
        this.health = 100;
        this.playerOnFoot.health = 100;
        this.armor = 100;
        this.showToast('CITY PHARMACY: MEDICAL CARE & STIMS APPLIED! -$50', 3.0);
        this.score = Math.max(0, this.score - 50);
        break;
    }
  }

  private loop(now: number): void {
    if (!this.isRunning) return;

    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (dt > 0.1) dt = 0.1;

    this.update(dt * this.speedMultiplier);
    this.render();

    this.input.update();

    if (this.onStateUpdate) {
      const px = this.playerMode === 'driving' && this.activeCar ? this.activeCar.x : this.playerOnFoot.x;
      const py = this.playerMode === 'driving' && this.activeCar ? this.activeCar.y : this.playerOnFoot.y;
      const playerAngle = this.playerMode === 'driving' && this.activeCar ? this.activeCar.angle : this.playerOnFoot.angle;

      const currentSpeed =
        this.playerMode === 'driving' && this.activeCar
          ? Math.round(Math.abs(this.activeCar.speed))
          : Math.round(this.playerOnFoot.speed);

      const vehicleName =
        this.playerMode === 'driving' && this.activeCar
          ? this.activeCar.config.name
          : 'On Foot';

      const currentWeaponDef = WEAPON_DEFS[this.weapons.currentWeapon];
      const currentAmmo = this.weapons.ammo[this.weapons.currentWeapon];

      const midX = (this.map.cols * this.map.tileSize) / 2;
      const midY = (this.map.rows * this.map.tileSize) / 2;
      let district = 'DOWNTOWN // ZAIBATSU';
      if (px >= midX && py < midY) {
        district = 'FINANCIAL // YAKUZA';
      } else if (px < midX && py >= midY) {
        district = 'RESIDENTIAL // LOONIES';
      } else if (px >= midX && py >= midY) {
        district = 'INDUSTRIAL // SCIENTISTS';
      }

      const isDrifting =
        this.playerMode === 'driving' && this.activeCar
          ? this.input.handbrake || (Math.abs(this.activeCar.steerAngle) > 0.28 && Math.abs(this.activeCar.speed) > 35)
          : false;

      let gear = 'FOOT';
      if (this.playerMode === 'driving' && this.activeCar) {
        const spd = this.activeCar.speed;
        gear = spd < -1 ? 'REV' : spd < 25 ? 'D-1' : spd < 60 ? 'D-2' : spd < 95 ? 'D-3' : 'D-4';
      }

      const radarRange = 600;
      const radarBlips: RadarBlip[] = [];

      for (const s of this.shops.shops) {
        const dx = s.doorX - px;
        const dy = s.doorY - py;
        const dist = Math.hypot(dx, dy);
        if (dist <= radarRange) {
          let col = '#ffa502';
          let label = 'SHOP';
          if (s.type === 'ammu_nation') { col = '#ff4757'; label = 'GUN'; }
          else if (s.type === 'pay_n_spray') { col = '#70a1ff'; label = 'P&S'; }
          else if (s.type === 'pharmacy') { col = '#2ed573'; label = 'MED'; }
          else if (s.type === 'bank') { col = '#ffd32a'; label = 'BNK'; }
          else if (s.type === 'burger_shot') { col = '#ff793f'; label = 'FD'; }
          else if (s.type === 'hospital') { col = '#ff4757'; label = 'HSP'; }
          else if (s.type === 'police_station') { col = '#1e90ff'; label = 'COP'; }
          else if (s.type === 'gas_station') { col = '#f39c12'; label = 'GAS'; }
          else if (s.type === 'car_dealer') { col = '#a55eea'; label = 'CAR'; }
          else if (s.type === 'donut_shop') { col = '#ff6b81'; label = 'DNT'; }
          else if (s.type === 'nightclub') { col = '#9b59b6'; label = 'CLUB'; }

          radarBlips.push({
            x: dx / radarRange,
            y: dy / radarRange,
            type: 'shop',
            color: col,
            label
          });
        }
      }

      for (const lot of this.map.parkingLots) {
        const dx = lot.centerX - px;
        const dy = lot.centerY - py;
        const dist = Math.hypot(dx, dy);
        if (dist <= radarRange) {
          radarBlips.push({
            x: dx / radarRange,
            y: dy / radarRange,
            type: 'shop',
            color: '#00d2d3',
            label: 'PKG'
          });
        }
      }

      for (const c of this.cars) {
        if (c === this.activeCar) continue;
        const dx = c.x - px;
        const dy = c.y - py;
        const dist = Math.hypot(dx, dy);
        if (dist <= radarRange) {
          const isCop = !!c.config.isCop;
          radarBlips.push({
            x: dx / radarRange,
            y: dy / radarRange,
            type: isCop ? 'cop' : 'car',
            color: isCop ? (Math.floor(this.gameTime * 6) % 2 === 0 ? '#ff4757' : '#3742fa') : '#747d8c'
          });
        }
      }

      this.onStateUpdate({
        speed: currentSpeed,
        score: this.score,
        multiplier: this.multiplier,
        wantedLevel: this.wantedLevel,
        isEvading: this.police.isEvading,
        health: this.health,
        armor: this.armor,
        cameraMode: this.camera.mode === 'north_up' ? 'North Up' : 'Follow Car',
        playerMode: this.playerMode,
        vehicleName,
        toastMessage: this.toastMessage,
        weaponName: currentWeaponDef.name,
        weaponCode: currentWeaponDef.code,
        ammo: currentAmmo,
        currentWeapon: this.weapons.currentWeapon,
        timeString: this.weatherTime.formattedTime,
        weather: this.weatherTime.weather.toUpperCase(),
        district,
        playerAngle,
        radarBlips,
        isDrifting,
        gear
      });
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  }

  private update(dt: number): void {
    this.gameTime += dt;

    // Advance Weather and Day/Night cycle
    this.weatherTime.update(dt, this.camera);

    // Camera toggle shortcut
    if (this.input.toggleCamera && this.playerMode === 'driving' && this.activeCar) {
      this.camera.toggleCameraMode();
    }

    // On foot, aiming must never rotate the camera. The alternate camera
    // mode is intentionally reserved for driving.
    if (this.playerMode === 'on_foot' && this.camera.mode !== 'north_up') {
      this.camera.setNorthUp();
    }

    // Toast message timer
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) {
        this.toastMessage = '';
      }
    }

    // Respawn / Reset
    if (this.input.reset) {
      const spawnX = 8 * this.map.tileSize + this.map.tileSize / 2;
      const spawnY = 8 * this.map.tileSize + this.map.tileSize / 2;
      if (this.activeCar) {
        this.activeCar.x = spawnX;
        this.activeCar.y = spawnY;
        this.activeCar.vx = 0;
        this.activeCar.vy = 0;
        this.activeCar.angle = 0;
      }
      this.playerOnFoot.x = spawnX;
      this.playerOnFoot.y = spawnY;
      this.health = 100;
      this.showToast('Respawned at Plaza', 2.0);
    }

    // Weapon Switching
    if (this.input.selectWeapon1) this.weapons.setWeapon('pistol');
    if (this.input.selectWeapon2) this.weapons.setWeapon('uzi');
    if (this.input.selectWeapon3) this.weapons.setWeapon('shotgun');
    if (this.input.selectWeapon4) this.weapons.setWeapon('rocket');
    if (this.input.selectWeapon5) this.weapons.setWeapon('fist');
    if (this.input.nextWeapon) this.weapons.cycleWeapon(1);
    if (this.input.prevWeapon) this.weapons.cycleWeapon(-1);

    // Mouse Screen-to-World Aim Coordinates
    const canvasRect = this.canvas.getBoundingClientRect();
    const canvasScaleX = canvasRect.width > 0 ? this.canvas.width / canvasRect.width : 1;
    const canvasScaleY = canvasRect.height > 0 ? this.canvas.height / canvasRect.height : 1;
    const mouseCanvasX = (this.input.mouseX - canvasRect.left) * canvasScaleX;
    const mouseCanvasY = (this.input.mouseY - canvasRect.top) * canvasScaleY;

    const [aimWorldX, aimWorldY] = this.camera.screenToWorld(
      mouseCanvasX,
      mouseCanvasY,
      this.canvas.width,
      this.canvas.height
    );

    // 1. Vehicle Enter / Exit Mechanics & Shops
    this.handleVehicleEnterExit();
    this.handleShopInteraction();

    // 2. Active Entity Update & Weapons Firing
    let targetX = 0;
    let targetY = 0;
    let targetAngle = 0;
    let targetSpeed = 0;

    if (this.playerMode === 'driving' && this.activeCar) {
      // Keep on-foot position synced with car for pickups/events
      this.playerOnFoot.x = this.activeCar.x;
      this.playerOnFoot.y = this.activeCar.y;
      this.playerOnFoot.angle = this.activeCar.angle;

      // Update car physics with player input
      this.activeCar.update(
        dt,
        this.input.throttle,
        this.input.steering,
        this.input.handbrake
      );

      // Drive-by shooting from car
      if (this.input.shoot && !this.activeCar.isWreck) {
        const carAimAngle = Math.atan2(
          aimWorldY - this.activeCar.y,
          aimWorldX - this.activeCar.x
        );
        this.weapons.tryShoot(
          this.activeCar.x,
          this.activeCar.y,
          carAimAngle,
          this.camera
        );
      }

      targetX = this.activeCar.x;
      targetY = this.activeCar.y;
      targetAngle = this.activeCar.angle;
      targetSpeed = this.activeCar.speed;
    } else {
      const isShooting = this.input.shoot;

      // Update player on foot with aiming
      this.playerOnFoot.update(
        dt,
        this.input.throttle,
        this.input.steering,
        this.input.sprint,
        this.map,
        aimWorldX,
        aimWorldY,
        isShooting
      );

      // Shoot on foot
      if (isShooting) {
        this.weapons.tryShoot(
          this.playerOnFoot.x,
          this.playerOnFoot.y,
          this.playerOnFoot.angle,
          this.camera
        );
      }

      targetX = this.playerOnFoot.x;
      targetY = this.playerOnFoot.y;
      targetAngle = this.playerOnFoot.angle;
      targetSpeed = this.playerOnFoot.speed;
    }

    const playerVx = this.playerMode === 'driving' && this.activeCar
      ? this.activeCar.vx
      : Math.cos(this.playerOnFoot.angle) * this.playerOnFoot.speed;
    const playerVy = this.playerMode === 'driving' && this.activeCar
      ? this.activeCar.vy
      : Math.sin(this.playerOnFoot.angle) * this.playerOnFoot.speed;

    // 3. Update Camera
    this.camera.follow(targetX, targetY, targetAngle, targetSpeed, dt);

    // 4. Update Dynamic Police Dispatch & Wanted System
    this.police.update(
      dt,
      this.cars,
      this.activeCar,
      targetX,
      targetY,
      playerVx,
      playerVy,
      this.playerMode === 'driving',
      this.input.shoot,
      this.map,
      (msg, dur) => this.showToast(msg, dur)
    );

    // 5. Update AI Traffic Cars
    for (const car of this.cars) {
      if (car !== this.activeCar) {
        car.updateAI(
          dt,
          this.map,
          this.cars,
          targetX,
          targetY,
          this.wantedLevel,
          this.gameTime,
          playerVx,
          playerVy
        );
      }

      // Collisions with buildings
      const obstacles = this.map.getNearbyObstacles(car.x, car.y, 75);
      for (const obs of obstacles) {
        const hit = car.resolveBoxCollision(obs.x, obs.y, obs.width, obs.height);
        if (hit && car === this.activeCar && Math.abs(car.speed) > 130 && !this.isGodMode) {
          // Crash damage
          this.applyPlayerDamage(2);
        }
      }

      // Collisions with roundabout circular fountain island
      for (const rb of this.map.roundabouts) {
        const hit = car.resolveCircleCollision(rb.x, rb.y, 46);
        if (hit && car === this.activeCar && Math.abs(car.speed) > 130 && !this.isGodMode) {
          this.applyPlayerDamage(2);
        }
      }
    }

    // 6. Car-to-Car Collisions
    for (let i = 0; i < this.cars.length; i++) {
      for (let j = i + 1; j < this.cars.length; j++) {
        const c1 = this.cars[i];
        const c2 = this.cars[j];
        const collided = c1.resolveCarCollision(c2);
        if (collided && this.activeCar && (c1 === this.activeCar || c2 === this.activeCar)) {
          const other = c1 === this.activeCar ? c2 : c1;
          const relSpeed = Math.abs(this.activeCar.speed);
          if (other.config.isCop) {
            this.police.recordCopCarHit(relSpeed, (msg, dur) => this.showToast(msg, dur));
          } else {
            this.police.recordCivilianCarHit(relSpeed, (msg, dur) => this.showToast(msg, dur));
          }
        }
      }
    }

    // 7. On Foot: Danger from Moving Cars
    if (this.playerMode === 'on_foot') {
      for (const car of this.cars) {
        if (Math.abs(car.speed) > 80) {
          const dist = Math.hypot(car.x - this.playerOnFoot.x, car.y - this.playerOnFoot.y);
          if (dist < 26) {
            if (!this.isGodMode) {
              this.applyPlayerDamage(12);
            }
            // Knockback
            this.playerOnFoot.x += Math.cos(car.angle) * 30;
            this.playerOnFoot.y += Math.sin(car.angle) * 30;
            this.showToast('HIT BY CAR! -12 HP', 1.5);
          }
        }
      }
    }

    // 8. Update & Stream Pedestrians
    for (const ped of this.pedestrians) {
      ped.update(dt, this.map, targetX, targetY, targetSpeed);

      if (ped.alive) {
        // Active Car collision
        if (this.playerMode === 'driving' && this.activeCar) {
          const dist = Math.hypot(this.activeCar.x - ped.x, this.activeCar.y - ped.y);
          if (dist < 28 && Math.abs(this.activeCar.speed) > 55) {
            ped.alive = false;
            this.score += 100;
            this.police.recordPedestrianHit((msg, dur) => this.showToast(msg, dur));
          }
        }

        // Traffic Car collision
        for (const car of this.cars) {
          if (car !== this.activeCar && Math.abs(car.speed) > 65) {
            const dist = Math.hypot(car.x - ped.x, car.y - ped.y);
            if (dist < 26) {
              ped.alive = false;
            }
          }
        }
      }
    }

    // Despawn dead pedestrians or those that wandered too far (> 1100px)
    this.pedestrians = this.pedestrians.filter(
      p => p.alive && Math.hypot(p.x - targetX, p.y - targetY) < 1100
    );

    // Maintain lively city: keep 28-36 active pedestrians streaming near player
    if (this.pedestrians.length < 32) {
      this.trySpawnSinglePedestrianAround(targetX, targetY);
      if (this.pedestrians.length < 24) {
        this.trySpawnSinglePedestrianAround(targetX, targetY);
      }
    }

    // 8. Update Pigeon Flocks
    this.pigeons.update(dt, this.cars, targetX, targetY, targetSpeed);

    // 9. Update Weapons, Bullets, Explosions, Pickups
    this.weapons.update(
      dt,
      this.map,
      this.cars,
      this.pedestrians,
      this.playerOnFoot,
      this.camera,
      (pts, toast) => {
        this.score += pts;
        if (toast) this.showToast(toast, 2.0);
      },
      () => {
        this.police.addWantedLevel(1, (msg, dur) => this.showToast(msg, dur));
      }
    );

    // Sync health from weapon system / explosions / pickups
    this.health = this.playerOnFoot.health;

    // Check if active car was wrecked while driving
    if (this.playerMode === 'driving' && this.activeCar?.isWreck) {
      this.playerMode = 'on_foot';
      this.playerOnFoot.x = this.activeCar.x + 32;
      this.playerOnFoot.y = this.activeCar.y + 32;
      if (!this.isGodMode) {
        this.applyPlayerDamage(40);
      }
      this.activeCar.isPlayerControlled = false;
      this.activeCar.hasDriver = false;
      this.activeCar = null;
      this.showToast('VEHICLE DESTROYED! BAILED OUT!', 3.0);
    }
  }

  private handleVehicleEnterExit(): void {
    if (this.playerMode === 'driving' && this.activeCar) {
      if (this.input.enterExit) {
        // Exit car: spawn player beside car door
        const rightX = -Math.sin(this.activeCar.angle);
        const rightY = Math.cos(this.activeCar.angle);

        let spawnX = this.activeCar.x - rightX * (this.activeCar.height / 2 + 16);
        let spawnY = this.activeCar.y - rightY * (this.activeCar.height / 2 + 16);

        // If left side is blocked by building, try right side
        const tileC = Math.floor(spawnX / this.map.tileSize);
        const tileR = Math.floor(spawnY / this.map.tileSize);
        if (this.map.isSolid(tileC, tileR)) {
          spawnX = this.activeCar.x + rightX * (this.activeCar.height / 2 + 16);
          spawnY = this.activeCar.y + rightY * (this.activeCar.height / 2 + 16);
        }

        this.playerOnFoot.x = spawnX;
        this.playerOnFoot.y = spawnY;
        this.playerOnFoot.angle = this.activeCar.angle;
        this.playerOnFoot.vx = 0;
        this.playerOnFoot.vy = 0;

        const carName = this.activeCar.config.name;
        this.activeCar.isPlayerControlled = false;
        this.activeCar.hasDriver = false; // Car is empty and safely parked
        this.activeCar.vx = 0;
        this.activeCar.vy = 0;
        this.activeCar = null;
        this.playerMode = 'on_foot';

        this.showToast(`Exited ${carName}`, 2.0);
      }
    } else {
      // On Foot: check for nearest car
      const nearestCar = this.playerOnFoot.getNearestCar(this.cars, 58);

      if (nearestCar) {
        if (this.input.enterExit) {
          // Enter car!
          if (nearestCar.hasDriver) {
            // Evict driver
            const ped = new Pedestrian(
              nearestCar.x + (Math.random() - 0.5) * 30,
              nearestCar.y + (Math.random() - 0.5) * 30
            );
            ped.isPanicking = true;
            ped.panicTimer = 4.0;
            this.pedestrians.push(ped);

            this.score += 150;
            if (nearestCar.config.isCop) {
              this.police.recordCarjackCop((msg, dur) => this.showToast(msg, dur));
            } else {
              this.showToast(`CARJACKED ${nearestCar.config.name.toUpperCase()}! +150`, 2.5);
            }
            nearestCar.hasDriver = false;
          } else {
            this.showToast(`Entered ${nearestCar.config.name}`, 2.0);
          }

          nearestCar.isPlayerControlled = true;
          this.activeCar = nearestCar;
          this.playerMode = 'driving';
        }
      }
    }
  }

  private render(): void {
    const gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT);

    const vp = this.camera.getViewProjection();
    const bounds = this.camera.getVisibleBounds();

    this.batch.begin(vp, this.atlas.texture);

    // 1. Render Map (with animated water, trees, traffic lights, steam, rooftop props, clouds, roundabouts)
    this.map.render(this.batch, this.atlas, bounds, this.gameTime, this.weatherTime.isNight);

    // 2. Render City Shops (storefront canopies, glowing neon signs, entrance mats)
    this.shops.render(this.batch, this.atlas, this.gameTime, this.weatherTime.isNight);

    // 3. Render Pigeons / Wildlife
    this.pigeons.render(this.batch, this.atlas);

    // 3. Render Pedestrians
    for (const ped of this.pedestrians) {
      ped.render(this.batch, this.atlas);
    }

    // 3. Render All Cars (headlights, shadow, body)
    for (const car of this.cars) {
      car.render(this.batch, this.atlas);
    }

    // 4. Render Player on foot (if currently on foot)
    if (this.playerMode === 'on_foot') {
      this.playerOnFoot.render(this.batch, this.atlas);

      // If near a car, draw a subtle glowing arrow indicator above that car
      const nearestCar = this.playerOnFoot.getNearestCar(this.cars, 58);
      if (nearestCar) {
        const whiteUV = this.atlas.getUVs('white');
        const arrowY = nearestCar.y - nearestCar.height / 2 - 14 + Math.sin(performance.now() * 0.008) * 4;
        // Small yellow pointer triangle pointing down at car
        this.batch.drawTriangle(
          whiteUV,
          nearestCar.x,
          arrowY + 8,
          nearestCar.x - 7,
          arrowY,
          nearestCar.x + 7,
          arrowY,
          1.0,
          0.9,
          0.1,
          0.9
        );
      }
    }

    // 5. Render Weapons (Pickups, Bullets, Rockets, Muzzle Flash, Explosions, Scorch marks)
    this.weapons.render(this.batch, this.atlas, this.gameTime);

    // 6. Render Weather & Ambient Day/Night Lighting Overlay (Rain, Thunder flash, Fog, Ambient night)
    this.weatherTime.render(this.batch, this.atlas, bounds);

    this.batch.end();
  }

  destroy(): void {
    this.stop();
    this.input.detach(window);
    this.batch.destroy();
    this.atlas.destroy();
  }
}
