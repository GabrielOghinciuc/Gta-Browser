import { Component } from '@angular/core';
import { GameCanvasComponent } from './game-canvas/game-canvas.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GameCanvasComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
