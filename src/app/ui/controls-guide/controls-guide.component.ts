import { Component, output } from '@angular/core';
import { UiWindowComponent } from '../ui-window/ui-window.component';

@Component({
  selector: 'app-controls-guide',
  standalone: true,
  imports: [UiWindowComponent],
  templateUrl: './controls-guide.component.html',
  styleUrl: './controls-guide.component.scss'
})
export class ControlsGuideComponent {
  readonly close = output<void>();

  onClose(): void {
    this.close.emit();
  }
}
