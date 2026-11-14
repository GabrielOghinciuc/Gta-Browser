import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { WeaponType } from '../../../engine/weapons/WeaponSystem';

@Component({
  selector: 'app-hud-score-weapon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hud-score-weapon.component.html',
  styleUrl: './hud-score-weapon.component.scss'
})
export class HudScoreWeaponComponent {
  readonly score = input.required<number>();
  readonly multiplier = input<number>(1);
  readonly wantedLevel = input<number>(0);
  readonly currentWeapon = input<WeaponType>('pistol');
  readonly weaponCode = input<string>('9MM');
  readonly weaponName = input<string>('Pistol 9mm');
  readonly ammo = input<number>(80);

  readonly selectWeapon = output<WeaponType>();

  readonly stars = [1, 2, 3, 4, 5, 6];
  readonly formattedScore = computed(() => this.score().toString().padStart(8, '0'));

  onSelect(weapon: WeaponType): void {
    this.selectWeapon.emit(weapon);
  }
}
