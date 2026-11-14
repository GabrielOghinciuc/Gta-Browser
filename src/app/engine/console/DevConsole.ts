import { WeaponType } from '../weapons/WeaponSystem';
import { WeatherType } from '../world/WeatherTimeSystem';

// Bridge interface to GameEngine without circular references
export interface IGameEngineConsoleBridge {
  healPlayer(): void;
  toggleGodMode(): boolean;
  spawnCarNearPlayer(type?: string): { config: { name: string; type: string } };
  repairActiveCar(): boolean;
  giveAllWeapons(): void;
  giveWeapon(type: WeaponType, amount?: number): void;
  refillAmmo(): void;
  toggleInfiniteAmmo(): boolean;
  setWantedLevel(level: number): void;
  addMoney(amount: number): void;
  explodeTrafficCars(): number;
  spawnPickupOnNearestGrass(type: WeaponType | 'health', amount?: number): { x: number; y: number } | null;
  spawnRandomGrassPickups(count: number): void;
  setSpeedMultiplier(mult: number): void;
  respawnPlayer(): void;
  setTime(hours: number): void;
  setTimeSpeed(speed: number): void;
  setWeather(w: WeatherType): void;
}

export interface ConsoleMessage {
  text: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'cmd';
  timestamp: string;
}

export class DevConsole {
  private history: string[] = [];
  private historyIdx = -1;
  readonly messages: ConsoleMessage[] = [];

  constructor(private engine: IGameEngineConsoleBridge) {
    this.addMessage('GTA 2 Developer Console [F1 to toggle]', 'info');
    this.addMessage('Type "help" to view all cheat codes, or use quick buttons below.', 'info');
  }

  addMessage(text: string, type: ConsoleMessage['type'] = 'info'): void {
    const d = new Date();
    const ts = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    this.messages.push({ text, type, timestamp: ts });
    if (this.messages.length > 250) {
      this.messages.shift();
    }
  }

  execute(rawCmd: string): void {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;

    // Add to command history
    this.history.push(trimmed);
    this.historyIdx = this.history.length;

    // Print command prompt echo
    this.addMessage(`> ${trimmed}`, 'cmd');

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case 'help':
      case '?':
        this.showHelp();
        break;

      case 'heal':
      case 'health':
      case 'aspirine':
      case 'fullhealth':
        this.engine.healPlayer();
        this.addMessage('[OK] Full health restored (100%) & vehicle fully repaired!', 'success');
        break;

      case 'god':
      case 'godmode':
      case 'invincible': {
        const isGod = this.engine.toggleGodMode();
        this.addMessage(isGod ? '[OK] GOD MODE: ON (Invulnerable to all damage)' : '[OFF] GOD MODE: OFF', isGod ? 'success' : 'warn');
        break;
      }

      case 'car':
      case 'spawncar':
      case 'givecar': {
        const typeArg = args[0]?.toLowerCase();
        const car = this.engine.spawnCarNearPlayer(typeArg);
        this.addMessage(`[OK] Spawned vehicle: ${car.config.name} (${car.config.type}) in front of player!`, 'success');
        break;
      }

      case 'repair':
      case 'fix':
      case 'fixcar': {
        const repaired = this.engine.repairActiveCar();
        if (repaired) {
          this.addMessage('[OK] Vehicle fully repaired to 100%!', 'success');
        } else {
          this.addMessage('[NOTE] Not currently in a vehicle. Enter a car with [F] or type "car".', 'warn');
        }
        break;
      }

      case 'weapons':
      case 'guns':
      case 'allweapons':
      case 'thugstools':
      case 'nuttertools':
      case 'professionaltools':
        this.engine.giveAllWeapons();
        this.addMessage('[OK] ALL WEAPONS GRANTED with max ammo (Pistol, Uzi, Shotgun, RPG)!', 'success');
        break;

      case 'give': {
        const weaponName = args[0]?.toLowerCase();
        const amt = args[1] ? parseInt(args[1], 10) : undefined;
        if (!weaponName || !['pistol', 'uzi', 'shotgun', 'rocket'].includes(weaponName)) {
          this.addMessage('Usage: give <pistol | uzi | shotgun | rocket> [amount]', 'error');
        } else {
          this.engine.giveWeapon(weaponName as WeaponType, amt);
          this.addMessage(`[OK] Granted weapon: ${weaponName.toUpperCase()}`, 'success');
        }
        break;
      }

      case 'ammo':
      case 'fullammo':
        this.engine.refillAmmo();
        this.addMessage('[OK] All weapon ammo refilled to maximum capacity!', 'success');
        break;

      case 'infammo':
      case 'infiniteammo': {
        const inf = this.engine.toggleInfiniteAmmo();
        this.addMessage(inf ? '[OK] INFINITE AMMO: ON (Unlimited firepower)' : '[OFF] INFINITE AMMO: OFF', inf ? 'success' : 'warn');
        break;
      }

      case 'wanted': {
        const level = parseInt(args[0], 10);
        if (isNaN(level) || level < 0 || level > 6) {
          this.addMessage('Usage: wanted <0-6> (e.g. wanted 5)', 'error');
        } else {
          this.engine.setWantedLevel(level);
          this.addMessage(`[OK] Wanted level set to ${level} stars!`, 'success');
        }
        break;
      }

      case 'clearwanted':
      case 'copless':
      case 'leavemealone':
        this.engine.setWantedLevel(0);
        this.addMessage('[OK] Wanted level cleared (0 stars). Police search called off.', 'success');
        break;

      case 'money':
      case 'cash': {
        const amt = args[0] ? parseInt(args[0], 10) : 100000;
        const finalAmt = isNaN(amt) ? 100000 : amt;
        this.engine.addMoney(finalAmt);
        this.addMessage(`[OK] Added $${finalAmt.toLocaleString()} to bank account!`, 'success');
        break;
      }

      case 'blowup':
      case 'explode':
      case 'bigbang': {
        const count = this.engine.explodeTrafficCars();
        this.addMessage(`[BOOM] Detonated ${count} vehicles with catastrophic chain explosions!`, 'success');
        break;
      }

      case 'spawnhealth': {
        const pos = this.engine.spawnPickupOnNearestGrass('health', 50);
        if (pos) {
          this.addMessage(`[OK] Health pickup (+50 HP) spawned on GRASS at (${pos.x}, ${pos.y})!`, 'success');
        } else {
          this.addMessage('[NOTE] No grass found in search radius.', 'warn');
        }
        break;
      }

      case 'spawnweapon': {
        const wType = (args[0]?.toLowerCase() as WeaponType) || 'rocket';
        if (!['pistol', 'uzi', 'shotgun', 'rocket'].includes(wType)) {
          this.addMessage('Usage: spawnweapon <pistol | uzi | shotgun | rocket>', 'error');
        } else {
          const pos = this.engine.spawnPickupOnNearestGrass(wType);
          if (pos) {
            this.addMessage(`[OK] ${wType.toUpperCase()} pickup spawned on GRASS at (${pos.x}, ${pos.y})!`, 'success');
          } else {
            this.addMessage('[NOTE] No grass found in search radius.', 'warn');
          }
        }
        break;
      }

      case 'spawngrass':
      case 'pickups': {
        this.engine.spawnRandomGrassPickups(8);
        this.addMessage('[OK] Spawned 8 bonus weapon & health pickups strictly on city grass parks!', 'success');
        break;
      }

      case 'speed': {
        const mult = parseFloat(args[0]);
        if (isNaN(mult) || mult <= 0 || mult > 4) {
          this.addMessage('Usage: speed <0.5 - 3.0> (e.g. speed 1.5 or speed 2)', 'error');
        } else {
          this.engine.setSpeedMultiplier(mult);
          this.addMessage(`[OK] Speed multiplier set to ${mult}x!`, 'success');
        }
        break;
      }

      // --- Weather & Clock Commands ---
      case 'time': {
        const sub = args[0]?.toLowerCase();
        if (sub === 'day') {
          this.engine.setTime(12.0);
          this.addMessage('[OK] Time set to 12:00 (Noon / Day)', 'success');
        } else if (sub === 'night') {
          this.engine.setTime(0.0);
          this.addMessage('[OK] Time set to 00:00 (Midnight / Night)', 'success');
        } else if (sub === 'dusk') {
          this.engine.setTime(19.0);
          this.addMessage('[OK] Time set to 19:00 (Dusk / Sunset)', 'success');
        } else if (sub === 'dawn') {
          this.engine.setTime(6.0);
          this.addMessage('[OK] Time set to 06:00 (Dawn / Sunrise)', 'success');
        } else if (sub !== undefined && !isNaN(parseFloat(sub))) {
          const h = parseFloat(sub);
          this.engine.setTime(h);
          this.addMessage(`[OK] Time set to ${Math.floor(h).toString().padStart(2, '0')}:${Math.floor((h % 1) * 60).toString().padStart(2, '0')}`, 'success');
        } else {
          this.addMessage('Usage: time <0-24 | day | night | dusk | dawn>', 'error');
        }
        break;
      }

      case 'day':
        this.engine.setTime(12.0);
        this.addMessage('[OK] Time set to 12:00 (Day)', 'success');
        break;

      case 'night':
        this.engine.setTime(0.0);
        this.addMessage('[OK] Time set to 00:00 (Night)', 'success');
        break;

      case 'dusk':
        this.engine.setTime(19.0);
        this.addMessage('[OK] Time set to 19:00 (Dusk)', 'success');
        break;

      case 'dawn':
        this.engine.setTime(6.0);
        this.addMessage('[OK] Time set to 06:00 (Dawn)', 'success');
        break;

      case 'timespeed': {
        const spd = parseFloat(args[0]);
        if (isNaN(spd) || spd < 0) {
          this.addMessage('Usage: timespeed <multiplier> (e.g. timespeed 1.0 or timespeed 10)', 'error');
        } else {
          this.engine.setTimeSpeed(spd);
          this.addMessage(`[OK] Clock speed set to ${spd}x!`, 'success');
        }
        break;
      }

      case 'weather': {
        const w = args[0]?.toLowerCase() as WeatherType;
        if (!['clear', 'rain', 'storm', 'fog'].includes(w)) {
          this.addMessage('Usage: weather <clear | rain | storm | fog>', 'error');
        } else {
          this.engine.setWeather(w);
          this.addMessage(`[OK] Weather changed to: ${w.toUpperCase()}`, 'success');
        }
        break;
      }

      case 'clearweather':
      case 'sunny':
        this.engine.setWeather('clear');
        this.addMessage('[OK] Weather set to CLEAR (Sunny)', 'success');
        break;

      case 'rain':
        this.engine.setWeather('rain');
        this.addMessage('[OK] Weather set to RAIN', 'success');
        break;

      case 'storm':
      case 'thunder':
        this.engine.setWeather('storm');
        this.addMessage('[OK] Weather set to STORM (Thunder & Lightning)', 'success');
        break;

      case 'fog':
        this.engine.setWeather('fog');
        this.addMessage('[OK] Weather set to FOG', 'success');
        break;

      case 'kill':
      case 'suicide':
      case 'respawn':
        this.engine.respawnPlayer();
        this.addMessage('[OK] Player respawned at Plaza.', 'info');
        break;

      case 'clear':
      case 'cls':
        this.messages.length = 0;
        break;

      default:
        this.addMessage(`Unknown command: "${cmd}". Type "help" for a list of available cheat codes.`, 'error');
        break;
    }
  }

  getPreviousHistory(): string {
    if (this.history.length === 0) return '';
    if (this.historyIdx > 0) {
      this.historyIdx--;
    }
    return this.history[this.historyIdx] ?? '';
  }

  getNextHistory(): string {
    if (this.history.length === 0) return '';
    if (this.historyIdx < this.history.length - 1) {
      this.historyIdx++;
      return this.history[this.historyIdx] ?? '';
    } else {
      this.historyIdx = this.history.length;
      return '';
    }
  }

  private showHelp(): void {
    this.addMessage('=== GTA 2 CONSOLE CHEAT CODES & COMMANDS ===', 'info');
    this.addMessage('* heal / aspirine : 100% Health & repair active vehicle', 'info');
    this.addMessage('* god : Toggle invulnerability (God mode)', 'info');
    this.addMessage('* car [sports | cop | taxi | muscle | van] : Spawn car ahead', 'info');
    this.addMessage('* fixcar / repair : Fully repair currently driven car', 'info');
    this.addMessage('* weapons / nuttertools : Grant all 4 weapons with max ammo', 'info');
    this.addMessage('* give <pistol|uzi|shotgun|rocket> [amt] : Give specific weapon', 'info');
    this.addMessage('* ammo : Refill all weapons ammo', 'info');
    this.addMessage('* infammo : Toggle infinite ammo mode', 'info');
    this.addMessage('* wanted <0-6> : Set wanted star rating', 'info');
    this.addMessage('* clearwanted / leavemealone : Clear all wanted stars (0)', 'info');
    this.addMessage('* money [amount] / cash : Add cash / score ($100k)', 'info');
    this.addMessage('* blowup / bigbang : Detonate all nearby AI traffic cars', 'info');
    this.addMessage('* spawnhealth : Spawn health pack on nearest GRASS patch', 'info');
    this.addMessage('* spawnweapon <type> : Spawn weapon pickup on nearest GRASS', 'info');
    this.addMessage('* spawngrass : Spawn 8 bonus pickups across city grass parks', 'info');
    this.addMessage('* time <day | night | dusk | dawn | 0-24> : Set time of day', 'info');
    this.addMessage('* weather <clear | rain | storm | fog> : Change weather', 'info');
    this.addMessage('* timespeed <mult> : Adjust in-game clock speed', 'info');
    this.addMessage('* speed <multiplier> : Change vehicle/ped speed (e.g. speed 1.5)', 'info');
    this.addMessage('* kill / respawn : Respawn at plaza', 'info');
    this.addMessage('* clear / cls : Clear console output', 'info');
  }
}
