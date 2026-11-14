import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { RadarBlip } from '../../../engine/GameEngine';

@Component({
  selector: 'app-hud-radar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hud-radar.component.html',
  styleUrl: './hud-radar.component.scss'
})
export class HudRadarComponent {
  readonly radarBlips = input<RadarBlip[]>([]);
  readonly playerAngle = input<number>(0);
  readonly district = input<string>('');

  readonly playerRotation = computed(() =>
    `translate(-50%, -50%) rotate(${(this.playerAngle() * 180 / Math.PI)}deg)`
  );
}
