import { Component, input, output } from '@angular/core';

export type UiWindowTheme = 'amber' | 'cyan' | 'green' | 'crimson' | 'purple' | 'blue';

@Component({
  selector: 'app-ui-window',
  standalone: true,
  templateUrl: './ui-window.component.html',
  styleUrl: './ui-window.component.scss'
})
export class UiWindowComponent {
  readonly title = input<string>('WINDOW');
  readonly subtitle = input<string>('');
  readonly theme = input<UiWindowTheme>('amber');
  readonly width = input<string>('560px');
  readonly maxHeight = input<string>('86vh');
  readonly showClose = input<boolean>(true);
  readonly badge = input<string>('');
  readonly position = input<'center' | 'top'>('center');

  readonly close = output<void>();

  onClose(): void {
    this.close.emit();
  }
}
