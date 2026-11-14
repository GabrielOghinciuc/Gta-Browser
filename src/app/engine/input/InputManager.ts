export class InputManager {
  private keys = new Set<string>();
  private justPressedKeys = new Set<string>();

  enabled = true;

  mouseX = 0;
  mouseY = 0;
  isMouseDown = false;
  isJustClicked = false;
  wheelDelta = 0;

  private keydownHandler = (e: KeyboardEvent) => {
    if (!this.enabled) return;

    if (!this.keys.has(e.code)) {
      this.justPressedKeys.add(e.code);
    }
    this.keys.add(e.code);

    // Prevent default scrolling on arrow keys and space
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
  };

  private keyupHandler = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private mouseMoveHandler = (e: MouseEvent) => {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  };

  private mouseDownHandler = (e: MouseEvent) => {
    if (e.button === 0) {
      this.isMouseDown = true;
      this.isJustClicked = true;
    }
  };

  private mouseUpHandler = (e: MouseEvent) => {
    if (e.button === 0) {
      this.isMouseDown = false;
    }
  };

  private wheelHandler = (e: WheelEvent) => {
    this.wheelDelta = e.deltaY;
  };

  attach(target: Window | HTMLElement): void {
    target.addEventListener('keydown', this.keydownHandler as EventListener);
    target.addEventListener('keyup', this.keyupHandler as EventListener);
    target.addEventListener('mousemove', this.mouseMoveHandler as EventListener);
    target.addEventListener('mousedown', this.mouseDownHandler as EventListener);
    target.addEventListener('mouseup', this.mouseUpHandler as EventListener);
    target.addEventListener('wheel', this.wheelHandler as EventListener, { passive: true });
  }

  detach(target: Window | HTMLElement): void {
    target.removeEventListener('keydown', this.keydownHandler as EventListener);
    target.removeEventListener('keyup', this.keyupHandler as EventListener);
    target.removeEventListener('mousemove', this.mouseMoveHandler as EventListener);
    target.removeEventListener('mousedown', this.mouseDownHandler as EventListener);
    target.removeEventListener('mouseup', this.mouseUpHandler as EventListener);
    target.removeEventListener('wheel', this.wheelHandler as EventListener);
    this.keys.clear();
    this.justPressedKeys.clear();
    this.isMouseDown = false;
    this.isJustClicked = false;
    this.wheelDelta = 0;
  }

  clearAllInputs(): void {
    this.keys.clear();
    this.justPressedKeys.clear();
    this.isMouseDown = false;
    this.isJustClicked = false;
    this.wheelDelta = 0;
  }

  isDown(code: string): boolean {
    if (!this.enabled) return false;
    return this.keys.has(code);
  }

  isJustPressed(code: string): boolean {
    if (!this.enabled) return false;
    return this.justPressedKeys.has(code);
  }

  // Clear just pressed states at the end of each frame
  update(): void {
    this.justPressedKeys.clear();
    this.isJustClicked = false;
    this.wheelDelta = 0;
  }

  get throttle(): number {
    let t = 0;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) t += 1.0;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) t -= 1.0;
    return t;
  }

  get steering(): number {
    let s = 0;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) s += 1.0;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) s -= 1.0;
    return s;
  }

  get handbrake(): boolean {
    return this.isDown('Space');
  }

  get honk(): boolean {
    return this.isDown('KeyH');
  }

  get enterExit(): boolean {
    return (
      this.isJustPressed('KeyF') ||
      this.isJustPressed('Enter')
    );
  }

  get interact(): boolean {
    return this.isJustPressed('KeyE');
  }

  get sprint(): boolean {
    return (
      this.isDown('ShiftLeft') ||
      this.isDown('ShiftRight') ||
      this.isDown('Space')
    );
  }

  get shoot(): boolean {
    if (!this.enabled) return false;
    return (
      this.isMouseDown ||
      this.isDown('ControlLeft') ||
      this.isDown('ControlRight') ||
      this.isDown('KeyJ')
    );
  }

  get isShootingJustPressed(): boolean {
    if (!this.enabled) return false;
    return (
      this.isJustClicked ||
      this.isJustPressed('ControlLeft') ||
      this.isJustPressed('ControlRight') ||
      this.isJustPressed('KeyJ')
    );
  }

  get selectWeapon1(): boolean {
    return this.isJustPressed('Digit1');
  }

  get selectWeapon2(): boolean {
    return this.isJustPressed('Digit2');
  }

  get selectWeapon3(): boolean {
    return this.isJustPressed('Digit3');
  }

  get selectWeapon4(): boolean {
    return this.isJustPressed('Digit4');
  }

  get selectWeapon5(): boolean {
    return this.isJustPressed('Digit5');
  }

  get nextWeapon(): boolean {
    return this.isJustPressed('KeyQ') || this.wheelDelta > 0;
  }

  get prevWeapon(): boolean {
    return this.isJustPressed('KeyE') || this.wheelDelta < 0;
  }

  get toggleCamera(): boolean {
    return this.isJustPressed('KeyC');
  }

  get reset(): boolean {
    return this.isJustPressed('KeyR');
  }
}

