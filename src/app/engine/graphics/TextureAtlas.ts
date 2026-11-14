import { Texture } from './Texture';

export interface UVCoords {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

export class TextureAtlas {
  readonly texture: Texture;
  readonly regions = new Map<string, UVCoords>();
  readonly atlasSize = 1024;
  readonly cellSize = 64; // 16x16 grid of 64x64 tiles

  constructor(private gl: WebGL2RenderingContext) {
    const canvas = document.createElement('canvas');
    canvas.width = this.atlasSize;
    canvas.height = this.atlasSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context for atlas generation');
    }

    this.drawProceduralAtlas(ctx);
    this.texture = new Texture(gl, this.atlasSize, this.atlasSize, canvas);
  }

  private registerTile(name: string, col: number, row: number, colsSpan = 1, rowsSpan = 1): void {
    const u0 = (col * this.cellSize) / this.atlasSize;
    const v0 = (row * this.cellSize) / this.atlasSize;
    const u1 = ((col + colsSpan) * this.cellSize) / this.atlasSize;
    const v1 = ((row + rowsSpan) * this.cellSize) / this.atlasSize;
    this.regions.set(name, { u0, v0, u1, v1 });
  }

  getUVs(name: string): UVCoords {
    const uv = this.regions.get(name);
    if (!uv) {
      return this.regions.get('white') || { u0: 0, v0: 0, u1: 1, v1: 1 };
    }
    return uv;
  }

  private drawProceduralAtlas(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, this.atlasSize, this.atlasSize);
    const S = this.cellSize;

    // 0, 0: White pixel (for solid colored geometry & particles)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, S, S);
    this.registerTile('white', 0, 0);

    // 1, 0: Road Horizontal
    const rH_x = 1 * S, rH_y = 0 * S;
    ctx.fillStyle = '#2b2e34'; // Asphalt
    ctx.fillRect(rH_x, rH_y, S, S);
    // Road curbs
    ctx.fillStyle = '#555860';
    ctx.fillRect(rH_x, rH_y, S, 4);
    ctx.fillRect(rH_x, rH_y + S - 4, S, 4);
    // Dashed center yellow line
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(rH_x + 8, rH_y + S / 2 - 2, 20, 4);
    ctx.fillRect(rH_x + 36, rH_y + S / 2 - 2, 20, 4);
    this.registerTile('road_h', 1, 0);

    // 2, 0: Road Vertical
    const rV_x = 2 * S, rV_y = 0 * S;
    ctx.fillStyle = '#2b2e34';
    ctx.fillRect(rV_x, rV_y, S, S);
    ctx.fillStyle = '#555860';
    ctx.fillRect(rV_x, rV_y, 4, S);
    ctx.fillRect(rV_x + S - 4, rV_y, 4, S);
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(rV_x + S / 2 - 2, rV_y + 8, 4, 20);
    ctx.fillRect(rV_x + S / 2 - 2, rV_y + 36, 4, 20);
    this.registerTile('road_v', 2, 0);

    // 3, 0: Road Intersection
    const rI_x = 3 * S, rI_y = 0 * S;
    ctx.fillStyle = '#2b2e34';
    ctx.fillRect(rI_x, rI_y, S, S);
    // Pedestrian zebra stripes
    ctx.fillStyle = '#ecf0f1';
    for (let i = 12; i < S - 12; i += 8) {
      ctx.fillRect(rI_x + i, rI_y + 2, 4, 8);
      ctx.fillRect(rI_x + i, rI_y + S - 10, 4, 8);
      ctx.fillRect(rI_x + 2, rI_y + i, 8, 4);
      ctx.fillRect(rI_x + S - 10, rI_y + i, 8, 4);
    }
    this.registerTile('road_cross', 3, 0);

    // 4, 0: Sidewalk
    const sw_x = 4 * S, sw_y = 0 * S;
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(sw_x, sw_y, S, S);
    ctx.strokeStyle = '#636e72';
    ctx.lineWidth = 1;
    // Pavement slabs pattern
    for (let x = 0; x < S; x += 16) {
      for (let y = 0; y < S; y += 16) {
        ctx.strokeRect(sw_x + x + 0.5, sw_y + y + 0.5, 16, 16);
      }
    }
    this.registerTile('sidewalk', 4, 0);

    // 5, 0: Building Roof (Seamless dark slate rooftop slab)
    const bld_x = 5 * S, bld_y = 0 * S;
    ctx.fillStyle = '#263238';
    ctx.fillRect(bld_x, bld_y, S, S);
    // Seamless tar flecks and subtle gravel texture
    ctx.fillStyle = '#1e272e';
    for (let i = 0; i < 28; i++) {
      const rx = bld_x + ((i * 17 + 5) % S);
      const ry = bld_y + ((i * 31 + 11) % S);
      ctx.fillRect(rx, ry, 2, 2);
    }
    ctx.fillStyle = '#37474f';
    for (let i = 0; i < 20; i++) {
      const rx = bld_x + ((i * 23 + 7) % S);
      const ry = bld_y + ((i * 19 + 13) % S);
      ctx.fillRect(rx, ry, 2, 2);
    }
    this.registerTile('building', 5, 0);

    // 6, 0: Natural Lush Manicured Grass Turf (Enhanced with wildflowers & soil)
    const g_x = 6 * S, g_y = 0 * S;
    ctx.fillStyle = '#1e7e34'; // deep rich turf base
    ctx.fillRect(g_x, g_y, S, S);
    // Subtle alternating mower striping
    ctx.fillStyle = '#218c54';
    ctx.fillRect(g_x, g_y, S, S / 2);
    // Multi-tonal organic blade flecks (varied direction)
    ctx.fillStyle = '#27ae60';
    for (let i = 0; i < 35; i++) {
      const rx = g_x + ((i * 17 + 3) % (S - 4));
      const ry = g_y + ((i * 31 + 7) % (S - 4));
      const bw = 1 + (i % 3);
      const bh = 2 + (i % 2);
      ctx.fillRect(rx, ry, bw, bh);
    }
    ctx.fillStyle = '#2ecc71';
    for (let i = 0; i < 25; i++) {
      const rx = g_x + ((i * 23 + 11) % (S - 4));
      const ry = g_y + ((i * 19 + 13) % (S - 4));
      ctx.fillRect(rx, ry, 2, 2);
    }
    ctx.fillStyle = '#10ac84';
    for (let i = 0; i < 15; i++) {
      const rx = g_x + ((i * 29 + 5) % (S - 4));
      const ry = g_y + ((i * 37 + 17) % (S - 4));
      ctx.fillRect(rx, ry, 2, 2);
    }
    // Tiny soil patches
    ctx.fillStyle = '#3e2723';
    for (let i = 0; i < 6; i++) {
      const sx = g_x + ((i * 41 + 9) % (S - 8));
      const sy = g_y + ((i * 53 + 3) % (S - 8));
      ctx.fillRect(sx, sy, 3, 2);
    }
    // Tiny wildflowers scattered
    const wfColors = ['#f1c40f', '#e74c3c', '#9b59b6', '#ffffff'];
    for (let i = 0; i < 8; i++) {
      const fx = g_x + ((i * 37 + 15) % (S - 6));
      const fy = g_y + ((i * 47 + 21) % (S - 6));
      ctx.fillStyle = wfColors[i % wfColors.length];
      ctx.fillRect(fx, fy, 2, 2);
    }
    this.registerTile('grass', 6, 0);

    // 7, 0: Water
    const w_x = 7 * S, w_y = 0 * S;
    ctx.fillStyle = '#2980b9';
    ctx.fillRect(w_x, w_y, S, S);
    ctx.fillStyle = '#3498db';
    ctx.fillRect(w_x + 8, w_y + 16, 24, 4);
    ctx.fillRect(w_x + 32, w_y + 40, 20, 4);
    this.registerTile('water', 7, 0);

    // 0, 1: Player Car (GTA 2 Red Beast) - facing East (+X axis)
    const car_x = 0 * S, car_y = 1 * S;
    // Car shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(car_x + 4, car_y + 14, 56, 36);
    // Wheels (4 tires)
    ctx.fillStyle = '#111111';
    ctx.fillRect(car_x + 10, car_y + 8, 12, 6); // front-left
    ctx.fillRect(car_x + 42, car_y + 8, 12, 6); // rear-left
    ctx.fillRect(car_x + 10, car_y + 50, 12, 6); // front-right
    ctx.fillRect(car_x + 42, car_y + 50, 12, 6); // rear-right
    // Body (Red sports car)
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.roundRect(car_x + 6, car_y + 12, 52, 40, 6);
    ctx.fill();
    // Windshield & rear window (tinted blue/cyan glass)
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(car_x + 32, car_y + 16, 8, 32); // Front windshield
    ctx.fillRect(car_x + 16, car_y + 18, 6, 28); // Rear window
    // Car Roof
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(car_x + 22, car_y + 18, 12, 28);
    // Triangular Headlights (facing forward: right side +X)
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.moveTo(car_x + 58, car_y + 13);
    ctx.lineTo(car_x + 58, car_y + 23);
    ctx.lineTo(car_x + 48, car_y + 17);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(car_x + 58, car_y + 41);
    ctx.lineTo(car_x + 58, car_y + 51);
    ctx.lineTo(car_x + 48, car_y + 47);
    ctx.closePath();
    ctx.fill();
    // Bright white inner headlight triangle cores
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(car_x + 57, car_y + 15);
    ctx.lineTo(car_x + 57, car_y + 21);
    ctx.lineTo(car_x + 50, car_y + 17);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(car_x + 57, car_y + 43);
    ctx.lineTo(car_x + 57, car_y + 49);
    ctx.lineTo(car_x + 50, car_y + 47);
    ctx.closePath();
    ctx.fill();
    // Tail lights
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(car_x + 6, car_y + 14, 2, 6);
    ctx.fillRect(car_x + 6, car_y + 44, 2, 6);
    this.registerTile('car_player', 0, 1);
    this.registerTile('car_sports_red', 0, 1);

    // 1, 1: Police Car (Blue & White Cop Cruiser)
    const cop_x = 1 * S, cop_y = 1 * S;
    // Wheels
    ctx.fillStyle = '#111111';
    ctx.fillRect(cop_x + 10, cop_y + 8, 12, 6);
    ctx.fillRect(cop_x + 42, cop_y + 8, 12, 6);
    ctx.fillRect(cop_x + 10, cop_y + 50, 12, 6);
    ctx.fillRect(cop_x + 42, cop_y + 50, 12, 6);
    // Body (Black and white police cruiser)
    ctx.fillStyle = '#1e272e';
    ctx.beginPath();
    ctx.roundRect(cop_x + 6, cop_y + 12, 52, 40, 6);
    ctx.fill();
    // White doors / roof section
    ctx.fillStyle = '#f5f6fa';
    ctx.fillRect(cop_x + 18, cop_y + 12, 24, 40);
    // Windshield
    ctx.fillStyle = '#2f3640';
    ctx.fillRect(cop_x + 32, cop_y + 16, 8, 32);
    ctx.fillRect(cop_x + 16, cop_y + 18, 6, 28);
    // Police emergency siren bar
    ctx.fillStyle = '#e74c3c'; // Red light
    ctx.fillRect(cop_x + 24, cop_y + 20, 6, 10);
    ctx.fillStyle = '#0984e3'; // Blue light
    ctx.fillRect(cop_x + 24, cop_y + 34, 6, 10);
    // Triangular Headlights
    ctx.fillStyle = '#f5cd79';
    ctx.beginPath();
    ctx.moveTo(cop_x + 58, cop_y + 13);
    ctx.lineTo(cop_x + 58, cop_y + 23);
    ctx.lineTo(cop_x + 48, cop_y + 17);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cop_x + 58, cop_y + 41);
    ctx.lineTo(cop_x + 58, cop_y + 51);
    ctx.lineTo(cop_x + 48, cop_y + 47);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cop_x + 57, car_y + 15);
    ctx.lineTo(cop_x + 57, car_y + 21);
    ctx.lineTo(cop_x + 50, car_y + 17);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cop_x + 57, car_y + 43);
    ctx.lineTo(cop_x + 57, car_y + 49);
    ctx.lineTo(cop_x + 50, car_y + 47);
    ctx.closePath();
    ctx.fill();
    this.registerTile('car_cop', 1, 1);

    // 2, 1: Pedestrian (Top-down person)
    const ped_x = 2 * S, ped_y = 1 * S;
    // Head (Circle in center)
    ctx.fillStyle = '#f39c12'; // Hair/cap
    ctx.beginPath();
    ctx.arc(ped_x + 32, ped_y + 32, 10, 0, Math.PI * 2);
    ctx.fill();
    // Shoulders
    ctx.fillStyle = '#3498db'; // Shirt
    ctx.beginPath();
    ctx.ellipse(ped_x + 32, ped_y + 32, 6, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    this.registerTile('pedestrian', 2, 1);

    // 3, 1: Skid mark
    const sk_x = 3 * S, sk_y = 1 * S;
    ctx.fillStyle = 'rgba(20, 20, 20, 0.7)';
    ctx.fillRect(sk_x + 2, sk_y + 16, S - 4, 32);
    this.registerTile('skidmark', 3, 1);

    // 4, 1: Taxi (Yellow Cab)
    const taxi_x = 4 * S, taxi_y = 1 * S;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(taxi_x + 4, taxi_y + 14, 56, 36);
    ctx.fillStyle = '#111111';
    ctx.fillRect(taxi_x + 10, taxi_y + 8, 12, 6);
    ctx.fillRect(taxi_x + 42, taxi_y + 8, 12, 6);
    ctx.fillRect(taxi_x + 10, taxi_y + 50, 12, 6);
    ctx.fillRect(taxi_x + 42, taxi_y + 50, 12, 6);
    // Yellow body
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.roundRect(taxi_x + 6, taxi_y + 12, 52, 40, 6);
    ctx.fill();
    // Windshields
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(taxi_x + 32, taxi_y + 16, 8, 32);
    ctx.fillRect(taxi_x + 16, taxi_y + 18, 6, 28);
    // Roof Taxi Checker & Light
    ctx.fillStyle = '#e67e22';
    ctx.fillRect(taxi_x + 22, taxi_y + 18, 12, 28);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(taxi_x + 25, taxi_y + 22, 6, 20);
    ctx.fillStyle = '#000000';
    ctx.fillRect(taxi_x + 25, taxi_y + 24, 3, 4);
    ctx.fillRect(taxi_x + 28, taxi_y + 28, 3, 4);
    ctx.fillRect(taxi_x + 25, taxi_y + 32, 3, 4);
    ctx.fillRect(taxi_x + 28, taxi_y + 36, 3, 4);
    // Triangular Headlights
    ctx.fillStyle = '#ffeaa7';
    ctx.beginPath();
    ctx.moveTo(taxi_x + 58, taxi_y + 13);
    ctx.lineTo(taxi_x + 58, taxi_y + 23);
    ctx.lineTo(taxi_x + 48, taxi_y + 17);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(taxi_x + 58, taxi_y + 41);
    ctx.lineTo(taxi_x + 58, taxi_y + 51);
    ctx.lineTo(taxi_x + 48, taxi_y + 47);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(taxi_x + 57, taxi_y + 15);
    ctx.lineTo(taxi_x + 57, taxi_y + 21);
    ctx.lineTo(taxi_x + 50, taxi_y + 17);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(taxi_x + 57, taxi_y + 43);
    ctx.lineTo(taxi_x + 57, taxi_y + 49);
    ctx.lineTo(taxi_x + 50, taxi_y + 47);
    ctx.closePath();
    ctx.fill();
    // Tail lights
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(taxi_x + 6, taxi_y + 14, 2, 6);
    ctx.fillRect(taxi_x + 6, taxi_y + 44, 2, 6);
    this.registerTile('car_taxi', 4, 1);

    // 5, 1: Sports Yellow (Viper GT)
    const sy_x = 5 * S, sy_y = 1 * S;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(sy_x + 4, sy_y + 14, 56, 36);
    ctx.fillStyle = '#111111';
    ctx.fillRect(sy_x + 10, sy_y + 8, 12, 6);
    ctx.fillRect(sy_x + 42, sy_y + 8, 12, 6);
    ctx.fillRect(sy_x + 10, sy_y + 50, 12, 6);
    ctx.fillRect(sy_x + 42, sy_y + 50, 12, 6);
    // Body (Gold / Bright Yellow)
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.roundRect(sy_x + 6, sy_y + 12, 52, 40, 6);
    ctx.fill();
    // Black dual racing stripes
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(sy_x + 6, sy_y + 26, 52, 4);
    ctx.fillRect(sy_x + 6, sy_y + 34, 52, 4);
    // Windshields
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(sy_x + 34, sy_y + 16, 7, 32);
    ctx.fillRect(sy_x + 16, sy_y + 18, 6, 28);
    // Rear spoiler
    ctx.fillStyle = '#111111';
    ctx.fillRect(sy_x + 6, sy_y + 10, 4, 44);
    // Triangular Headlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(sy_x + 58, sy_y + 13);
    ctx.lineTo(sy_x + 58, sy_y + 24);
    ctx.lineTo(sy_x + 46, sy_y + 17);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sy_x + 58, sy_y + 40);
    ctx.lineTo(sy_x + 58, sy_y + 51);
    ctx.lineTo(sy_x + 46, sy_y + 47);
    ctx.closePath();
    ctx.fill();
    this.registerTile('car_sports_yellow', 5, 1);

    // 6, 1: Blue Sedan (Kuruma Sedan)
    const sed_x = 6 * S, sed_y = 1 * S;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(sed_x + 4, sed_y + 14, 56, 36);
    ctx.fillStyle = '#111111';
    ctx.fillRect(sed_x + 10, sed_y + 8, 12, 6);
    ctx.fillRect(sed_x + 42, sed_y + 8, 12, 6);
    ctx.fillRect(sed_x + 10, sed_y + 50, 12, 6);
    ctx.fillRect(sed_x + 42, sed_y + 50, 12, 6);
    // Navy metallic body
    ctx.fillStyle = '#2980b9';
    ctx.beginPath();
    ctx.roundRect(sed_x + 6, sed_y + 12, 52, 40, 6);
    ctx.fill();
    // Windows
    ctx.fillStyle = '#1b2a47';
    ctx.fillRect(sed_x + 32, sed_y + 16, 8, 32);
    ctx.fillRect(sed_x + 16, sed_y + 18, 6, 28);
    // Roof with sunroof
    ctx.fillStyle = '#3498db';
    ctx.fillRect(sed_x + 22, sed_y + 17, 12, 30);
    ctx.fillStyle = '#151e2d';
    ctx.fillRect(sed_x + 24, sed_y + 25, 8, 14);
    // Triangular Headlights
    ctx.fillStyle = '#ffeaa7';
    ctx.beginPath();
    ctx.moveTo(sed_x + 58, sed_y + 14);
    ctx.lineTo(sed_x + 58, sed_y + 23);
    ctx.lineTo(sed_x + 48, sed_y + 18);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sed_x + 58, sed_y + 41);
    ctx.lineTo(sed_x + 58, sed_y + 50);
    ctx.lineTo(sed_x + 48, sed_y + 46);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(sed_x + 57, sed_y + 16);
    ctx.lineTo(sed_x + 57, sed_y + 21);
    ctx.lineTo(sed_x + 50, sed_y + 18);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sed_x + 57, sed_y + 43);
    ctx.lineTo(sed_x + 57, sed_y + 48);
    ctx.lineTo(sed_x + 50, sed_y + 46);
    ctx.closePath();
    ctx.fill();
    this.registerTile('car_sedan_blue', 6, 1);

    // 7, 1: Muscle Green (Stallion V8)
    const mus_x = 7 * S, mus_y = 1 * S;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(mus_x + 4, mus_y + 14, 56, 36);
    ctx.fillStyle = '#111111';
    ctx.fillRect(mus_x + 10, mus_y + 7, 14, 7);
    ctx.fillRect(mus_x + 42, mus_y + 7, 14, 7);
    ctx.fillRect(mus_x + 10, mus_y + 50, 14, 7);
    ctx.fillRect(mus_x + 42, mus_y + 50, 14, 7);
    // Dark emerald green body
    ctx.fillStyle = '#16a085';
    ctx.beginPath();
    ctx.roundRect(mus_x + 6, mus_y + 11, 52, 42, 6);
    ctx.fill();
    // Black hood scoop
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(mus_x + 40, mus_y + 26, 10, 12);
    // Windows
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(mus_x + 32, mus_y + 16, 7, 32);
    ctx.fillRect(mus_x + 15, mus_y + 18, 6, 28);
    // Triangular Headlights
    ctx.fillStyle = '#f9ca24';
    ctx.beginPath();
    ctx.moveTo(mus_x + 58, mus_y + 13);
    ctx.lineTo(mus_x + 58, mus_y + 23);
    ctx.lineTo(mus_x + 48, mus_y + 17);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(mus_x + 58, mus_y + 41);
    ctx.lineTo(mus_x + 58, mus_y + 51);
    ctx.lineTo(mus_x + 48, mus_y + 47);
    ctx.closePath();
    ctx.fill();
    this.registerTile('car_muscle_green', 7, 1);

    // 0, 2: White Delivery Van (Pony Van)
    const van_x = 0 * S, van_y = 2 * S;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(van_x + 4, van_y + 12, 58, 40);
    ctx.fillStyle = '#111111';
    ctx.fillRect(van_x + 10, van_y + 8, 12, 6);
    ctx.fillRect(van_x + 44, van_y + 8, 12, 6);
    ctx.fillRect(van_x + 10, van_y + 50, 12, 6);
    ctx.fillRect(van_x + 44, van_y + 50, 12, 6);
    // White Boxy Van Body
    ctx.fillStyle = '#dfe6e9';
    ctx.beginPath();
    ctx.roundRect(van_x + 6, van_y + 11, 54, 42, 4);
    ctx.fill();
    // Blue side stripe
    ctx.fillStyle = '#0984e3';
    ctx.fillRect(van_x + 6, van_y + 12, 54, 4);
    ctx.fillRect(van_x + 6, van_y + 48, 54, 4);
    // Cabin front windshield
    ctx.fillStyle = '#2d3436';
    ctx.fillRect(van_x + 42, van_y + 16, 8, 32);
    // Roof ridges
    ctx.fillStyle = '#b2bec3';
    ctx.fillRect(van_x + 12, van_y + 20, 26, 3);
    ctx.fillRect(van_x + 12, van_y + 30, 26, 3);
    ctx.fillRect(van_x + 12, van_y + 40, 26, 3);
    // Triangular Headlights
    ctx.fillStyle = '#ffeaa7';
    ctx.beginPath();
    ctx.moveTo(van_x + 60, van_y + 13);
    ctx.lineTo(van_x + 60, van_y + 24);
    ctx.lineTo(van_x + 50, van_y + 18);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(van_x + 60, van_y + 40);
    ctx.lineTo(van_x + 60, van_y + 51);
    ctx.lineTo(van_x + 50, van_y + 46);
    ctx.closePath();
    ctx.fill();
    this.registerTile('car_van_white', 0, 2);

    // 1, 2: Player On Foot (Claude / GTA Protagonist)
    const ply_x = 1 * S, ply_y = 2 * S;
    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(ply_x + 34, ply_y + 35, 12, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    // Shoulders & Leather jacket (facing East +X)
    ctx.fillStyle = '#1e272e'; // Dark leather jacket
    ctx.beginPath();
    ctx.ellipse(ply_x + 30, ply_y + 32, 10, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    // Arms / Hands
    ctx.fillStyle = '#ffc048'; // Hands skin tone
    ctx.beginPath();
    ctx.arc(ply_x + 36, ply_y + 20, 4, 0, Math.PI * 2);
    ctx.arc(ply_x + 36, ply_y + 44, 4, 0, Math.PI * 2);
    ctx.fill();
    // Blue jeans legs peek
    ctx.fillStyle = '#2980b9';
    ctx.fillRect(ply_x + 18, ply_y + 26, 8, 5);
    ctx.fillRect(ply_x + 18, ply_y + 33, 8, 5);
    // Head with styled hair
    ctx.fillStyle = '#4b382a'; // Brown hair
    ctx.beginPath();
    ctx.arc(ply_x + 30, ply_y + 32, 8, 0, Math.PI * 2);
    ctx.fill();
    // Green shirt collar / inner shirt
    ctx.fillStyle = '#2ed573';
    ctx.fillRect(ply_x + 34, ply_y + 30, 4, 4);
    this.registerTile('player_foot', 1, 2);

    // 2, 2: Pedestrian 2 (Business suit)
    const ped2_x = 2 * S, ped2_y = 2 * S;
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.ellipse(ped2_x + 32, ped2_y + 32, 6, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e74c3c'; // Red tie
    ctx.fillRect(ped2_x + 35, ped2_y + 30, 4, 4);
    ctx.fillStyle = '#795548'; // Hair
    ctx.beginPath();
    ctx.arc(ped2_x + 32, ped2_y + 32, 9, 0, Math.PI * 2);
    ctx.fill();
    this.registerTile('pedestrian_2', 2, 2);

    // 3, 2: Pedestrian 3 (Jogger in bright yellow/green hoodie)
    const ped3_x = 3 * S, ped3_y = 2 * S;
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.ellipse(ped3_x + 32, ped3_y + 32, 6, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111111'; // Dark cap
    ctx.beginPath();
    ctx.arc(ped3_x + 32, ped3_y + 32, 9, 0, Math.PI * 2);
    ctx.fill();
    this.registerTile('pedestrian_3', 3, 2);

    // 4, 2: Tree Large (Lush animated canopy)
    const tree_x = 4 * S, tree_y = 2 * S;
    // Tree trunk & shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(tree_x + 34, tree_y + 36, 24, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    // Dark base foliage lobes
    ctx.fillStyle = '#1b5e20';
    ctx.beginPath();
    ctx.arc(tree_x + 22, tree_y + 24, 16, 0, Math.PI * 2);
    ctx.arc(tree_x + 42, tree_y + 24, 16, 0, Math.PI * 2);
    ctx.arc(tree_x + 32, tree_y + 40, 18, 0, Math.PI * 2);
    ctx.fill();
    // Mid-tone rich green
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.arc(tree_x + 26, tree_y + 28, 14, 0, Math.PI * 2);
    ctx.arc(tree_x + 38, tree_y + 28, 14, 0, Math.PI * 2);
    ctx.arc(tree_x + 32, tree_y + 34, 15, 0, Math.PI * 2);
    ctx.fill();
    // Bright top highlights
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.arc(tree_x + 30, tree_y + 26, 10, 0, Math.PI * 2);
    ctx.arc(tree_x + 36, tree_y + 24, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#81c784';
    ctx.beginPath();
    ctx.arc(tree_x + 32, tree_y + 23, 5, 0, Math.PI * 2);
    ctx.fill();
    this.registerTile('tree_large', 4, 2);

    // 5, 2: Tree Bush / Shrub
    const bush_x = 5 * S, bush_y = 2 * S;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(bush_x + 33, bush_y + 34, 18, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e7e34';
    ctx.beginPath();
    ctx.arc(bush_x + 26, bush_y + 30, 12, 0, Math.PI * 2);
    ctx.arc(bush_x + 38, bush_y + 30, 12, 0, Math.PI * 2);
    ctx.arc(bush_x + 32, bush_y + 36, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#48c774';
    ctx.beginPath();
    ctx.arc(bush_x + 30, bush_y + 28, 7, 0, Math.PI * 2);
    ctx.fill();
    this.registerTile('tree_bush', 5, 2);

    // 6, 2: Radial Light Halo (Glow texture for streetlights, traffic lights, and neons)
    const halo_x = 6 * S, halo_y = 2 * S;
    const haloGrad = ctx.createRadialGradient(
      halo_x + 32,
      halo_y + 32,
      0,
      halo_x + 32,
      halo_y + 32,
      32
    );
    haloGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    haloGrad.addColorStop(0.25, 'rgba(255, 255, 255, 0.7)');
    haloGrad.addColorStop(0.65, 'rgba(255, 255, 255, 0.18)');
    haloGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = haloGrad;
    ctx.fillRect(halo_x, halo_y, S, S);
    this.registerTile('light_halo', 6, 2);

    // 7, 2: AC Ventilator Box Base
    const ac_x = 7 * S, ac_y = 2 * S;
    ctx.fillStyle = '#2f3542';
    ctx.fillRect(ac_x + 12, ac_y + 12, 40, 40);
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(ac_x + 16, ac_y + 16, 32, 32);
    // Circular grill recess
    ctx.fillStyle = '#111417';
    ctx.beginPath();
    ctx.arc(ac_x + 32, ac_y + 32, 14, 0, Math.PI * 2);
    ctx.fill();
    this.registerTile('ac_vent_base', 7, 2);

    // 0, 3: AC Ventilator Rotating Propeller Fan
    const fan_x = 0 * S, fan_y = 3 * S;
    ctx.fillStyle = '#a4b0be';
    // 4 curved aerodynamic blades centered at (32, 32)
    ctx.beginPath();
    ctx.ellipse(fan_x + 32, fan_y + 22, 3, 9, 0, 0, Math.PI * 2);
    ctx.ellipse(fan_x + 32, fan_y + 42, 3, 9, 0, 0, Math.PI * 2);
    ctx.ellipse(fan_x + 22, fan_y + 32, 9, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(fan_x + 42, fan_y + 32, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Center bolt
    ctx.fillStyle = '#f1f2f6';
    ctx.beginPath();
    ctx.arc(fan_x + 32, fan_y + 32, 4, 0, Math.PI * 2);
    ctx.fill();
    this.registerTile('ac_vent_fan', 0, 3);

    // 1, 3: Traffic Light EW Housing
    const tl_x = 1 * S, tl_y = 3 * S;
    ctx.fillStyle = '#1e272e';
    ctx.beginPath();
    ctx.roundRect(tl_x + 8, tl_y + 20, 48, 24, 6);
    ctx.fill();
    // Red, Yellow, Green bulbs
    ctx.fillStyle = '#6f2832';
    ctx.beginPath();
    ctx.arc(tl_x + 18, tl_y + 32, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#76551b';
    ctx.beginPath();
    ctx.arc(tl_x + 32, tl_y + 32, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c6b3b';
    ctx.beginPath();
    ctx.arc(tl_x + 46, tl_y + 32, 6, 0, Math.PI * 2);
    ctx.fill();
    this.registerTile('traffic_light_ew', 1, 3);

    // 2, 3: Traffic Light NS Housing
    const tln_x = 2 * S, tln_y = 3 * S;
    ctx.fillStyle = '#1e272e';
    ctx.beginPath();
    ctx.roundRect(tln_x + 20, tln_y + 8, 24, 48, 6);
    ctx.fill();
    ctx.fillStyle = '#6f2832';
    ctx.beginPath();
    ctx.arc(tln_x + 32, tln_y + 18, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#76551b';
    ctx.beginPath();
    ctx.arc(tln_x + 32, tln_y + 32, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c6b3b';
    ctx.beginPath();
    ctx.arc(tln_x + 32, tln_y + 46, 6, 0, Math.PI * 2);
    ctx.fill();
    this.registerTile('traffic_light_ns', 2, 3);

    // 3, 3: Neon Sign "HOTEL"
    const nh_x = 3 * S, nh_y = 3 * S;
    ctx.fillStyle = '#111417';
    ctx.fillRect(nh_x + 4, nh_y + 16, 56, 32);
    ctx.strokeStyle = '#ff3838';
    ctx.lineWidth = 2;
    ctx.strokeRect(nh_x + 6, nh_y + 18, 52, 28);
    ctx.fillStyle = '#ff3838';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HOTEL', nh_x + 32, nh_y + 32);
    this.registerTile('neon_hotel', 3, 3);

    // 4, 3: Neon Sign "CASINO"
    const nc_x = 4 * S, nc_y = 3 * S;
    ctx.fillStyle = '#111417';
    ctx.fillRect(nc_x + 4, nc_y + 16, 56, 32);
    ctx.strokeStyle = '#ffd32a';
    ctx.lineWidth = 2;
    ctx.strokeRect(nc_x + 6, nh_y + 18, 52, 28);
    ctx.fillStyle = '#ffd32a';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CASINO', nc_x + 32, nc_y + 32);
    this.registerTile('neon_casino', 4, 3);

    // 5, 3: Neon Sign "DINER"
    const nd_x = 5 * S, nd_y = 3 * S;
    ctx.fillStyle = '#111417';
    ctx.fillRect(nd_x + 4, nd_y + 16, 56, 32);
    ctx.strokeStyle = '#05c46b';
    ctx.lineWidth = 2;
    ctx.strokeRect(nd_x + 6, nd_y + 18, 52, 28);
    ctx.fillStyle = '#0be881';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DINER', nd_x + 32, nd_y + 32);
    this.registerTile('neon_diner', 5, 3);

    // 6, 3: Sewer Manhole Cover
    const mh_x = 6 * S, mh_y = 3 * S;
    ctx.fillStyle = '#2d3436';
    ctx.beginPath();
    ctx.arc(mh_x + 32, mh_y + 32, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#485460';
    ctx.beginPath();
    ctx.arc(mh_x + 32, mh_y + 32, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e272e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mh_x + 32, mh_y + 32, 10, 0, Math.PI * 2);
    ctx.stroke();
    // Slots
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(mh_x + 24, mh_y + 30, 16, 3);
    ctx.fillRect(mh_x + 30, mh_y + 24, 3, 16);
    this.registerTile('manhole', 6, 3);

    // 7, 3: Soft Steam Particle
    const st_x = 7 * S, st_y = 3 * S;
    const steamGrad = ctx.createRadialGradient(
      st_x + 32,
      st_y + 32,
      0,
      st_x + 32,
      st_y + 32,
      30
    );
    steamGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    steamGrad.addColorStop(0.4, 'rgba(240, 243, 246, 0.45)');
    steamGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = steamGrad;
    ctx.fillRect(st_x, st_y, S, S);
    this.registerTile('steam_puff', 7, 3);

    // 0, 4: Pigeon / City Bird
    const pg_x = 0 * S, pg_y = 4 * S;
    ctx.fillStyle = '#57606f'; // Gray body
    ctx.beginPath();
    ctx.ellipse(pg_x + 32, pg_y + 32, 4, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wings
    ctx.fillStyle = '#2f3542';
    ctx.beginPath();
    ctx.ellipse(pg_x + 28, pg_y + 32, 3, 6, -0.2, 0, Math.PI * 2);
    ctx.ellipse(pg_x + 36, pg_y + 32, 3, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // Head & beak
    ctx.fillStyle = '#3742fa'; // iridescent neck
    ctx.beginPath();
    ctx.arc(pg_x + 32, pg_y + 25, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffa502'; // beak
    ctx.fillRect(pg_x + 31, pg_y + 22, 2, 2);
    this.registerTile('pigeon', 0, 4);

    // 1, 4: Streetlamp Fixture
    const sl_x = 1 * S, sl_y = 4 * S;
    ctx.fillStyle = '#1e272e';
    ctx.beginPath();
    ctx.arc(sl_x + 32, sl_y + 32, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f6b93b';
    ctx.beginPath();
    ctx.arc(sl_x + 32, sl_y + 32, 3.5, 0, Math.PI * 2);
    ctx.fill();
    this.registerTile('street_lamp', 1, 4);

    // 2, 4: Soft Cloud Shadow
    const cld_x = 2 * S, cld_y = 4 * S;
    const cldGrad = ctx.createRadialGradient(
      cld_x + 32,
      cld_y + 32,
      0,
      cld_x + 32,
      cld_y + 32,
      32
    );
    cldGrad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
    cldGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.25)');
    cldGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = cldGrad;
    ctx.fillRect(cld_x, cld_y, S, S);
    this.registerTile('cloud_shadow', 2, 4);

    // 3, 4: Weapon Icon - Pistol (9mm)
    const wp_x = 3 * S, wp_y = 4 * S;
    ctx.fillStyle = 'rgba(24, 28, 36, 0.9)';
    ctx.beginPath();
    ctx.roundRect(wp_x + 4, wp_y + 4, 56, 56, 8);
    ctx.fill();
    ctx.strokeStyle = '#ffa502';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Pistol barrel & slide
    ctx.fillStyle = '#dfe4ea';
    ctx.fillRect(wp_x + 16, wp_y + 20, 32, 10);
    // Pistol grip
    ctx.fillStyle = '#2f3542';
    ctx.beginPath();
    ctx.moveTo(wp_x + 20, wp_y + 30);
    ctx.lineTo(wp_x + 14, wp_y + 46);
    ctx.lineTo(wp_x + 24, wp_y + 46);
    ctx.lineTo(wp_x + 28, wp_y + 30);
    ctx.closePath();
    ctx.fill();
    // Trigger guard
    ctx.strokeStyle = '#747d8c';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(wp_x + 24, wp_y + 30, 8, 8);
    this.registerTile('icon_pistol', 3, 4);

    // 4, 4: Weapon Icon - Uzi / Micro SMG
    const uz_x = 4 * S, uz_y = 4 * S;
    ctx.fillStyle = 'rgba(24, 28, 36, 0.9)';
    ctx.beginPath();
    ctx.roundRect(uz_x + 4, uz_y + 4, 56, 56, 8);
    ctx.fill();
    ctx.strokeStyle = '#2ed573';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Uzi body
    ctx.fillStyle = '#2f3542';
    ctx.fillRect(uz_x + 14, uz_y + 22, 34, 12);
    // Barrel
    ctx.fillStyle = '#747d8c';
    ctx.fillRect(uz_x + 48, uz_y + 25, 6, 4);
    // Grip & Magazine
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(uz_x + 26, uz_y + 34, 8, 16);
    // Folding stock
    ctx.strokeStyle = '#57606f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(uz_x + 14, uz_y + 24);
    ctx.lineTo(uz_x + 8, uz_y + 28);
    ctx.stroke();
    this.registerTile('icon_uzi', 4, 4);

    // 5, 4: Weapon Icon - Shotgun (12-Gauge Pump)
    const sg_x = 5 * S, sg_y = 4 * S;
    ctx.fillStyle = 'rgba(24, 28, 36, 0.9)';
    ctx.beginPath();
    ctx.roundRect(sg_x + 4, sg_y + 4, 56, 56, 8);
    ctx.fill();
    ctx.strokeStyle = '#ff4757';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Long barrel
    ctx.fillStyle = '#747d8c';
    ctx.fillRect(sg_x + 16, wp_y + 24, 40, 5);
    ctx.fillRect(sg_x + 20, wp_y + 29, 28, 4); // magazine tube
    // Pump slide (wood/polymer)
    ctx.fillStyle = '#e67e22';
    ctx.fillRect(sg_x + 32, wp_y + 28, 10, 6);
    // Wooden stock
    ctx.fillStyle = '#8b5a2b';
    ctx.beginPath();
    ctx.moveTo(sg_x + 16, wp_y + 26);
    ctx.lineTo(sg_x + 8, wp_y + 36);
    ctx.lineTo(sg_x + 12, wp_y + 40);
    ctx.lineTo(sg_x + 20, wp_y + 30);
    ctx.closePath();
    ctx.fill();
    this.registerTile('icon_shotgun', 5, 4);

    // 6, 4: Weapon Icon - Rocket Launcher (RPG)
    const rk_x = 6 * S, rk_y = 4 * S;
    ctx.fillStyle = 'rgba(24, 28, 36, 0.9)';
    ctx.beginPath();
    ctx.roundRect(rk_x + 4, rk_y + 4, 56, 56, 8);
    ctx.fill();
    ctx.strokeStyle = '#ff6b81';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Launcher tube
    ctx.fillStyle = '#3742fa';
    ctx.fillRect(rk_x + 10, rk_y + 25, 40, 10);
    // Rocket tip peeking out
    ctx.fillStyle = '#ff4757';
    ctx.beginPath();
    ctx.moveTo(rk_x + 50, rk_y + 23);
    ctx.lineTo(rk_x + 56, rk_y + 30);
    ctx.lineTo(rk_x + 50, rk_y + 37);
    ctx.closePath();
    ctx.fill();
    // Optical sight & grip
    ctx.fillStyle = '#2f3542';
    ctx.fillRect(rk_x + 24, rk_y + 18, 12, 7);
    ctx.fillRect(rk_x + 22, rk_y + 35, 6, 12);
    this.registerTile('icon_rocket', 6, 4);

    // 7, 4: Health Medkit Pickup
    const hk_x = 7 * S, hk_y = 4 * S;
    ctx.fillStyle = 'rgba(24, 28, 36, 0.9)';
    ctx.beginPath();
    ctx.roundRect(hk_x + 4, hk_y + 4, 56, 56, 8);
    ctx.fill();
    ctx.strokeStyle = '#2ed573';
    ctx.lineWidth = 2;
    ctx.stroke();
    // White first-aid kit
    ctx.fillStyle = '#f1f2f6';
    ctx.beginPath();
    ctx.roundRect(hk_x + 12, hk_y + 16, 40, 32, 5);
    ctx.fill();
    // Red Cross
    ctx.fillStyle = '#ff4757';
    ctx.fillRect(hk_x + 28, hk_y + 22, 8, 20);
    ctx.fillRect(hk_x + 22, hk_y + 28, 20, 8);
    this.registerTile('icon_health', 7, 4);

    // 0, 5: Projectile Rocket
    const prk_x = 0 * S, prk_y = 5 * S;
    // Rocket body
    ctx.fillStyle = '#2ed573';
    ctx.fillRect(prk_x + 14, prk_y + 27, 28, 10);
    // Warhead
    ctx.fillStyle = '#ff4757';
    ctx.beginPath();
    ctx.moveTo(prk_x + 42, prk_y + 25);
    ctx.lineTo(prk_x + 52, prk_y + 32);
    ctx.lineTo(prk_x + 42, prk_y + 39);
    ctx.closePath();
    ctx.fill();
    // Tail fins
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(prk_x + 10, prk_y + 23, 6, 18);
    // Fiery exhaust
    ctx.fillStyle = '#ffa502';
    ctx.beginPath();
    ctx.moveTo(prk_x + 10, prk_y + 28);
    ctx.lineTo(prk_x + 2, prk_y + 32);
    ctx.lineTo(prk_x + 10, prk_y + 36);
    ctx.closePath();
    ctx.fill();
    this.registerTile('projectile_rocket', 0, 5);

    // 1, 5: Scorch Mark (Explosion Crater)
    const sm_x = 1 * S, sm_y = 5 * S;
    ctx.fillStyle = 'rgba(15, 15, 15, 0.75)';
    ctx.beginPath();
    ctx.arc(sm_x + 32, sm_y + 32, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(25, 25, 25, 0.6)';
    ctx.beginPath();
    ctx.arc(sm_x + 32, sm_y + 32, 18, 0, Math.PI * 2);
    ctx.fill();
    this.registerTile('scorch_mark', 1, 5);

    // 2, 5: Car Wreck (Burnt Charred Hull)
    const wrk_x = 2 * S, wrk_y = 5 * S;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(wrk_x + 4, wrk_y + 14, 56, 36);
    // Burnt body
    ctx.fillStyle = '#1e2229';
    ctx.beginPath();
    ctx.roundRect(wrk_x + 6, wrk_y + 12, 52, 40, 6);
    ctx.fill();
    // Scorched exposed cabin
    ctx.fillStyle = '#0a0c0e';
    ctx.fillRect(wrk_x + 18, wrk_y + 16, 24, 32);
    // Burnt rust/ember spots
    ctx.fillStyle = '#78281f';
    ctx.fillRect(wrk_x + 10, wrk_y + 18, 6, 6);
    ctx.fillRect(wrk_x + 42, wrk_y + 36, 8, 6);
    this.registerTile('car_wreck', 2, 5);

    // 3, 5: Muzzle Flash Starburst
    const mf_x = 3 * S, mf_y = 5 * S;
    ctx.fillStyle = '#fff200';
    ctx.beginPath();
    ctx.arc(mf_x + 32, mf_y + 32, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(mf_x + 32, mf_y + 32, 5, 0, Math.PI * 2);
    ctx.fill();
    // Star rays
    ctx.fillStyle = '#ff9f1a';
    ctx.fillRect(mf_x + 12, mf_y + 30, 40, 4);
    ctx.fillRect(mf_x + 30, mf_y + 12, 4, 40);
    this.registerTile('muzzle_flash', 3, 5);

    // 4, 5: Pickup Rotating Base Halo
    const pb_x = 4 * S, pb_y = 5 * S;
    ctx.strokeStyle = '#2ed573';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(pb_x + 32, pb_y + 32, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ffa502';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pb_x + 32, pb_y + 32, 14, 0, Math.PI * 2);
    ctx.stroke();
    this.registerTile('pickup_base', 4, 5);

    // -----------------------------------------------------------------
    // 5..7, 5..7: Procedural 3x3 Roundabout (Giratoriu) Base (192x192 px)
    // -----------------------------------------------------------------
    const rb_x = 5 * S;
    const rb_y = 5 * S;
    const rb_w = 3 * S; // 192 px
    const rb_h = 3 * S; // 192 px
    const cx = rb_x + 96;
    const cy = rb_y + 96;
    const R_outer = Math.hypot(32, 96); // ~101.19 px

    // 1. Asphalt Roadway background
    ctx.fillStyle = '#2b2e34';
    ctx.fillRect(rb_x, rb_y, rb_w, rb_h);

    // 2. The 4 Curved Corner Sidewalk Fillets
    const corners = [
      {
        poly: () => {
          ctx.beginPath();
          ctx.moveTo(rb_x, rb_y);
          ctx.lineTo(rb_x + 64, rb_y);
          ctx.arc(cx, cy, R_outer, Math.atan2(-96, -32), Math.atan2(-32, -96), true);
          ctx.lineTo(rb_x, rb_y + 64);
          ctx.closePath();
        },
        curbArc: () => ctx.arc(cx, cy, R_outer, Math.atan2(-96, -32), Math.atan2(-32, -96), true),
        slabs: () => {
          for (let i = 16; i < 96; i += 16) {
            ctx.beginPath(); ctx.moveTo(rb_x + i, rb_y); ctx.lineTo(rb_x + i, rb_y + 96); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(rb_x, rb_y + i); ctx.lineTo(rb_x + 96, rb_y + i); ctx.stroke();
          }
        }
      },
      {
        poly: () => {
          ctx.beginPath();
          ctx.moveTo(rb_x + 192, rb_y);
          ctx.lineTo(rb_x + 192, rb_y + 64);
          ctx.arc(cx, cy, R_outer, Math.atan2(-32, 96), Math.atan2(-96, 32), true);
          ctx.lineTo(rb_x + 128, rb_y);
          ctx.closePath();
        },
        curbArc: () => ctx.arc(cx, cy, R_outer, Math.atan2(-32, 96), Math.atan2(-96, 32), true),
        slabs: () => {
          for (let i = 16; i < 96; i += 16) {
            ctx.beginPath(); ctx.moveTo(rb_x + 192 - i, rb_y); ctx.lineTo(rb_x + 192 - i, rb_y + 96); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(rb_x + 96, rb_y + i); ctx.lineTo(rb_x + 192, rb_y + i); ctx.stroke();
          }
        }
      },
      {
        poly: () => {
          ctx.beginPath();
          ctx.moveTo(rb_x + 192, rb_y + 192);
          ctx.lineTo(rb_x + 128, rb_y + 192);
          ctx.arc(cx, cy, R_outer, Math.atan2(96, 32), Math.atan2(32, 96), true);
          ctx.lineTo(rb_x + 192, rb_y + 128);
          ctx.closePath();
        },
        curbArc: () => ctx.arc(cx, cy, R_outer, Math.atan2(96, 32), Math.atan2(32, 96), true),
        slabs: () => {
          for (let i = 16; i < 96; i += 16) {
            ctx.beginPath(); ctx.moveTo(rb_x + 192 - i, rb_y + 96); ctx.lineTo(rb_x + 192 - i, rb_y + 192); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(rb_x + 96, rb_y + 192 - i); ctx.lineTo(rb_x + 192, rb_y + 192 - i); ctx.stroke();
          }
        }
      },
      {
        poly: () => {
          ctx.beginPath();
          ctx.moveTo(rb_x, rb_y + 192);
          ctx.lineTo(rb_x, rb_y + 128);
          ctx.arc(cx, cy, R_outer, Math.atan2(32, -96), Math.atan2(96, -32), true);
          ctx.lineTo(rb_x + 64, rb_y + 192);
          ctx.closePath();
        },
        curbArc: () => ctx.arc(cx, cy, R_outer, Math.atan2(32, -96), Math.atan2(96, -32), true),
        slabs: () => {
          for (let i = 16; i < 96; i += 16) {
            ctx.beginPath(); ctx.moveTo(rb_x + i, rb_y + 96); ctx.lineTo(rb_x + i, rb_y + 192); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(rb_x, rb_y + 192 - i); ctx.lineTo(rb_x + 96, rb_y + 192 - i); ctx.stroke();
          }
        }
      }
    ];

    for (const corner of corners) {
      ctx.save();
      corner.poly();
      ctx.fillStyle = '#7f8c8d';
      ctx.fill();
      ctx.clip();
      ctx.strokeStyle = '#636e72';
      ctx.lineWidth = 1;
      corner.slabs();
      ctx.restore();

      // Outer granite curb rim (light border)
      ctx.beginPath();
      corner.curbArc();
      ctx.strokeStyle = '#dcdde1';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Curb shadow on asphalt
      ctx.beginPath();
      corner.curbArc();
      ctx.strokeStyle = '#1e272e';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // 3. Pedestrian Crosswalks on the 4 Avenues
    ctx.fillStyle = '#ecf0f1';
    // North Crosswalk
    for (let x = rb_x + 68; x <= rb_x + 124; x += 8) {
      ctx.fillRect(x, rb_y + 3, 4, 8);
    }
    // South Crosswalk
    for (let x = rb_x + 68; x <= rb_x + 124; x += 8) {
      ctx.fillRect(x, rb_y + 181, 4, 8);
    }
    // West Crosswalk
    for (let y = rb_y + 68; y <= rb_y + 124; y += 8) {
      ctx.fillRect(rb_x + 3, y, 8, 4);
    }
    // East Crosswalk
    for (let y = rb_y + 68; y <= rb_y + 124; y += 8) {
      ctx.fillRect(rb_x + 181, y, 8, 4);
    }

    // 4. White Yield Shark-Teeth triangles at incoming lanes
    ctx.fillStyle = '#f1f2f6';
    // North Entry (cars entering southbound on right side)
    for (let x = rb_x + 99; x <= rb_x + 121; x += 7) {
      ctx.beginPath();
      ctx.moveTo(x, rb_y + 15);
      ctx.lineTo(x + 5, rb_y + 15);
      ctx.lineTo(x + 2.5, rb_y + 20);
      ctx.closePath();
      ctx.fill();
    }
    // South Entry (cars entering northbound on right side)
    for (let x = rb_x + 71; x <= rb_x + 93; x += 7) {
      ctx.beginPath();
      ctx.moveTo(x, rb_y + 177);
      ctx.lineTo(x + 5, rb_y + 177);
      ctx.lineTo(x + 2.5, rb_y + 172);
      ctx.closePath();
      ctx.fill();
    }
    // West Entry (cars entering eastbound on right side)
    for (let y = rb_y + 99; y <= rb_y + 121; y += 7) {
      ctx.beginPath();
      ctx.moveTo(rb_x + 15, y);
      ctx.lineTo(rb_x + 15, y + 5);
      ctx.lineTo(rb_x + 20, y + 2.5);
      ctx.closePath();
      ctx.fill();
    }
    // East Entry (cars entering westbound on right side)
    for (let y = rb_y + 71; y <= rb_y + 93; y += 7) {
      ctx.beginPath();
      ctx.moveTo(rb_x + 177, y);
      ctx.lineTo(rb_x + 177, y + 5);
      ctx.lineTo(rb_x + 172, y + 2.5);
      ctx.closePath();
      ctx.fill();
    }

    // 5. Circulating Lane Markings (White dashed circular ring)
    ctx.beginPath();
    ctx.arc(cx, cy, 72, 0, Math.PI * 2);
    ctx.setLineDash([12, 10]);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ecf0f1';
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // 4 Curved Chevron Flow Direction Arrows (Counter-Clockwise)
    const arrowRadius = 72;
    const arrowAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    ctx.fillStyle = '#ecf0f1';
    for (const a of arrowAngles) {
      const ax = cx + Math.cos(a) * arrowRadius;
      const ay = cy + Math.sin(a) * arrowRadius;
      const fwd = a - Math.PI / 2; // Counter-clockwise forward tangent
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(fwd);
      ctx.beginPath();
      ctx.moveTo(7, 0);
      ctx.lineTo(-5, -5);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 6. Central Island (Insula Centrala - 100% Round & Beautiful, NO Trees)
    // Outer Stone Curb Ring
    ctx.beginPath();
    ctx.arc(cx, cy, 46, 0, Math.PI * 2);
    ctx.fillStyle = '#57606f'; // Dark granite rim
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#dfe4ea'; // Polished top bevel
    ctx.stroke();

    // Inner Grass Lawn
    ctx.beginPath();
    ctx.arc(cx, cy, 43, 0, Math.PI * 2);
    ctx.fillStyle = '#2ed573'; // Emerald green grass
    ctx.fill();

    // Mowed lawn concentric inner ring
    ctx.beginPath();
    ctx.arc(cx, cy, 35, 0, Math.PI * 2);
    ctx.fillStyle = '#26af5f';
    ctx.fill();

    // Flowerbed Ring (vibrant micro-flowers)
    const flowerColors = ['#ff4757', '#ffa502', '#a55eea', '#ffffff'];
    for (let f = 0; f < 20; f++) {
      const fAngle = (f / 20) * Math.PI * 2;
      const fDist = 38.5;
      const fx = cx + Math.cos(fAngle) * fDist;
      const fy = cy + Math.sin(fAngle) * fDist;
      ctx.beginPath();
      ctx.arc(fx, fy, 2, 0, Math.PI * 2);
      ctx.fillStyle = flowerColors[f % flowerColors.length];
      ctx.fill();
    }

    // 7. Grand Centerpiece Fountain
    // Outer Fountain Stone Basin
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#747d8c';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ced6e0';
    ctx.stroke();

    // Fountain Water Pool
    ctx.beginPath();
    ctx.arc(cx, cy, 21, 0, Math.PI * 2);
    ctx.fillStyle = '#1e90ff'; // Vibrant azure water
    ctx.fill();

    // Concentric shallow turquoise water highlight
    ctx.beginPath();
    ctx.arc(cx, cy, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#00d2d3';
    ctx.fill();

    // Center Tiered Pedestal
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ced6e0';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#747d8c';
    ctx.stroke();

    // Central Spire / Spray Nozzle
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    this.registerTile('roundabout_base', 5, 5, 3, 3);

    // =============================================================
    // ROOFTOP ARCHITECTURAL CENTERPIECES (Row 8)
    // =============================================================
    const R8 = 8;

    // 0, 8: Helipad
    const heli_x = 0 * S, heli_y = R8 * S;
    ctx.fillStyle = '#263238';
    ctx.fillRect(heli_x, heli_y, S, S);
    // Yellow Outer Ring
    ctx.beginPath();
    ctx.arc(heli_x + S / 2, heli_y + S / 2, 26, 0, Math.PI * 2);
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 3;
    ctx.stroke();
    // White Inner Ring
    ctx.beginPath();
    ctx.arc(heli_x + S / 2, heli_y + S / 2, 21, 0, Math.PI * 2);
    ctx.strokeStyle = '#ecf0f1';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Bold 'H' Marking
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(heli_x + 22, heli_y + 18, 5, 28);
    ctx.fillRect(heli_x + 37, heli_y + 18, 5, 28);
    ctx.fillRect(heli_x + 22, heli_y + 30, 20, 5);
    // 4 Corner Aviation Warning Beacons
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(heli_x + 4, heli_y + 4, 4, 4);
    ctx.fillRect(heli_x + S - 8, heli_y + 4, 4, 4);
    ctx.fillRect(heli_x + 4, heli_y + S - 8, 4, 4);
    ctx.fillRect(heli_x + S - 8, heli_y + S - 8, 4, 4);
    this.registerTile('roof_helipad', 0, R8);

    // 1, 8: Glass Skylight Atrium
    const sky_x = 1 * S, sky_y = R8 * S;
    ctx.fillStyle = '#263238';
    ctx.fillRect(sky_x, sky_y, S, S);
    // Beveled frame
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(sky_x + 6, sky_y + 6, S - 12, S - 12);
    // Glass Surface with gradient reflection
    const skyGrad = ctx.createLinearGradient(sky_x + 8, sky_y + 8, sky_x + S - 8, sky_y + S - 8);
    skyGrad.addColorStop(0, '#0984e3');
    skyGrad.addColorStop(0.4, '#74b9ff');
    skyGrad.addColorStop(0.6, '#00cec9');
    skyGrad.addColorStop(1, '#0984e3');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(sky_x + 8, sky_y + 8, S - 16, S - 16);
    // Steel cross struts
    ctx.strokeStyle = '#2d3436';
    ctx.lineWidth = 2;
    ctx.strokeRect(sky_x + 8, sky_y + 8, S - 16, S - 16);
    ctx.beginPath();
    ctx.moveTo(sky_x + S / 2, sky_y + 8);
    ctx.lineTo(sky_x + S / 2, sky_y + S - 8);
    ctx.moveTo(sky_x + 8, sky_y + S / 2);
    ctx.lineTo(sky_x + S - 8, sky_y + S / 2);
    ctx.stroke();
    // Specular highlight gleam
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.moveTo(sky_x + 12, sky_y + 12);
    ctx.lineTo(sky_x + 30, sky_y + 12);
    ctx.lineTo(sky_x + 12, sky_y + 30);
    ctx.closePath();
    ctx.fill();
    this.registerTile('roof_skylight', 1, R8);

    // 2, 8: Industrial HVAC Chiller Plant
    const hvac_x = 2 * S, hvac_y = R8 * S;
    ctx.fillStyle = '#263238';
    ctx.fillRect(hvac_x, hvac_y, S, S);
    // Galvanized chassis
    ctx.fillStyle = '#34495e';
    ctx.fillRect(hvac_x + 6, hvac_y + 10, S - 12, S - 20);
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    ctx.strokeRect(hvac_x + 6, hvac_y + 10, S - 12, S - 20);
    // Dual ventilation circular wells
    ctx.fillStyle = '#1e272e';
    ctx.beginPath();
    ctx.arc(hvac_x + 20, hvac_y + S / 2, 11, 0, Math.PI * 2);
    ctx.arc(hvac_x + 44, hvac_y + S / 2, 11, 0, Math.PI * 2);
    ctx.fill();
    // Coolant pipes
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(hvac_x + 4, hvac_y + 6, S - 8, 3);
    ctx.fillRect(hvac_x + 4, hvac_y + S - 9, S - 8, 3);
    this.registerTile('roof_hvac_industrial', 2, R8);

    // 3, 8: Photovoltaic Solar Panel Array
    const solar_x = 3 * S, solar_y = R8 * S;
    ctx.fillStyle = '#263238';
    ctx.fillRect(solar_x, solar_y, S, S);
    // Aluminum frame
    ctx.fillStyle = '#1a1f24';
    ctx.fillRect(solar_x + 6, solar_y + 6, S - 12, S - 12);
    // Solar cell modules (6 individual cells)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        const px = solar_x + 9 + col * 24;
        const py = solar_y + 9 + row * 15;
        ctx.fillStyle = '#1e3799';
        ctx.fillRect(px, py, 22, 13);
        ctx.strokeStyle = '#4a69bd';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(px, py, 22, 13);
        // Antireflective busbars
        ctx.fillStyle = '#6a89cc';
        ctx.fillRect(px + 10, py, 1.5, 13);
      }
    }
    this.registerTile('roof_solar', 3, R8);

    // 4, 8: Hospital Rooftop (Red Cross Helipad & Emergency Deck)
    const hosp_x = 4 * S, hosp_y = R8 * S;
    ctx.fillStyle = '#37474f';
    ctx.fillRect(hosp_x, hosp_y, S, S);
    // Helipad Outer Circle
    ctx.beginPath();
    ctx.arc(hosp_x + S / 2, hosp_y + S / 2, 25, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Red Cross (+) Emblem
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(hosp_x + S / 2 - 5, hosp_y + S / 2 - 17, 10, 34);
    ctx.fillRect(hosp_x + S / 2 - 17, hosp_y + S / 2 - 5, 34, 10);
    // 4 Corner Emergency Red Beacon Lights
    ctx.fillStyle = '#ff4757';
    ctx.fillRect(hosp_x + 4, hosp_y + 4, 5, 5);
    ctx.fillRect(hosp_x + S - 9, hosp_y + 4, 5, 5);
    ctx.fillRect(hosp_x + 4, hosp_y + S - 9, 5, 5);
    ctx.fillRect(hosp_x + S - 9, hosp_y + S - 9, 5, 5);
    this.registerTile('roof_hospital', 4, R8);

    // 5, 8: Police Station Rooftop (Blue Helipad & Star Crest)
    const pol_x = 5 * S, pol_y = R8 * S;
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(pol_x, pol_y, S, S);
    // Helipad Tactical Blue Ring
    ctx.beginPath();
    ctx.arc(pol_x + S / 2, pol_y + S / 2, 25, 0, Math.PI * 2);
    ctx.strokeStyle = '#0984e3';
    ctx.lineWidth = 3;
    ctx.stroke();
    // Center Star / Badge Symbol
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(pol_x + S / 2, pol_y + S / 2, 10, 0, Math.PI * 2);
    ctx.fill();
    // Bold 'P' Marking
    ctx.fillStyle = '#0984e3';
    ctx.fillRect(pol_x + 28, pol_y + 24, 4, 16);
    ctx.fillRect(pol_x + 28, pol_y + 24, 10, 4);
    ctx.fillRect(pol_x + 28, pol_y + 30, 10, 4);
    ctx.fillRect(pol_x + 34, pol_y + 24, 4, 10);
    // Flashing Corner Strobe Lights (Blue & Red)
    ctx.fillStyle = '#0984e3';
    ctx.fillRect(pol_x + 4, pol_y + 4, 5, 5);
    ctx.fillRect(pol_x + S - 9, pol_y + S - 9, 5, 5);
    ctx.fillStyle = '#d63031';
    ctx.fillRect(pol_x + S - 9, pol_y + 4, 5, 5);
    ctx.fillRect(pol_x + 4, pol_y + S - 9, 5, 5);
    this.registerTile('roof_police', 5, R8);

    // 6, 8: Parking Lot Ground Tile (Asphalt, Stall Lines & Oil Drops)
    const pkg_x = 6 * S, pkg_y = R8 * S;
    ctx.fillStyle = '#22272e';
    ctx.fillRect(pkg_x, pkg_y, S, S);
    // Subtle asphalt speckles
    ctx.fillStyle = '#1b2026';
    for (let i = 0; i < 20; i++) {
      const px = pkg_x + ((i * 19 + 7) % (S - 4));
      const py = pkg_y + ((i * 31 + 13) % (S - 4));
      ctx.fillRect(px, py, 2, 2);
    }
    // White/Yellow Parking Stall Dividers (Two vertical stalls per tile)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(pkg_x + 2, pkg_y + 8, S - 4, 3);
    ctx.fillRect(pkg_x + 2, pkg_y + S / 2, S - 4, 3);
    ctx.fillRect(pkg_x + 2, pkg_y + S - 11, S - 4, 3);
    // Stall boundary line
    ctx.fillStyle = '#f5cd79';
    ctx.fillRect(pkg_x + 4, pkg_y + 8, 3, S - 16);
    // Subtle central tire mark / oil stain
    ctx.fillStyle = '#14181c';
    ctx.beginPath();
    ctx.ellipse(pkg_x + S / 2 + 6, pkg_y + 22, 10, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(pkg_x + S / 2 + 6, pkg_y + 46, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    this.registerTile('parking_bay', 6, R8);

    // 7, 8: Ambulance
    const amb_x = 7 * S, amb_y = R8 * S;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.roundRect(amb_x + 5, amb_y + 11, 56, 44, 4);
    ctx.fill();
    // Body (White chassis)
    ctx.fillStyle = '#f5f6fa';
    ctx.beginPath();
    ctx.roundRect(amb_x + 3, amb_y + 9, 56, 44, 4);
    ctx.fill();
    ctx.strokeStyle = '#dcdde1';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Emergency Orange/Red side stripes
    ctx.fillStyle = '#e84118';
    ctx.fillRect(amb_x + 8, amb_y + 9, 44, 4);
    ctx.fillRect(amb_x + 8, amb_y + 49, 44, 4);
    // Windshield (facing East +X)
    ctx.fillStyle = '#2f3640';
    ctx.fillRect(amb_x + 44, amb_y + 16, 7, 30);
    // Large Red Cross on Roof
    ctx.fillStyle = '#e84118';
    ctx.fillRect(amb_x + 23, amb_y + 20, 8, 22);
    ctx.fillRect(amb_x + 16, amb_y + 27, 22, 8);
    // Emergency Dual Lightbar on Roof
    ctx.fillStyle = '#e84118'; // Red beacon
    ctx.fillRect(amb_x + 38, amb_y + 16, 4, 8);
    ctx.fillStyle = '#00a8ff'; // Blue beacon
    ctx.fillRect(amb_x + 38, amb_y + 38, 4, 8);
    // Center chrome siren speaker
    ctx.fillStyle = '#718093';
    ctx.fillRect(amb_x + 38, amb_y + 28, 4, 6);
    // Headlights
    ctx.fillStyle = '#f5cd79';
    ctx.fillRect(amb_x + 57, amb_y + 13, 2, 7);
    ctx.fillRect(amb_x + 57, amb_y + 42, 2, 7);
    this.registerTile('car_ambulance', 7, R8);

    // =============================================================
    // ULTRA-REALISTIC URBAN ASSETS (Row 9)
    // =============================================================
    const R9 = 9;

    // 0, 9: Traditional Rooftop Wooden Water Tower
    const wt_x = 0 * S, wt_y = R9 * S;
    ctx.fillStyle = '#263238';
    ctx.fillRect(wt_x, wt_y, S, S);
    // Steel tripod leg shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.arc(wt_x + 36, wt_y + 36, 18, 0, Math.PI * 2);
    ctx.fill();
    // Steel cross-braced trestle framework
    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 2;
    ctx.strokeRect(wt_x + 14, wt_y + 14, 36, 36);
    // Circular Cedar Wood Stave Tank
    ctx.fillStyle = '#795548'; // Weathered cedar
    ctx.beginPath();
    ctx.arc(wt_x + 32, wt_y + 32, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4e342e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Steel tension hoops
    ctx.strokeStyle = '#2d3436';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(wt_x + 32, wt_y + 32, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(wt_x + 32, wt_y + 32, 10, 0, Math.PI * 2);
    ctx.stroke();
    // Conical cedar roof peak & copper vent finial
    ctx.fillStyle = '#8d6e63';
    ctx.beginPath();
    ctx.arc(wt_x + 32, wt_y + 32, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#10ac84'; // copper patina ball
    ctx.fillRect(wt_x + 30, wt_y + 30, 4, 4);
    this.registerTile('roof_watertower', 0, R9);

    // 1, 9: Raised Elevator Machine Room / Stairwell Bulkhead Penthouse
    const ep_x = 1 * S, ep_y = R9 * S;
    ctx.fillStyle = '#263238';
    ctx.fillRect(ep_x, ep_y, S, S);
    // Deep 2nd-tier structure drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(ep_x + 12, ep_y + 16, 46, 38);
    // Concrete elevator penthouse structure
    ctx.fillStyle = '#4b6584';
    ctx.fillRect(ep_x + 8, ep_y + 10, 44, 36);
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    ctx.strokeRect(ep_x + 8, ep_y + 10, 44, 36);
    // Steel maintenance access door & brass latch
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(ep_x + 24, ep_y + 38, 14, 8);
    ctx.fillStyle = '#f1c40f'; // brass latch
    ctx.fillRect(ep_x + 34, ep_y + 42, 2, 2);
    // HVAC ventilation exhaust louvers
    ctx.fillStyle = '#2d3436';
    for (let l = 0; l < 4; l++) {
      ctx.fillRect(ep_x + 14, ep_y + 16 + l * 4, 18, 2);
    }
    // Hazard perimeter curb
    ctx.fillStyle = '#ffa502';
    ctx.fillRect(ep_x + 8, ep_y + 44, 44, 2);
    this.registerTile('roof_elevator_penthouse', 1, R9);

    // 2, 9: Modern Cool-Roof Commercial Membrane
    const cw_x = 2 * S, cw_y = R9 * S;
    ctx.fillStyle = '#636e72'; // light cool-roof concrete / TPO membrane
    ctx.fillRect(cw_x, cw_y, S, S);
    // Heat-welded membrane roll seams
    ctx.strokeStyle = '#4b5561';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cw_x, cw_y + S / 2);
    ctx.lineTo(cw_x + S, cw_y + S / 2);
    ctx.moveTo(cw_x + S / 2, cw_y);
    ctx.lineTo(cw_x + S / 2, cw_y + S);
    ctx.stroke();
    // Fine gravel surface flecks
    ctx.fillStyle = '#b2bec3';
    for (let i = 0; i < 24; i++) {
      const rx = cw_x + ((i * 17 + 5) % S);
      const ry = cw_y + ((i * 29 + 11) % S);
      ctx.fillRect(rx, ry, 2, 2);
    }
    this.registerTile('roof_cool_white', 2, R9);

    // 3, 9: Classical Terracotta Brick Rooftop
    const tc_x = 3 * S, tc_y = R9 * S;
    ctx.fillStyle = '#5c3d2e'; // terracotta / brick tone
    ctx.fillRect(tc_x, tc_y, S, S);
    // Brick courses & tar seams
    ctx.fillStyle = '#4a2f22';
    for (let i = 0; i < 28; i++) {
      const rx = tc_x + ((i * 23 + 7) % S);
      const ry = tc_y + ((i * 19 + 13) % S);
      ctx.fillRect(rx, ry, 2, 2);
    }
    // Clay chimney pot / flue vent
    ctx.fillStyle = '#e67e22';
    ctx.beginPath();
    ctx.arc(tc_x + S / 2, tc_y + S / 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e272e';
    ctx.beginPath();
    ctx.arc(tc_x + S / 2, tc_y + S / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    this.registerTile('roof_terracotta', 3, R9);

    // 4, 9: Flagstone Cobblestone Park Pathway
    const pp_x = 4 * S, pp_y = R9 * S;
    ctx.fillStyle = '#7f8c8d'; // stone base
    ctx.fillRect(pp_x, pp_y, S, S);
    // Interlocking pavers pattern
    ctx.strokeStyle = '#576574';
    ctx.lineWidth = 1;
    for (let x = 0; x < S; x += 16) {
      for (let y = 0; y < S; y += 16) {
        ctx.fillStyle = ((x + y) % 32 === 0) ? '#8395a7' : '#718093';
        ctx.fillRect(pp_x + x + 1, pp_y + y + 1, 14, 14);
        ctx.strokeRect(pp_x + x + 0.5, pp_y + y + 0.5, 16, 16);
      }
    }
    // Subtle moss in stone joints
    ctx.fillStyle = '#218c54';
    for (let i = 0; i < 12; i++) {
      const mx = pp_x + ((i * 19) % (S - 4));
      const my = pp_y + ((i * 27) % (S - 4));
      ctx.fillRect(mx, my, 2, 2);
    }
    this.registerTile('park_path', 4, R9);

    // 5, 9: Lush Botanical Flowerbed (Enhanced with petal shapes)
    const fb_x = 5 * S, fb_y = R9 * S;
    ctx.fillStyle = '#2d1e17'; // Rich dark garden loam
    ctx.fillRect(fb_x, fb_y, S, S);
    // Stone garden bed border
    ctx.strokeStyle = '#95a5a6';
    ctx.lineWidth = 3;
    ctx.strokeRect(fb_x + 2, fb_y + 2, S - 4, S - 4);
    // Foliage leaves (varied sizes)
    ctx.fillStyle = '#20bf6b';
    for (let i = 0; i < 30; i++) {
      const lx = fb_x + 6 + ((i * 13) % (S - 14));
      const ly = fb_y + 6 + ((i * 29) % (S - 14));
      const lr = 3 + (i % 3);
      ctx.beginPath();
      ctx.arc(lx, ly, lr, 0, Math.PI * 2);
      ctx.fill();
    }
    // Dark foliage depth
    ctx.fillStyle = '#16a34a';
    for (let i = 0; i < 12; i++) {
      const lx = fb_x + 10 + ((i * 19) % (S - 20));
      const ly = fb_y + 10 + ((i * 23) % (S - 20));
      ctx.beginPath();
      ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Blooming Flowers with petal shapes
    const parkFlowerColors = ['#eb3b5a', '#f7b731', '#8854d0', '#fa8231', '#e84393'];
    for (let i = 0; i < 18; i++) {
      const fx = fb_x + 8 + ((i * 17) % (S - 16));
      const fy = fb_y + 8 + ((i * 37) % (S - 16));
      ctx.fillStyle = parkFlowerColors[i % parkFlowerColors.length];
      // Draw 4-5 small petals around center
      const petalCount = 4 + (i % 2);
      for (let p = 0; p < petalCount; p++) {
        const pa = (p / petalCount) * Math.PI * 2;
        const px = fx + Math.cos(pa) * 2.5;
        const py = fy + Math.sin(pa) * 2.5;
        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      // Yellow pollen center
      ctx.fillStyle = '#f9ca24';
      ctx.beginPath();
      ctx.arc(fx, fy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    this.registerTile('park_flowerbed', 5, R9);

    // 6, 9: Tiered Marble Park Fountain (Enhanced with ripples & marble detail)
    const pf_x = 6 * S, pf_y = R9 * S;
    ctx.fillStyle = '#7f8c8d'; // stone plaza base
    ctx.fillRect(pf_x, pf_y, S, S);
    // Corner decorative stones
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(pf_x + 2, pf_y + 2, 6, 6);
    ctx.fillRect(pf_x + S - 8, pf_y + 2, 6, 6);
    ctx.fillRect(pf_x + 2, pf_y + S - 8, 6, 6);
    ctx.fillRect(pf_x + S - 8, pf_y + S - 8, 6, 6);
    // Outer Stone Basin with marble veining
    ctx.beginPath();
    ctx.arc(pf_x + S / 2, pf_y + S / 2, 28, 0, Math.PI * 2);
    ctx.fillStyle = '#dcdde1';
    ctx.fill();
    ctx.strokeStyle = '#718093';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Marble veins on basin rim
    ctx.strokeStyle = 'rgba(180, 180, 190, 0.4)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(pf_x + S / 2, pf_y + S / 2, 26, 0.3, 1.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(pf_x + S / 2, pf_y + S / 2, 25, 2.5, 3.8);
    ctx.stroke();
    // Turquoise Pool
    ctx.beginPath();
    ctx.arc(pf_x + S / 2, pf_y + S / 2, 23, 0, Math.PI * 2);
    ctx.fillStyle = '#00a8ff';
    ctx.fill();
    // Water ripple rings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(pf_x + S / 2, pf_y + S / 2, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(pf_x + S / 2, pf_y + S / 2, 16, 0, Math.PI * 2);
    ctx.stroke();
    // Inner Tiered Basin
    ctx.beginPath();
    ctx.arc(pf_x + S / 2, pf_y + S / 2, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#f5f6fa';
    ctx.fill();
    ctx.strokeStyle = '#718093';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Shallow foaming water
    ctx.beginPath();
    ctx.arc(pf_x + S / 2, pf_y + S / 2, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#00d2d3';
    ctx.fill();
    // Center Spire nozzle
    ctx.beginPath();
    ctx.arc(pf_x + S / 2, pf_y + S / 2, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    this.registerTile('park_fountain', 6, R9);

    // 7, 9: Wooden Slatted Park Bench
    const bench_x = 7 * S, bench_y = R9 * S;
    ctx.fillStyle = '#1e7e34'; // grass background
    ctx.fillRect(bench_x, bench_y, S, S);
    // Bench drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(bench_x + 14, bench_y + 24, 38, 22);
    // Cast iron frame / legs
    ctx.fillStyle = '#2d3436';
    ctx.fillRect(bench_x + 12, bench_y + 20, 4, 24);
    ctx.fillRect(bench_x + 46, bench_y + 20, 4, 24);
    // Polished Oak wood slats
    ctx.fillStyle = '#d35400';
    for (let s = 0; s < 4; s++) {
      ctx.fillRect(bench_x + 14, bench_y + 22 + s * 5, 34, 3);
    }
    this.registerTile('park_bench', 7, R9);

    // 8, 9: Parking Drive Aisle with Directional Navigation Arrow
    const pa_x = 8 * S, pa_y = R9 * S;
    ctx.fillStyle = '#1e252b'; // deep asphalt
    ctx.fillRect(pa_x, pa_y, S, S);
    // Subtle asphalt aggregate
    ctx.fillStyle = '#161c21';
    for (let i = 0; i < 20; i++) {
      const px = pa_x + ((i * 17) % (S - 4));
      const py = pa_y + ((i * 31) % (S - 4));
      ctx.fillRect(px, py, 2, 2);
    }
    // Painted Yellow Driving Direction Arrow (pointing North ^)
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.moveTo(pa_x + S / 2, pa_y + 16);
    ctx.lineTo(pa_x + S / 2 + 10, pa_y + 30);
    ctx.lineTo(pa_x + S / 2 + 4, pa_y + 30);
    ctx.lineTo(pa_x + S / 2 + 4, pa_y + 48);
    ctx.lineTo(pa_x + S / 2 - 4, pa_y + 48);
    ctx.lineTo(pa_x + S / 2 - 4, pa_y + 30);
    ctx.lineTo(pa_x + S / 2 - 10, pa_y + 30);
    ctx.closePath();
    ctx.fill();
    this.registerTile('parking_aisle', 8, R9);

    // 9, 9: Accessible Handicap Parking Bay
    const ph_x = 9 * S, ph_y = R9 * S;
    ctx.fillStyle = '#1e252b';
    ctx.fillRect(ph_x, ph_y, S, S);
    // Blue Accessible Stall Stencil
    ctx.fillStyle = '#0984e3';
    ctx.fillRect(ph_x + 10, ph_y + 12, 44, 40);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(ph_x + 10, ph_y + 12, 44, 40);
    // White Wheelchair Symbol
    ctx.fillStyle = '#ffffff';
    // Head
    ctx.beginPath();
    ctx.arc(ph_x + 32, ph_y + 22, 3, 0, Math.PI * 2);
    ctx.fill();
    // Spine & Arms
    ctx.fillRect(ph_x + 31, ph_y + 25, 2.5, 10);
    ctx.fillRect(ph_x + 28, ph_y + 29, 8, 2);
    // Wheel arc
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ph_x + 30, ph_y + 35, 6, -Math.PI * 0.5, Math.PI * 0.8);
    ctx.stroke();
    // Legs
    ctx.fillRect(ph_x + 33, ph_y + 35, 6, 2);
    // Concrete Wheel stop
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(ph_x + 4, ph_y + 24, 4, 16);
    this.registerTile('parking_handicap', 9, R9);

    // 10, 9: Landscaped Parking Lot Planter Island
    const pi_x = 10 * S, pi_y = R9 * S;
    ctx.fillStyle = '#1e252b';
    ctx.fillRect(pi_x, pi_y, S, S);
    // Curbed Concrete Planter Median
    ctx.fillStyle = '#ced6e0';
    ctx.beginPath();
    ctx.roundRect(pi_x + 6, pi_y + 6, S - 12, S - 12, 6);
    ctx.fill();
    ctx.strokeStyle = '#747d8c';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Dark Woodchip Mulch Interior
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.roundRect(pi_x + 10, pi_y + 10, S - 20, S - 20, 4);
    ctx.fill();
    // Ornamental Shrub & Flowers
    ctx.fillStyle = '#20bf6b';
    ctx.beginPath();
    ctx.arc(pi_x + S / 2, pi_y + S / 2, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f7b731';
    ctx.fillRect(pi_x + S / 2 - 2, pi_y + S / 2 - 2, 4, 4);
    this.registerTile('parking_island', 10, R9);

    // 11, 9: Safety Hazard Loading Zone (Diagonal Yellow Striping)
    const hz_x = 11 * S, hz_y = R9 * S;
    ctx.fillStyle = '#1e252b';
    ctx.fillRect(hz_x, hz_y, S, S);
    // Diagonal hazard stripes
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 3;
    for (let d = -S; d < S * 2; d += 14) {
      ctx.beginPath();
      ctx.moveTo(hz_x + d, hz_y);
      ctx.lineTo(hz_x + d + 16, hz_y + S);
      ctx.stroke();
    }
    // Perimeter yellow warning box
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 2;
    ctx.strokeRect(hz_x + 2, hz_y + 2, S - 4, S - 4);
    this.registerTile('parking_hazard', 11, R9);

    // =============================================================
    // STREET FURNITURE (Row 10)
    // =============================================================
    const R10 = 10;

    // 0, 10: Street bench
    const sb_x = 0 * S, sb_y = R10 * S;
    ctx.fillStyle = '#20252b';
    ctx.fillRect(sb_x, sb_y, S, S);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(sb_x + 10, sb_y + 38, 44, 10);
    ctx.fillStyle = '#2d3436';
    ctx.fillRect(sb_x + 12, sb_y + 22, 4, 25);
    ctx.fillRect(sb_x + 48, sb_y + 22, 4, 25);
    ctx.fillStyle = '#a85d32';
    ctx.fillRect(sb_x + 10, sb_y + 18, 44, 5);
    ctx.fillRect(sb_x + 10, sb_y + 25, 44, 5);
    ctx.fillRect(sb_x + 10, sb_y + 32, 44, 5);
    ctx.fillStyle = '#d89052';
    ctx.fillRect(sb_x + 12, sb_y + 19, 40, 2);
    this.registerTile('street_bench', 0, R10);

    // 1, 10: Municipal trash bin
    const tb_x = 1 * S, tb_y = R10 * S;
    ctx.fillStyle = '#20252b';
    ctx.fillRect(tb_x, tb_y, S, S);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(tb_x + 35, tb_y + 48, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#34495e';
    ctx.fillRect(tb_x + 20, tb_y + 18, 27, 30);
    ctx.fillStyle = '#536878';
    ctx.fillRect(tb_x + 18, tb_y + 14, 31, 6);
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(tb_x + 25, tb_y + 24, 17, 4);
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(tb_x + 27, tb_y + 31, 13, 3);
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(tb_x + 22, tb_y + 47, 5, 4);
    ctx.fillRect(tb_x + 40, tb_y + 47, 5, 4);
    this.registerTile('trash_bin', 1, R10);

    // 2, 10: Concrete pedestrian bollard
    const bo_x = 2 * S, bo_y = R10 * S;
    ctx.fillStyle = '#20252b';
    ctx.fillRect(bo_x, bo_y, S, S);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(bo_x + 32, bo_y + 46, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#747d8c';
    ctx.fillRect(bo_x + 23, bo_y + 16, 18, 31);
    ctx.fillStyle = '#a4b0be';
    ctx.fillRect(bo_x + 25, bo_y + 14, 14, 5);
    ctx.fillStyle = '#57606f';
    ctx.fillRect(bo_x + 23, bo_y + 39, 18, 8);
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(bo_x + 24, bo_y + 26, 16, 4);
    this.registerTile('bollard', 2, R10);

    // 3, 10: Street planter
    const sp_x = 3 * S, sp_y = R10 * S;
    ctx.fillStyle = '#20252b';
    ctx.fillRect(sp_x, sp_y, S, S);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(sp_x + 10, sp_y + 43, 44, 8);
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(sp_x + 9, sp_y + 20, 46, 27);
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(sp_x + 13, sp_y + 24, 38, 19);
    ctx.fillStyle = '#20bf6b';
    ctx.beginPath();
    ctx.arc(sp_x + 24, sp_y + 25, 10, 0, Math.PI * 2);
    ctx.arc(sp_x + 39, sp_y + 24, 11, 0, Math.PI * 2);
    ctx.arc(sp_x + 32, sp_y + 17, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f7b731';
    ctx.fillRect(sp_x + 30, sp_y + 15, 4, 4);
    this.registerTile('street_planter', 3, R10);

    // =============================================================
    // REALISTIC URBAN, PARK & ROOFTOP EXTENSIONS (Row 10 cont. & Row 11)
    // =============================================================
    // 4, 10: Park Lily Pond (Tranquil water pond with lily pads & lotus flowers)
    const pp_pond_x = 4 * S, pp_pond_y = R10 * S;
    ctx.fillStyle = '#1e7e34'; // Grass border
    ctx.fillRect(pp_pond_x, pp_pond_y, S, S);
    // Dark stone rim
    ctx.fillStyle = '#57606f';
    ctx.beginPath();
    ctx.ellipse(pp_pond_x + S / 2, pp_pond_y + S / 2, 28, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    // Deep blue water
    ctx.fillStyle = '#0984e3';
    ctx.beginPath();
    ctx.ellipse(pp_pond_x + S / 2, pp_pond_y + S / 2, 25, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    // Turquoise shimmer
    ctx.fillStyle = '#00cec9';
    ctx.beginPath();
    ctx.ellipse(pp_pond_x + S / 2 - 3, pp_pond_y + S / 2 - 2, 17, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    // Lily pads (green circles with notch)
    const lilyPads = [
      { x: pp_pond_x + 22, y: pp_pond_y + 24, r: 5 },
      { x: pp_pond_x + 40, y: pp_pond_y + 26, r: 6 },
      { x: pp_pond_x + 32, y: pp_pond_y + 42, r: 5.5 },
      { x: pp_pond_x + 20, y: pp_pond_y + 38, r: 4.5 }
    ];
    for (const lp of lilyPads) {
      ctx.fillStyle = '#26de81';
      ctx.beginPath();
      ctx.arc(lp.x, lp.y, lp.r, 0.4, Math.PI * 2 - 0.4);
      ctx.lineTo(lp.x, lp.y);
      ctx.closePath();
      ctx.fill();
    }
    // Blooming Pink Lotus Flower
    ctx.fillStyle = '#fd79a8';
    ctx.beginPath();
    ctx.arc(pp_pond_x + 39, pp_pond_y + 25, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(pp_pond_x + 38.5, pp_pond_y + 24.5, 1.5, 1.5);
    this.registerTile('park_pond', 4, R10);

    // 5, 10: Classical Bronze Park Monument / Statue
    const ps_x = 5 * S, ps_y = R10 * S;
    ctx.fillStyle = '#7f8c8d'; // Granite plaza pavers
    ctx.fillRect(ps_x, ps_y, S, S);
    // Outer shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(ps_x + 36, ps_y + 36, 22, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    // Multi-tier marble plinth base
    ctx.fillStyle = '#dcdde1';
    ctx.beginPath();
    ctx.roundRect(ps_x + 16, ps_y + 16, 32, 32, 3);
    ctx.fill();
    ctx.strokeStyle = '#718093';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Inner stepped pedestal
    ctx.fillStyle = '#f5f6fa';
    ctx.beginPath();
    ctx.roundRect(ps_x + 21, ps_y + 21, 22, 22, 2);
    ctx.fill();
    ctx.strokeStyle = '#2f3542';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Bronze Equestrian / Hero Figure (patinated bronze with highlights)
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(ps_x + 32, ps_y + 30, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#10ac84'; // Green verdigris bronze patina
    ctx.beginPath();
    ctx.arc(ps_x + 31, ps_y + 29, 6, 0, Math.PI * 2);
    ctx.fill();
    // Bronze commemorative plaque on south face
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(ps_x + 24, ps_y + 40, 16, 3);
    this.registerTile('park_statue', 5, R10);

    // 6, 10: Modern Electric Vehicle (EV) Charging Bay
    const ev_x = 6 * S, ev_y = R10 * S;
    ctx.fillStyle = '#1e252b'; // Asphalt base
    ctx.fillRect(ev_x, ev_y, S, S);
    // Distinctive bright green EV stall box
    ctx.fillStyle = 'rgba(38, 222, 129, 0.22)';
    ctx.fillRect(ev_x + 8, ev_y + 10, 48, 44);
    ctx.strokeStyle = '#26de81';
    ctx.lineWidth = 2;
    ctx.strokeRect(ev_x + 8, ev_y + 10, 48, 44);
    // Painted White Plug / EV icon
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ev_x + 28, ev_y + 22, 8, 12);
    ctx.fillRect(ev_x + 26, ev_y + 18, 3, 5);
    ctx.fillRect(ev_x + 35, ev_y + 18, 3, 5);
    // Cable line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ev_x + 32, ev_y + 34);
    ctx.lineTo(ev_x + 32, ev_y + 42);
    ctx.lineTo(ev_x + 26, ev_y + 46);
    ctx.stroke();
    // Charging terminal kiosk on curb
    ctx.fillStyle = '#2ed573';
    ctx.fillRect(ev_x + 4, ev_y + 24, 4, 16);
    ctx.fillStyle = '#00d2d3';
    ctx.fillRect(ev_x + 4, ev_y + 28, 4, 4);
    this.registerTile('parking_ev', 6, R10);

    // 7, 10: Dual-Headed Parking Lot Light Mast
    const pl_x = 7 * S, pl_y = R10 * S;
    ctx.fillStyle = '#1e252b';
    ctx.fillRect(pl_x, pl_y, S, S);
    // Round concrete base
    ctx.fillStyle = '#a4b0be';
    ctx.beginPath();
    ctx.arc(pl_x + 32, pl_y + 32, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#57606f';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Heavy dual cantilever arms
    ctx.fillStyle = '#2f3542';
    ctx.fillRect(pl_x + 18, pl_y + 30, 28, 4);
    // Two high-intensity LED floodlight heads
    ctx.fillStyle = '#dfe4ea';
    ctx.fillRect(pl_x + 14, pl_y + 27, 8, 10);
    ctx.fillRect(pl_x + 42, pl_y + 27, 8, 10);
    ctx.fillStyle = '#f1c40f'; // Lens face
    ctx.fillRect(pl_x + 14, pl_y + 30, 2, 4);
    ctx.fillRect(pl_x + 48, pl_y + 30, 2, 4);
    this.registerTile('parking_light', 7, R10);

    // =============================================================
    // ROW 11: ROOFTOP MATERIALS & URBAN SIGNAGE
    // =============================================================
    const R11 = 11;

    // 0, 11: Industrial Tar & Pea-Gravel Rooftop Deck
    const gr_x = 0 * S, gr_y = R11 * S;
    ctx.fillStyle = '#374151'; // Dark asphaltic aggregate base
    ctx.fillRect(gr_x, gr_y, S, S);
    // Bitumen expansion lines
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gr_x, gr_y + 24);
    ctx.lineTo(gr_x + S, gr_y + 24);
    ctx.moveTo(gr_x + 32, gr_y);
    ctx.lineTo(gr_x + 32, gr_y + S);
    ctx.stroke();
    // Thousands of granular pea-gravel speckles
    const gravelColors = ['#4b5563', '#6b7280', '#9ca3af', '#111827'];
    for (let i = 0; i < 48; i++) {
      const gx = gr_x + ((i * 23 + 5) % (S - 2));
      const gy = gr_y + ((i * 37 + 11) % (S - 2));
      ctx.fillStyle = gravelColors[i % gravelColors.length];
      ctx.fillRect(gx, gy, 1.5, 1.5);
    }
    // Cast-iron drainage scupper in corner
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(gr_x + 12, gr_y + 12, 4, 0, Math.PI * 2);
    ctx.fill();
    this.registerTile('roof_gravel', 0, R11);

    // 1, 11: Modern Architectural Standing-Seam Metal Roof
    const mt_x = 1 * S, mt_y = R11 * S;
    ctx.fillStyle = '#2c3e50'; // Sleek dark slate-navy finish
    ctx.fillRect(mt_x, mt_y, S, S);
    // Vertical raised standing seams every 12px
    for (let x = 8; x < S; x += 12) {
      ctx.fillStyle = '#1a252f';
      ctx.fillRect(mt_x + x, mt_y, 2, S);
      ctx.fillStyle = '#546de5';
      ctx.fillRect(mt_x + x + 2, mt_y, 1, S);
    }
    this.registerTile('roof_metal', 1, R11);

    // 2, 11: Cellular Communications Antenna Mast with Red Obstruction Beacon
    const an_x = 2 * S, an_y = R11 * S;
    ctx.fillStyle = '#263238'; // Roof base
    ctx.fillRect(an_x, an_y, S, S);
    // Heavy tripod base
    ctx.strokeStyle = '#57606f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(an_x + 32, an_y + 32);
    ctx.lineTo(an_x + 16, an_y + 48);
    ctx.moveTo(an_x + 32, an_y + 32);
    ctx.lineTo(an_x + 48, an_y + 48);
    ctx.moveTo(an_x + 32, an_y + 32);
    ctx.lineTo(an_x + 32, an_y + 14);
    ctx.stroke();
    // Central mast pole
    ctx.fillStyle = '#ced6e0';
    ctx.beginPath();
    ctx.arc(an_x + 32, an_y + 32, 6, 0, Math.PI * 2);
    ctx.fill();
    // Red beacon center
    ctx.fillStyle = '#ff4757';
    ctx.beginPath();
    ctx.arc(an_x + 32, an_y + 32, 3, 0, Math.PI * 2);
    ctx.fill();
    this.registerTile('roof_antenna', 2, R11);

    // 3, 11: Rooftop Compact Commercial AC Condenser Unit
    const acu_x = 3 * S, acu_y = R11 * S;
    ctx.fillStyle = '#263238';
    ctx.fillRect(acu_x, acu_y, S, S);
    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(acu_x + 14, acu_y + 16, 40, 36);
    // Condenser cabinet
    ctx.fillStyle = '#485460';
    ctx.beginPath();
    ctx.roundRect(acu_x + 10, acu_y + 12, 38, 34, 3);
    ctx.fill();
    ctx.strokeStyle = '#2d3436';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Circular fan cowl
    ctx.fillStyle = '#1e272e';
    ctx.beginPath();
    ctx.arc(acu_x + 29, acu_y + 29, 11, 0, Math.PI * 2);
    ctx.fill();
    // Protective grill mesh
    ctx.strokeStyle = '#718093';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(acu_x + 20, acu_y + 29);
    ctx.lineTo(acu_x + 38, acu_y + 29);
    ctx.moveTo(acu_x + 29, acu_y + 20);
    ctx.lineTo(acu_x + 29, acu_y + 38);
    ctx.stroke();
    this.registerTile('roof_ac_unit', 3, R11);

    // 4, 11: Victorian Park Lamppost (Cast Iron Lantern)
    const pln_x = 4 * S, pln_y = R11 * S;
    ctx.fillStyle = '#7f8c8d'; // Path stone
    ctx.fillRect(pln_x, pln_y, S, S);
    // Soft shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.arc(pln_x + 34, pl_y + 34, 8, 0, Math.PI * 2);
    ctx.fill();
    // Cast iron fluted base
    ctx.fillStyle = '#1e272e';
    ctx.beginPath();
    ctx.arc(pln_x + 32, pl_y + 32, 6, 0, Math.PI * 2);
    ctx.fill();
    // Warm glowing lantern glass core
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.arc(pln_x + 32, pl_y + 32, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(pln_x + 31, pl_y + 31, 2, 2);
    this.registerTile('park_lantern', 4, R11);

    // 5, 11: Illuminated Blue Parking "P" Sign
    const psn_x = 5 * S, psn_y = R11 * S;
    ctx.fillStyle = '#1e252b';
    ctx.fillRect(psn_x, psn_y, S, S);
    // Square sign post shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(psn_x + 18, ps_y + 18, 32, 32);
    // Vibrant Blue Parking Sign Box
    ctx.fillStyle = '#0984e3';
    ctx.beginPath();
    ctx.roundRect(psn_x + 14, ps_y + 14, 36, 36, 5);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    // White Bold "P"
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', psn_x + 32, psn_y + 32);
    this.registerTile('parking_sign', 5, R11);
  }

  destroy(): void {
    this.texture.destroy();
  }
}

