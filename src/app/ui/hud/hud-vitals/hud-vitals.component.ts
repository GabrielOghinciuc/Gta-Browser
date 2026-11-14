import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-hud-vitals',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hud-vitals.component.html',
  styleUrl: './hud-vitals.component.scss'
})
export class HudVitalsComponent {
  readonly health = input.required<number>();
  readonly armor = input.required<number>();
  readonly playerMode = input<'driving' | 'on_foot'>('driving');
  readonly vehicleName = input<string>('');
  readonly timeString = input<string>('');
  readonly weather = input<string>('');
  readonly cameraMode = input<string>('');
  readonly district = input<string>('');

  readonly segments = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
}
