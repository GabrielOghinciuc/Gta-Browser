import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-hud-notifications',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hud-notifications.component.html',
  styleUrl: './hud-notifications.component.scss'
})
export class HudNotificationsComponent {
  readonly toastMessage = input<string>('');
}
