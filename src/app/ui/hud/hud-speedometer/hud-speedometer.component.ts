import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';

@Component({
  selector: 'app-hud-speedometer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hud-speedometer.component.html',
  styleUrl: './hud-speedometer.component.scss'
})
export class HudSpeedometerComponent {
  readonly speed = input<number>(0);
  readonly gear = input<string>('FOOT');
  readonly isDrifting = input<boolean>(false);
  readonly playerMode = input<'driving' | 'on_foot'>('driving');

  readonly formattedSpeed = computed(() => this.speed().toString().padStart(3, '0'));
  readonly tachometerSegments = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
}
