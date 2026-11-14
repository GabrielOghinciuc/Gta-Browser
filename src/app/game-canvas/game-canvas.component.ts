import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  PLATFORM_ID,
  inject,
  signal,
  HostListener
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { GameEngine, GameState, RadarBlip } from '../engine/GameEngine';
import { WeaponType } from '../engine/weapons/WeaponSystem';
import { ConsoleMessage } from '../engine/console/DevConsole';
import { Shop } from '../engine/world/ShopSystem';
import { ControlsGuideComponent } from '../ui/controls-guide/controls-guide.component';
import { DevConsoleDialogComponent } from '../ui/dev-console-dialog/dev-console-dialog.component';
import { ShopDialogComponent, ShopItem } from '../ui/shop-dialog/shop-dialog.component';
import { HudNotificationsComponent } from '../ui/hud/hud-notifications/hud-notifications.component';
import { HudVitalsComponent } from '../ui/hud/hud-vitals/hud-vitals.component';
import { HudScoreWeaponComponent } from '../ui/hud/hud-score-weapon/hud-score-weapon.component';
import { HudRadarComponent } from '../ui/hud/hud-radar/hud-radar.component';
import { HudSpeedometerComponent } from '../ui/hud/hud-speedometer/hud-speedometer.component';

@Component({
  selector: 'app-game-canvas',
  standalone: true,
  imports: [
    ControlsGuideComponent,
    DevConsoleDialogComponent,
    ShopDialogComponent,
    HudNotificationsComponent,
    HudVitalsComponent,
    HudScoreWeaponComponent,
    HudRadarComponent,
    HudSpeedometerComponent
  ],
  templateUrl: './game-canvas.component.html',
  styleUrl: './game-canvas.component.scss'
})
export class GameCanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private platformId = inject(PLATFORM_ID);
  private engine: GameEngine | null = null;

  // Reactive state for HUD
  readonly speed = signal(0);
  readonly score = signal(0);
  readonly multiplier = signal(1);
  readonly wantedLevel = signal(0);
  readonly isEvading = signal(false);
  readonly health = signal(100);
  readonly armor = signal(100);
  readonly cameraMode = signal('North Up');
  readonly playerMode = signal<'driving' | 'on_foot'>('driving');
  readonly vehicleName = signal('Red Beast');
  readonly toastMessage = signal('Welcome to GTA 2 WebGL!');
  readonly showHelp = signal(true);

  // Weapon signals
  readonly weaponName = signal('Pistol 9mm');
  readonly weaponCode = signal('9MM');
  readonly ammo = signal(80);
  readonly currentWeapon = signal<WeaponType>('pistol');

  // Clock & Weather & District signals
  readonly timeString = signal('12:00');
  readonly weather = signal('CLEAR');
  readonly district = signal('DOWNTOWN // ZAIBATSU');
  readonly playerAngle = signal(0);
  readonly radarBlips = signal<RadarBlip[]>([]);
  readonly isDrifting = signal(false);
  readonly gear = signal('FOOT');

  // Interactive Shop System
  readonly activeShop = signal<Shop | null>(null);

  // Developer Console signals
  readonly isConsoleOpen = signal(false);
  readonly consoleMessages = signal<ConsoleMessage[]>([]);

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return; // Safe guard for Server-Side Rendering
    }

    const canvas = this.canvasRef.nativeElement;
    this.engine = new GameEngine(canvas);

    this.engine.onShopOpen = (shop: Shop) => {
      this.activeShop.set(shop);
    };

    this.engine.onStateUpdate = (state: GameState) => {
      this.speed.set(state.speed);
      this.score.set(state.score);
      this.multiplier.set(state.multiplier);
      this.wantedLevel.set(state.wantedLevel);
      this.isEvading.set(!!state.isEvading);
      this.health.set(state.health);
      this.armor.set(state.armor);
      this.cameraMode.set(state.cameraMode);
      this.playerMode.set(state.playerMode);
      this.vehicleName.set(state.vehicleName);
      this.toastMessage.set(state.toastMessage);
      if (state.weaponName) this.weaponName.set(state.weaponName);
      if (state.weaponCode) this.weaponCode.set(state.weaponCode);
      if (state.ammo !== undefined) this.ammo.set(state.ammo);
      if (state.currentWeapon) this.currentWeapon.set(state.currentWeapon);
      if (state.timeString) this.timeString.set(state.timeString);
      if (state.weather) this.weather.set(state.weather);
      if (state.district) this.district.set(state.district);
      this.playerAngle.set(state.playerAngle);
      this.radarBlips.set(state.radarBlips);
      this.isDrifting.set(state.isDrifting);
      this.gear.set(state.gear);
    };

    this.engine.start();
    this.consoleMessages.set([...this.engine.devConsole.messages]);
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.engine) {
      this.engine.resize(window.innerWidth, window.innerHeight);
    }
  }

  @HostListener('window:keydown', ['$event'])
  onGlobalKeyDown(e: KeyboardEvent): void {
    if (e.key === 'F1' || e.code === 'F1') {
      e.preventDefault();
      e.stopPropagation();
      this.toggleConsole();
    } else if (e.key === 'Escape') {
      if (this.activeShop()) {
        e.preventDefault();
        this.closeShop();
      } else if (this.isConsoleOpen()) {
        e.preventDefault();
        this.toggleConsole();
      } else if (this.showHelp()) {
        e.preventDefault();
        this.toggleHelp();
      }
    }
  }

  closeShop(): void {
    this.activeShop.set(null);
  }

  buyShopItem(item: ShopItem): void {
    if (this.engine) {
      this.engine.buyShopItem(item);
    }
  }

  toggleConsole(): void {
    const nextState = !this.isConsoleOpen();
    this.isConsoleOpen.set(nextState);

    if (this.engine) {
      this.engine.setInputEnabled(!nextState);
      this.consoleMessages.set([...this.engine.devConsole.messages]);
    }
  }

  executeConsoleCommand(cmd: string): void {
    if (!this.engine) return;
    this.engine.devConsole.execute(cmd);
    this.consoleMessages.set([...this.engine.devConsole.messages]);
  }

  onConsolePrevHistory(callback: (cmd: string) => void): void {
    if (!this.engine) return;
    callback(this.engine.devConsole.getPreviousHistory());
  }

  onConsoleNextHistory(callback: (cmd: string) => void): void {
    if (!this.engine) return;
    callback(this.engine.devConsole.getNextHistory());
  }

  toggleHelp(): void {
    this.showHelp.update(v => !v);
  }

  selectWeapon(type: WeaponType): void {
    if (this.engine) {
      this.engine.setWeapon(type);
    }
  }

  ngOnDestroy(): void {
    if (this.engine) {
      this.engine.destroy();
      this.engine = null;
    }
  }
}
