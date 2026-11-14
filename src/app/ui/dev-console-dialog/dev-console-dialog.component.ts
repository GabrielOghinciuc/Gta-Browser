import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  input,
  output
} from '@angular/core';
import { UiWindowComponent } from '../ui-window/ui-window.component';
import { ConsoleMessage } from '../../engine/console/DevConsole';

@Component({
  selector: 'app-dev-console-dialog',
  standalone: true,
  imports: [UiWindowComponent],
  templateUrl: './dev-console-dialog.component.html',
  styleUrl: './dev-console-dialog.component.scss'
})
export class DevConsoleDialogComponent implements AfterViewInit {
  @ViewChild('consoleInput', { static: false }) consoleInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('consoleLogs', { static: false }) consoleLogsRef?: ElementRef<HTMLDivElement>;

  readonly messages = input<ConsoleMessage[]>([]);

  readonly close = output<void>();
  readonly execute = output<string>();
  readonly requestPreviousHistory = output<(cmd: string) => void>();
  readonly requestNextHistory = output<(cmd: string) => void>();

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.consoleInputRef?.nativeElement.focus();
      this.scrollToBottom();
    }, 50);
  }

  onClose(): void {
    this.close.emit();
  }

  submit(inputElem: HTMLInputElement): void {
    const val = inputElem.value;
    inputElem.value = '';
    if (!val || !val.trim()) return;

    this.execute.emit(val);
    this.scrollToBottom();
  }

  quick(cmd: string): void {
    this.execute.emit(cmd);
    this.scrollToBottom();
  }

  handleKeyDown(e: KeyboardEvent, inputElem: HTMLInputElement): void {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.requestPreviousHistory.emit((cmd: string) => {
        if (cmd) inputElem.value = cmd;
      });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.requestNextHistory.emit((cmd: string) => {
        inputElem.value = cmd;
      });
    }
  }

  scrollToBottom(): void {
    setTimeout(() => {
      if (this.consoleLogsRef?.nativeElement) {
        this.consoleLogsRef.nativeElement.scrollTop = this.consoleLogsRef.nativeElement.scrollHeight;
      }
    }, 20);
  }
}
