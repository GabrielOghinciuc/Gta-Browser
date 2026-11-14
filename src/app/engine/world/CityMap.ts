import { SpriteBatch } from '../graphics/SpriteBatch';
import { TextureAtlas, UVCoords } from '../graphics/TextureAtlas';
import { TileType } from '../types';

export interface TrafficLightState {
  ew: 'green' | 'yellow' | 'red';
  ns: 'green' | 'yellow' | 'red';
}

interface TreeProp {
  x: number;
  y: number;
  size: number;
  isLarge: boolean;
  seed: number;
}

interface StreetProp {
  x: number;
  y: number;
  seed: number;
}

type StreetFurnitureKind = 'bench' | 'trash_bin' | 'bollard' | 'planter';

interface StreetFurniture {
  x: number;
  y: number;
  seed: number;
  kind: StreetFurnitureKind;
  rotation: number;
}

export interface Roundabout {
  centerC: number;
  centerR: number;
  x: number;
  y: number;
  radius: number;
}

export interface ParkingLot {
  id: number;
  name: string;
  blockC: number;
  blockR: number;
  centerX: number;
  centerY: number;
  spots: Array<{ x: number; y: number; angle: number }>;
}

export class CityMap {
  readonly cols = 128;
  readonly rows = 128;
  readonly tileSize = 64;

  readonly tiles: TileType[];

  // Props across the city
  readonly trees: TreeProp[] = [];
  readonly manholes: StreetProp[] = [];
  readonly streetLamps: StreetProp[] = [];
  readonly streetFurniture: StreetFurniture[] = [];
  readonly roundabouts: Roundabout[] = [];
  readonly parkingLots: ParkingLot[] = [];

  constructor() {
    this.tiles = new Array(this.cols * this.rows).fill(TileType.GRASS);
    this.generateCity();
    this.populateProps();
  }

  get width(): number {
    return this.cols * this.tileSize;
  }

  get height(): number {
    return this.rows * this.tileSize;
  }

  getTile(c: number, r: number): TileType {
    if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) {
      return TileType.BUILDING;
    }
    return this.tiles[r * this.cols + c];
  }

  setTile(c: number, r: number, type: TileType): void {
    if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
      this.tiles[r * this.cols + c] = type;
    }
  }

  isSolid(c: number, r: number): boolean {
    const tile = this.getTile(c, r);
    if (tile === TileType.BUILDING || tile === TileType.WATER) return true;
    for (const rb of this.roundabouts) {
      if (rb.centerC === c && rb.centerR === r) return true;
    }
    return false;
  }

  isRoundaboutCenter(c: number, r: number): boolean {
    for (const rb of this.roundabouts) {
      if (rb.centerC === c && rb.centerR === r) return true;
    }
    return false;
  }

  isRoundaboutTile(c: number, r: number): boolean {
    for (const rb of this.roundabouts) {
      if (Math.abs(c - rb.centerC) <= 1 && Math.abs(r - rb.centerR) <= 1) {
        return true;
      }
    }
    return false;
  }

  getRoundaboutAt(worldX: number, worldY: number): Roundabout | null {
    for (const rb of this.roundabouts) {
      const dist = Math.hypot(worldX - rb.x, worldY - rb.y);
      if (dist <= this.tileSize * 1.8) {
        return rb;
      }
    }
    return null;
  }

  getGrassTiles(): Array<{ c: number; r: number }> {
    const list: Array<{ c: number; r: number }> = [];
    for (let r = 2; r < this.rows - 2; r++) {
      for (let c = 2; c < this.cols - 2; c++) {
        if (this.getTile(c, r) === TileType.GRASS) {
          list.push({ c, r });
        }
      }
    }
    return list;
  }

  getNearestGrassPosition(worldX: number, worldY: number): { x: number; y: number } | null {
    const centerC = Math.floor(worldX / this.tileSize);
    const centerR = Math.floor(worldY / this.tileSize);
    const S = this.tileSize;

    for (let radius = 0; radius <= 20; radius++) {
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue;
          const c = centerC + dc;
          const r = centerR + dr;
          if (this.getTile(c, r) === TileType.GRASS) {
            return { x: c * S + S / 2, y: r * S + S / 2 };
          }
        }
      }
    }
    return null;
  }

  isHospitalBlock(blockC: number, blockR: number): boolean {
    return (
      (blockC === 1 && blockR === 1) ||
      (blockC === 11 && blockR === 2) ||
      (blockC === 3 && blockR === 11) ||
      (blockC === 12 && blockR === 12)
    );
  }

  isPoliceBlock(blockC: number, blockR: number): boolean {
    return (
      (blockC === 4 && blockR === 2) ||
      (blockC === 13 && blockR === 4) ||
      (blockC === 2 && blockR === 13) ||
      (blockC === 10 && blockR === 13)
    );
  }

  isParkingBlock(blockC: number, blockR: number): boolean {
    const designated = [
      '2,1', '5,2', '1,4', '6,3', '10,3', '12,3',
      '14,6', '4,11', '3,13', '7,10', '11,12', '14,13', '8,7'
    ];
    return designated.includes(`${blockC},${blockR}`);
  }

  private isRoad(c: number, r: number): boolean {
    const tile = this.getTile(c, r);
    return (
      tile === TileType.ROAD_HORIZONTAL ||
      tile === TileType.ROAD_VERTICAL ||
      tile === TileType.ROAD_INTERSECTION ||
      tile === TileType.ROUNDABOUT
    );
  }

  private generateCity(): void {
    const blockSize = 8; // Grid spacing for avenues and streets

    // 1. Fill base with grass and water border
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (c === 0 || c === this.cols - 1 || r === 0 || r === this.rows - 1) {
          this.setTile(c, r, TileType.WATER);
        } else {
          this.setTile(c, r, TileType.GRASS);
        }
      }
    }

    // 2. Lay out road grid (horizontal and vertical avenues)
    for (let r = 2; r < this.rows - 2; r++) {
      for (let c = 2; c < this.cols - 2; c++) {
        const isRoadRow = r % blockSize === 0;
        const isRoadCol = c % blockSize === 0;

        if (isRoadRow && isRoadCol) {
          this.setTile(c, r, TileType.ROAD_INTERSECTION);
        } else if (isRoadRow) {
          this.setTile(c, r, TileType.ROAD_HORIZONTAL);
        } else if (isRoadCol) {
          this.setTile(c, r, TileType.ROAD_VERTICAL);
        }
      }
    }

    // 3. Add sidewalks bordering the roads
    for (let r = 2; r < this.rows - 2; r++) {
      for (let c = 2; c < this.cols - 2; c++) {
        if (this.getTile(c, r) === TileType.GRASS) {
          const adjNorth = this.isRoad(c, r - 1);
          const adjSouth = this.isRoad(c, r + 1);
          const adjWest = this.isRoad(c - 1, r);
          const adjEast = this.isRoad(c + 1, r);

          if (adjNorth || adjSouth || adjWest || adjEast) {
            this.setTile(c, r, TileType.SIDEWALK);
          }
        }
      }
    }

    // 4. Populate city blocks with buildings, hospitals, police stations, parking lots and parks
    const S = this.tileSize;
    for (let blockR = 0; blockR < Math.floor(this.rows / blockSize); blockR++) {
      for (let blockC = 0; blockC < Math.floor(this.cols / blockSize); blockC++) {
        const startC = blockC * blockSize + 2;
        const startR = blockR * blockSize + 2;
        const endC = startC + blockSize - 4;
        const endR = startR + blockSize - 4;

        // Dedicated Parking Lots (Parcari)
        if (this.isParkingBlock(blockC, blockR)) {
          for (let r = startR; r <= endR; r++) {
            for (let c = startC; c <= endC; c++) {
              this.setTile(c, r, TileType.PARKING);
            }
          }

          let lotName = 'PUBLIC PARKING LOT';
          if (blockC === 2 && blockR === 1) lotName = 'HOSPITAL EMERGENCY LOT';
          else if (blockC === 5 && blockR === 2) lotName = 'POLICE IMPOUND LOT';
          else if (blockC === 10 && blockR === 3) lotName = 'FINANCIAL PLAZA PARKING';
          else if (blockC === 4 && blockR === 11) lotName = 'SOUTH MEMORIAL PARKING';

          this.parkingLots.push({
            id: this.parkingLots.length + 1,
            name: lotName,
            blockC,
            blockR,
            centerX: (startC + 2) * S + S / 2,
            centerY: (startR + 2) * S + S / 2,
            spots: [
              { x: (startC + 1) * S + S / 2, y: (startR + 1) * S + S / 2, angle: 0 },
              { x: (startC + 1) * S + S / 2, y: (startR + 2) * S + S / 2, angle: 0 },
              { x: (startC + 1) * S + S / 2, y: (startR + 3) * S + S / 2, angle: 0 },
              { x: (startC + 3) * S + S / 2, y: (startR + 1) * S + S / 2, angle: Math.PI },
              { x: (startC + 3) * S + S / 2, y: (startR + 2) * S + S / 2, angle: Math.PI },
              { x: (startC + 3) * S + S / 2, y: (startR + 3) * S + S / 2, angle: Math.PI },
            ]
          });
          continue;
        }

        // Keep select blocks as parks / plazas (unless they are a Hospital or Police precinct)
        if (
          (blockR + blockC) % 5 === 0 &&
          !this.isHospitalBlock(blockC, blockR) &&
          !this.isPoliceBlock(blockC, blockR)
        ) {
          continue; // Keep as grass park
        }

        for (let r = startR; r <= endR; r++) {
          for (let c = startC; c <= endC; c++) {
            if (this.getTile(c, r) === TileType.GRASS) {
              this.setTile(c, r, TileType.BUILDING);
            }
          }
        }
      }
    }

    // 5. Lay out Roundabouts (Giratorii) at select major avenue junctions
    for (let r = blockSize * 2; r <= this.rows - blockSize * 2; r += blockSize) {
      for (let c = blockSize * 2; c <= this.cols - blockSize * 2; c += blockSize) {
        // Every 3rd intersection is a Roundabout (avoid spawn at c=8, r=8)
        if ((c / blockSize + r / blockSize) % 3 === 0 && !(c === 8 && r === 8)) {
          this.createRoundabout(c, r);
        }
      }
    }
  }

  private createRoundabout(centerC: number, centerR: number): void {
    const S = this.tileSize;

    // Set 3x3 junction area to ROUNDABOUT
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        this.setTile(centerC + dc, centerR + dr, TileType.ROUNDABOUT);
      }
    }

    this.roundabouts.push({
      centerC,
      centerR,
      x: centerC * S + S / 2,
      y: centerR * S + S / 2,
      radius: S * 1.5
    });
  }

  private populateProps(): void {
    const S = this.tileSize;

    // 1. Populate Trees in parks and sidewalks (NEVER inside or on roundabouts!)
    for (let r = 2; r < this.rows - 2; r++) {
      for (let c = 2; c < this.cols - 2; c++) {
        if (this.isRoundaboutTile(c, r)) continue;
        const tile = this.getTile(c, r);

        if (tile === TileType.GRASS) {
          const relC = (c - 2) % 8;
          const relR = (r - 2) % 8;
          // Avoid trees on walkways and central fountain plaza in park blocks
          if (relC === 2 || relR === 2) continue;

          // Park tree clusters on lawn corners
          const treeCount = ((c * 7 + r * 13) % 3) === 0 ? 2 : 1;
          for (let i = 0; i < treeCount; i++) {
            const ox = ((c * 19 + i * 27) % 36) + 14;
            const oy = ((r * 23 + i * 31) % 36) + 14;
            this.trees.push({
              x: c * S + ox,
              y: r * S + oy,
              size: 44 + ((c + r * 3 + i) % 10),
              isLarge: (c + r + i) % 2 === 0,
              seed: c * 100 + r + i
            });
          }
        } else if (tile === TileType.SIDEWALK && (c + r) % 5 === 0) {
          // Occasional sidewalk shrub
          this.trees.push({
            x: c * S + S / 2,
            y: r * S + S / 2,
            size: 28,
            isLarge: false,
            seed: c * 50 + r
          });
        }
      }
    }

    // 2. Sewer manholes on streets
    for (let r = 2; r < this.rows - 2; r++) {
      for (let c = 2; c < this.cols - 2; c++) {
        if (this.isRoundaboutTile(c, r)) continue;
        const tile = this.getTile(c, r);
        if (tile === TileType.ROAD_HORIZONTAL && c % 4 === 2) {
          this.manholes.push({
            x: c * S + S / 2,
            y: r * S + S / 2,
            seed: c * 40 + r
          });
        } else if (tile === TileType.ROAD_VERTICAL && r % 4 === 2) {
          this.manholes.push({
            x: c * S + S / 2,
            y: r * S + S / 2,
            seed: c * 40 + r
          });
        }
      }
    }

    // 4. Streetlamps along sidewalks
    for (let r = 2; r < this.rows - 2; r++) {
      for (let c = 2; c < this.cols - 2; c++) {
        if (this.isRoundaboutTile(c, r)) continue;
        if (this.getTile(c, r) === TileType.SIDEWALK && (c + r) % 3 === 0) {
          this.streetLamps.push({
            x: c * S + S / 2,
            y: r * S + S / 2,
            seed: c * 70 + r
          });
        }
      }
    }

    // 5. Street furniture: deterministic placement keeps the city readable
    // while giving each block a different public-space rhythm.
    for (let r = 2; r < this.rows - 2; r++) {
      for (let c = 2; c < this.cols - 2; c++) {
        if (this.isRoundaboutTile(c, r) || this.getTile(c, r) !== TileType.SIDEWALK) continue;

        const seed = c * 37 + r * 71;
        const roll = seed % 17;
        let kind: StreetFurnitureKind | null = null;
        if (roll === 0 && (c + r) % 2 === 0) {
          kind = 'bench';
        } else if (roll === 4 || roll === 11) {
          kind = 'trash_bin';
        } else if (roll === 7 || roll === 15) {
          kind = 'bollard';
        } else if (roll === 9 && (c * 3 + r) % 2 === 0) {
          kind = 'planter';
        }

        if (kind) {
          this.streetFurniture.push({
            x: c * S + S / 2,
            y: r * S + S / 2,
            seed,
            kind,
            rotation: (c % 2 === 0 ? 0 : Math.PI / 2)
          });
        }
      }
    }
  }

  // Get dynamic traffic light status for any intersection
  getTrafficLightPhase(c: number, r: number, time: number): TrafficLightState {
    const cycle = 18.2; // Includes short all-red clearance phases
    const t = (time + c * 0.45 + r * 0.35) % cycle;

    if (t < 6.5) {
      return { ew: 'green', ns: 'red' };
    } else if (t < 8.5) {
      return { ew: 'yellow', ns: 'red' };
    } else if (t < 9.1) {
      return { ew: 'red', ns: 'red' };
    } else if (t < 15.6) {
      return { ew: 'red', ns: 'green' };
    } else if (t < 17.6) {
      return { ew: 'red', ns: 'yellow' };
    }

    return { ew: 'red', ns: 'red' };
  }

  render(
    batch: SpriteBatch,
    atlas: TextureAtlas,
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    time = 0,
    isNight = false
  ): void {
    const minC = Math.max(0, Math.floor(bounds.minX / this.tileSize));
    const maxC = Math.min(this.cols - 1, Math.ceil(bounds.maxX / this.tileSize));
    const minR = Math.max(0, Math.floor(bounds.minY / this.tileSize));
    const maxR = Math.min(this.rows - 1, Math.ceil(bounds.maxY / this.tileSize));

    const whiteUV = atlas.getUVs('white');
    const lightHaloUV = atlas.getUVs('light_halo');
    const lampUV = atlas.getUVs('street_lamp');

    // PASS 1: Ground Tiles (Grass, Sidewalks, Roads, Water, Parking, Parks)
    this.renderGroundBase(batch, atlas, whiteUV, minC, maxC, minR, maxR, time, isNight);

    // PASS 2: Roundabouts
    this.renderRoundabouts(batch, atlas, whiteUV, lightHaloUV, lampUV, bounds, time, isNight);

    // PASS 3: Street Props (Manholes with steam)
    this.renderStreetProps(batch, atlas, bounds, time);

    // PASS 4: Streetlamps
    this.renderStreetLamps(batch, atlas, lightHaloUV, lampUV, bounds, time, isNight);

    // PASS 5: Sidewalk Furniture
    this.renderStreetFurniture(batch, atlas, whiteUV, bounds, isNight);

    // PASS 6: Traffic Lights
    this.renderTrafficLights(batch, atlas, lightHaloUV, minC, maxC, minR, maxR, time);

    // PASS 7: Nature, Animated Parks & Night Fireflies
    this.renderParksAndNature(batch, atlas, whiteUV, lightHaloUV, bounds, minC, maxC, minR, maxR, time, isNight);

    // PASS 8: Realistic Multi-Height Buildings, Parapets, Windows & Roof Clutter
    this.renderBuildings(batch, atlas, whiteUV, lightHaloUV, minC, maxC, minR, maxR, time, isNight);

    // PASS 9: Atmospheric Drifting Cloud Shadows
    this.renderAtmosphere(batch, atlas, bounds, time);
  }

  // =========================================================================
  // SUB-RENDERER 1: Ground Base (Roads, Sidewalks, Water, Parking, Parks)
  // =========================================================================
  private renderGroundBase(
    batch: SpriteBatch,
    atlas: TextureAtlas,
    whiteUV: UVCoords,
    minC: number,
    maxC: number,
    minR: number,
    maxR: number,
    time: number,
    isNight: boolean
  ): void {
    const S = this.tileSize;

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const type = this.getTile(c, r);
        const x = c * S;
        const y = r * S;

        let uvName = 'grass';
        switch (type) {
          case TileType.ROAD_HORIZONTAL:
            uvName = 'road_h';
            break;
          case TileType.ROAD_VERTICAL:
            uvName = 'road_v';
            break;
          case TileType.ROAD_INTERSECTION:
            uvName = 'road_cross';
            break;
          case TileType.ROUNDABOUT:
            uvName = 'road_h';
            break;
          case TileType.SIDEWALK:
          case TileType.BUILDING:
            uvName = 'sidewalk';
            break;
          case TileType.PARKING: {
            const relC = (c - 2) % 8;
            const relR = (r - 2) % 8;
            if (relC === 2) {
              uvName = 'parking_aisle';
            } else if (relC === 1) {
              if (relR === 0) uvName = 'parking_handicap';
              else if (relR === 1) uvName = 'parking_ev';
              else if (relR === 4) uvName = 'parking_island';
              else uvName = 'parking_bay';
            } else if (relC === 3) {
              if (relR === 0) uvName = 'parking_hazard';
              else if (relR === 4) uvName = 'parking_island';
              else uvName = 'parking_bay';
            } else if (relC === 0 || relC === 4) {
              if (relR === 0 || relR === 4) uvName = 'parking_island';
              else if (relR === 2) uvName = 'parking_sign';
              else uvName = 'parking_hazard';
            } else {
              uvName = 'parking_bay';
            }
            break;
          }
          case TileType.GRASS: {
            const relC = (c - 2) % 8;
            const relR = (r - 2) % 8;
            const parkBlockC = Math.floor((c - 2) / 8);
            const parkBlockR = Math.floor((r - 2) / 8);
            const parkStyle = Math.abs((parkBlockC * 3 + parkBlockR * 7) % 3);

            if (relC >= 0 && relC <= 4 && relR >= 0 && relR <= 4) {
              if (relC === 2 && relR === 2) {
                // Varied centerpiece by park block: Fountain, Bronze Monument, or Lily Pond
                if (parkStyle === 0) uvName = 'park_fountain';
                else if (parkStyle === 1) uvName = 'park_statue';
                else uvName = 'park_pond';
              } else if (relC === 2 || relR === 2) {
                // Victorian park lamppost at path entrances/crossings
                if (
                  (relC === 2 && (relR === 0 || relR === 4)) ||
                  (relR === 2 && (relC === 0 || relC === 4))
                ) {
                  uvName = 'park_lantern';
                } else {
                  uvName = 'park_path';
                }
              } else if (
                (relC === 1 && relR === 1) ||
                (relC === 3 && relR === 1) ||
                (relC === 1 && relR === 3) ||
                (relC === 3 && relR === 3)
              ) {
                uvName = 'park_flowerbed';
              } else if (
                (relC === 0 && relR === 1) ||
                (relC === 4 && relR === 1) ||
                (relC === 0 && relR === 3) ||
                (relC === 4 && relR === 3)
              ) {
                uvName = 'park_bench';
              } else {
                uvName = 'grass';
              }
            } else {
              uvName = 'grass';
            }
            break;
          }
          case TileType.WATER:
            uvName = 'water';
            break;
        }

        const uv = atlas.getUVs(uvName);
        batch.drawRegion(uv, x + S / 2, y + S / 2, S, S, 0, 0.5, 0.5, 1, 1, 1, 1);

        // Asphalt subtle road wear and oil drips
        if (type === TileType.ROAD_HORIZONTAL || type === TileType.ROAD_VERTICAL) {
          const wearSeed = Math.abs(c * 41 + r * 67);
          const roadRotation = type === TileType.ROAD_VERTICAL ? Math.PI / 2 : 0;
          if (wearSeed % 4 === 0) {
            batch.drawRegion(
              whiteUV,
              x + S / 2 + ((wearSeed % 3) - 1) * 8,
              y + S / 2 + ((wearSeed % 5) - 2) * 4,
              18,
              3,
              roadRotation,
              0.5,
              0.5,
              0.04,
              0.05,
              0.06,
              0.34
            );
          }
          if (wearSeed % 9 === 0) {
            batch.drawRegion(
              whiteUV,
              x + S / 2 - 12,
              y + S / 2 + 11,
              8,
              2,
              roadRotation,
              0.5,
              0.5,
              0.45,
              0.46,
              0.48,
              0.2
            );
          }
        } else if (type === TileType.SIDEWALK) {
          // Sidewalk perimeter granite bevel
          const curbColor: [number, number, number] = [0.58, 0.61, 0.63];
          if (this.isRoad(c, r - 1)) {
            batch.drawRegion(whiteUV, x + S / 2, y + 2, S, 3, 0, 0.5, 0.5, ...curbColor, 0.72);
          }
          if (this.isRoad(c, r + 1)) {
            batch.drawRegion(whiteUV, x + S / 2, y + S - 2, S, 3, 0, 0.5, 0.5, ...curbColor, 0.72);
          }
          if (this.isRoad(c - 1, r)) {
            batch.drawRegion(whiteUV, x + 2, y + S / 2, 3, S, 0, 0.5, 0.5, ...curbColor, 0.72);
          }
          if (this.isRoad(c + 1, r)) {
            batch.drawRegion(whiteUV, x + S - 2, y + S / 2, 3, S, 0, 0.5, 0.5, ...curbColor, 0.72);
          }
        }

        // Animated Water Shimmer & Shoreline Foam
        if (type === TileType.WATER) {
          const wavePhase = time * 2.5 + r * 1.2 + c * 0.8;
          const rippleX = x + S / 2 + Math.sin(wavePhase) * 6;
          const rippleY = y + S / 2 + Math.cos(wavePhase * 0.7) * 4;
          const waveAlpha = 0.22 + 0.12 * Math.sin(time * 3.0 + c + r);

          batch.drawRegion(
            whiteUV,
            rippleX,
            rippleY - 10,
            S * 0.6,
            2.5,
            0,
            0.5,
            0.5,
            0.6,
            0.9,
            1.0,
            waveAlpha
          );
          batch.drawRegion(
            whiteUV,
            rippleX,
            rippleY + 12,
            S * 0.5,
            2.5,
            0,
            0.5,
            0.5,
            0.6,
            0.9,
            1.0,
            waveAlpha * 0.85
          );

          const hasLandNeighbor =
            !this.isWater(c - 1, r) ||
            !this.isWater(c + 1, r) ||
            !this.isWater(c, r - 1) ||
            !this.isWater(c, r + 1);

          if (hasLandNeighbor) {
            const foamPulse = 0.5 + 0.5 * Math.sin(time * 2.8 + (c + r));
            batch.drawRegion(
              whiteUV,
              x + S / 2,
              y + S / 2,
              S - 8 + foamPulse * 6,
              S - 8 + foamPulse * 6,
              0,
              0.5,
              0.5,
              0.85,
              0.95,
              1.0,
              0.15 * foamPulse
            );
          }
        }
      }
    }

    // Parking lot perimeter curbs (continuous concrete edge)
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (this.getTile(c, r) !== TileType.PARKING) continue;

        const x = c * S;
        const y = r * S;
        const curbColor: [number, number, number] = [0.72, 0.76, 0.78];
        if (this.getTile(c - 1, r) !== TileType.PARKING) {
          batch.drawRegion(whiteUV, x + 2, y + S / 2, 4, S, 0, 0.5, 0.5, ...curbColor, 0.9);
        }
        if (this.getTile(c + 1, r) !== TileType.PARKING) {
          batch.drawRegion(whiteUV, x + S - 2, y + S / 2, 4, S, 0, 0.5, 0.5, ...curbColor, 0.9);
        }
        if (this.getTile(c, r - 1) !== TileType.PARKING) {
          batch.drawRegion(whiteUV, x + S / 2, y + 2, S, 4, 0, 0.5, 0.5, ...curbColor, 0.9);
        }
        if (this.getTile(c, r + 1) !== TileType.PARKING) {
          batch.drawRegion(whiteUV, x + S / 2, y + S - 2, S, 4, 0, 0.5, 0.5, ...curbColor, 0.9);
        }
      }
    }
  }

  // =========================================================================
  // SUB-RENDERER 2: Roundabouts (Giratorii)
  // =========================================================================
  private renderRoundabouts(
    batch: SpriteBatch,
    atlas: TextureAtlas,
    whiteUV: UVCoords,
    lightHaloUV: UVCoords,
    lampUV: UVCoords,
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    time: number,
    isNight: boolean
  ): void {
    const S = this.tileSize;
    const rbUV = atlas.getUVs('roundabout_base');

    for (const rb of this.roundabouts) {
      if (
        rb.x < bounds.minX - S * 3 ||
        rb.x > bounds.maxX + S * 3 ||
        rb.y < bounds.minY - S * 3 ||
        rb.y > bounds.maxY + S * 3
      ) {
        continue;
      }

      // Seamless circular roundabout base (192x192 px)
      batch.drawRegion(rbUV, rb.x, rb.y, 192, 192, 0, 0.5, 0.5, 1, 1, 1, 1);

      // Concentric fountain ripples in center
      const r1 = (time * 1.6) % 1.0;
      const r2 = (time * 1.6 + 0.5) % 1.0;
      batch.drawRegion(lightHaloUV, rb.x, rb.y, 12 + r1 * 26, 12 + r1 * 26, 0, 0.5, 0.5, 0.35, 0.85, 1.0, (1.0 - r1) * 0.75);
      batch.drawRegion(lightHaloUV, rb.x, rb.y, 12 + r2 * 26, 12 + r2 * 26, 0, 0.5, 0.5, 0.35, 0.85, 1.0, (1.0 - r2) * 0.75);

      // Fountain spray sparkle
      const sprayPulse = 1.0 + Math.sin(time * 5.0) * 0.2;
      batch.drawRegion(whiteUV, rb.x, rb.y, 7 * sprayPulse, 7 * sprayPulse, time * 1.5, 0.5, 0.5, 1.0, 1.0, 1.0, 0.95);

      // Corner sidewalk lamps
      const cornerOffsets: [number, number][] = [
        [-68, -68],
        [68, -68],
        [-68, 68],
        [68, 68]
      ];
      for (const [ox, oy] of cornerOffsets) {
        const lx = rb.x + ox;
        const ly = rb.y + oy;
        const haloSize = isNight ? 100 : 54;
        const haloAlpha = isNight ? 0.65 : 0.22;

        batch.drawRegion(lightHaloUV, lx, ly, haloSize, haloSize, 0, 0.5, 0.5, 1.0, 0.92, 0.6, haloAlpha);
        batch.drawRegion(lampUV, lx, ly, 14, 14, 0, 0.5, 0.5, 1, 1, 1, 1);
      }

      if (isNight) {
        batch.drawRegion(lightHaloUV, rb.x, rb.y, 64, 64, 0, 0.5, 0.5, 0.1, 0.7, 1.0, 0.65);
      }
    }
  }

  // =========================================================================
  // SUB-RENDERER 3: Street Props (Manholes with Steam)
  // =========================================================================
  private renderStreetProps(
    batch: SpriteBatch,
    atlas: TextureAtlas,
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    time: number
  ): void {
    const manholeUV = atlas.getUVs('manhole');
    const steamUV = atlas.getUVs('steam_puff');

    for (const mh of this.manholes) {
      if (
        mh.x >= bounds.minX - 32 &&
        mh.x <= bounds.maxX + 32 &&
        mh.y >= bounds.minY - 32 &&
        mh.y <= bounds.maxY + 32
      ) {
        batch.drawRegion(manholeUV, mh.x, mh.y, 24, 24, 0, 0.5, 0.5, 1, 1, 1, 1);

        for (let p = 0; p < 3; p++) {
          const steamTime = (time * 0.75 + p * 0.6 + mh.seed) % 1.8;
          const progress = steamTime / 1.8;
          const puffX = mh.x + progress * 14 + Math.sin(time * 2.2 + p) * 3;
          const puffY = mh.y - progress * 24;
          const puffSize = 14 + progress * 20;
          const puffAlpha = (1.0 - progress) * 0.42;

          batch.drawRegion(steamUV, puffX, puffY, puffSize, puffSize, progress * 1.5, 0.5, 0.5, 1, 1, 1, puffAlpha);
        }
      }
    }
  }

  // =========================================================================
  // SUB-RENDERER 4: Streetlamps along Sidewalks
  // =========================================================================
  private renderStreetLamps(
    batch: SpriteBatch,
    atlas: TextureAtlas,
    lightHaloUV: UVCoords,
    lampUV: UVCoords,
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    time: number,
    isNight: boolean
  ): void {
    for (const sl of this.streetLamps) {
      if (
        sl.x >= bounds.minX - 64 &&
        sl.x <= bounds.maxX + 64 &&
        sl.y >= bounds.minY - 64 &&
        sl.y <= bounds.maxY + 64
      ) {
        const flicker = Math.sin(time * 18 + sl.seed) > 0.96 ? 0.5 : 1.0;
        const haloSize = isNight ? 115 : 68;
        const haloAlpha = isNight ? 0.72 * flicker : 0.28 * flicker;

        batch.drawRegion(lightHaloUV, sl.x, sl.y, haloSize, haloSize, 0, 0.5, 0.5, 1.0, 0.92, 0.55, haloAlpha);
        batch.drawRegion(lampUV, sl.x, sl.y, 14, 14, 0, 0.5, 0.5, 1, 1, 1, 1);
      }
    }
  }

  // =========================================================================
  // SUB-RENDERER 5: Sidewalk Furniture
  // =========================================================================
  private renderStreetFurniture(
    batch: SpriteBatch,
    atlas: TextureAtlas,
    whiteUV: UVCoords,
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    isNight: boolean
  ): void {
    const furnitureUVs = {
      bench: atlas.getUVs('street_bench'),
      trash_bin: atlas.getUVs('trash_bin'),
      bollard: atlas.getUVs('bollard'),
      planter: atlas.getUVs('street_planter')
    };

    for (const furniture of this.streetFurniture) {
      if (
        furniture.x < bounds.minX - 40 ||
        furniture.x > bounds.maxX + 40 ||
        furniture.y < bounds.minY - 40 ||
        furniture.y > bounds.maxY + 40
      ) {
        continue;
      }

      const size =
        furniture.kind === 'bench'
          ? 38
          : furniture.kind === 'planter'
            ? 28
            : furniture.kind === 'bollard'
              ? 22
              : 24;
      const alpha = isNight ? 0.96 : 1;

      batch.drawRegion(whiteUV, furniture.x + 3, furniture.y + 5, size * 0.78, size * 0.28, furniture.rotation, 0.5, 0.5, 0, 0, 0, 0.3);
      batch.drawRegion(furnitureUVs[furniture.kind], furniture.x, furniture.y, size, size, furniture.rotation, 0.5, 0.5, 1, 1, 1, alpha);
    }
  }

  // =========================================================================
  // SUB-RENDERER 6: Traffic Lights & Intersection Glowing Beams
  // =========================================================================
  private renderTrafficLights(
    batch: SpriteBatch,
    atlas: TextureAtlas,
    lightHaloUV: UVCoords,
    minC: number,
    maxC: number,
    minR: number,
    maxR: number,
    time: number
  ): void {
    const S = this.tileSize;
    const tlEW_UV = atlas.getUVs('traffic_light_ew');
    const tlNS_UV = atlas.getUVs('traffic_light_ns');

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (this.getTile(c, r) === TileType.ROAD_INTERSECTION && !this.isRoundaboutTile(c, r)) {
          const cx = c * S + S / 2;
          const cy = r * S + S / 2;
          const lights = this.getTrafficLightPhase(c, r, time);

          const ewColor =
            lights.ew === 'green'
              ? [0.18, 0.95, 0.35]
              : lights.ew === 'yellow'
              ? [1.0, 0.75, 0.1]
              : [0.95, 0.2, 0.2];

          const pulse = 0.9 + Math.sin(time * 7 + c * 0.8 + r) * 0.1;
          if (lights.ew !== 'red' || lights.ns === 'red') {
            batch.drawRegion(
              lightHaloUV,
              cx,
              cy,
              76,
              50,
              0,
              0.5,
              0.5,
              ewColor[0],
              ewColor[1],
              ewColor[2],
              0.22 * pulse
            );
          }

          const nsColor =
            lights.ns === 'green'
              ? [0.18, 0.95, 0.35]
              : lights.ns === 'yellow'
              ? [1.0, 0.75, 0.1]
              : [0.95, 0.2, 0.2];

          if (lights.ns !== 'red' || lights.ew === 'red') {
            batch.drawRegion(
              lightHaloUV,
              cx,
              cy,
              50,
              76,
              0,
              0.5,
              0.5,
              nsColor[0],
              nsColor[1],
              nsColor[2],
              0.22 * pulse
            );
          }

          batch.drawRegion(tlEW_UV, cx, cy - 28, 28, 14, 0, 0.5, 0.5, 1, 1, 1, 1);
          batch.drawRegion(tlEW_UV, cx, cy + 28, 28, 14, 0, 0.5, 0.5, 1, 1, 1, 1);
          batch.drawRegion(tlNS_UV, cx - 28, cy, 14, 28, 0, 0.5, 0.5, 1, 1, 1, 1);
          batch.drawRegion(tlNS_UV, cx + 28, cy, 14, 28, 0, 0.5, 0.5, 1, 1, 1, 1);

          // The atlas bulbs are intentionally dim; only the active lamp emits light.
          const drawActiveLamp = (x: number, y: number, state: 'green' | 'yellow' | 'red'): void => {
            if (state === 'red') {
              batch.drawRegion(lightHaloUV, x, y, 10, 10, 0, 0.5, 0.5, 1.0, 0.15, 0.16, 0.72 * pulse);
            } else if (state === 'yellow') {
              batch.drawRegion(lightHaloUV, x, y, 10, 10, 0, 0.5, 0.5, 1.0, 0.65, 0.08, 0.78 * pulse);
            } else {
              batch.drawRegion(lightHaloUV, x, y, 10, 10, 0, 0.5, 0.5, 0.12, 1.0, 0.32, 0.78 * pulse);
            }
          };

          const lampOffset = (state: 'green' | 'yellow' | 'red'): number =>
            state === 'red' ? -6 : state === 'yellow' ? 0 : 6;
          const ewY = [cy - 28, cy + 28];
          const nsX = [cx - 28, cx + 28];
          for (const y of ewY) {
            drawActiveLamp(cx + lampOffset(lights.ew), y, lights.ew);
          }
          for (const x of nsX) {
            drawActiveLamp(x, cy + lampOffset(lights.ns), lights.ns);
          }
        }
      }
    }
  }

  // =========================================================================
  // SUB-RENDERER 7: Trees, Parks & Atmospheric Night Fireflies
  // =========================================================================
  private renderParksAndNature(
    batch: SpriteBatch,
    atlas: TextureAtlas,
    whiteUV: UVCoords,
    lightHaloUV: UVCoords,
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    minC: number,
    maxC: number,
    minR: number,
    maxR: number,
    time: number,
    isNight: boolean
  ): void {
    const S = this.tileSize;
    const treeLargeUV = atlas.getUVs('tree_large');
    const treeBushUV = atlas.getUVs('tree_bush');

    // 1. Trees and Shrubs with swaying wind and contact ground shadows
    for (const tree of this.trees) {
      if (
        tree.x >= bounds.minX - 50 &&
        tree.x <= bounds.maxX + 50 &&
        tree.y >= bounds.minY - 50 &&
        tree.y <= bounds.maxY + 50
      ) {
        // Ground contact shadow
        batch.drawRegion(
          whiteUV,
          tree.x + 4,
          tree.y + tree.size * 0.26,
          tree.size * 0.62,
          tree.size * 0.18,
          0,
          0.5,
          0.5,
          0,
          0,
          0,
          tree.isLarge ? 0.28 : 0.2
        );

        // Wind sway
        const sway =
          Math.sin(time * 2.0 + tree.x * 0.05 + tree.y * 0.03) * 0.08 +
          Math.cos(time * 3.1 + tree.y * 0.04) * 0.04;
        const breathe = 1.0 + Math.sin(time * 1.6 + tree.x * 0.08) * 0.025;

        const uv = tree.isLarge ? treeLargeUV : treeBushUV;
        const s = tree.size * breathe;

        batch.drawRegion(uv, tree.x, tree.y, s, s, sway, 0.5, 0.5, 1, 1, 1, 1);
      }
    }

    // 2. Animated Park Features (Fountains, Ponds, Lanterns)
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const type = this.getTile(c, r);
        const cx = c * S + S / 2;
        const cy = r * S + S / 2;

        if (type === TileType.GRASS) {
          const relC = (c - 2) % 8;
          const relR = (r - 2) % 8;
          const parkBlockC = Math.floor((c - 2) / 8);
          const parkBlockR = Math.floor((r - 2) / 8);
          const parkStyle = Math.abs((parkBlockC * 3 + parkBlockR * 7) % 3);

          // Animated Fountain Centerpiece
          if (relC === 2 && relR === 2 && parkStyle === 0) {
            // Expanding water ripple wave rings
            const r1 = (time * 1.4) % 1.0;
            const r2 = (time * 1.4 + 0.5) % 1.0;
            batch.drawRegion(lightHaloUV, cx, cy, 14 + r1 * 24, 14 + r1 * 24, 0, 0.5, 0.5, 0.3, 0.85, 1.0, (1.0 - r1) * 0.65);
            batch.drawRegion(lightHaloUV, cx, cy, 14 + r2 * 24, 14 + r2 * 24, 0, 0.5, 0.5, 0.3, 0.85, 1.0, (1.0 - r2) * 0.65);

            // Water spray sparkle glints
            const glintPulse = 1.0 + Math.sin(time * 6.0) * 0.25;
            batch.drawRegion(whiteUV, cx, cy, 6 * glintPulse, 6 * glintPulse, time * 2.0, 0.5, 0.5, 1.0, 1.0, 1.0, 0.9);

            // Nighttime underwater pool glow
            if (isNight) {
              batch.drawRegion(lightHaloUV, cx, cy, 54, 54, 0, 0.5, 0.5, 0.15, 0.75, 1.0, 0.55);
            }
          }

          // Park Walkway Lanterns: cast warm light on stone paths at night
          if (
            (relC === 2 && (relR === 0 || relR === 4)) ||
            (relR === 2 && (relC === 0 || relC === 4))
          ) {
            const haloAlpha = isNight ? 0.68 : 0.22;
            const haloSize = isNight ? 85 : 48;
            batch.drawRegion(lightHaloUV, cx, cy, haloSize, haloSize, 0, 0.5, 0.5, 1.0, 0.85, 0.45, haloAlpha);
          }

          // 3. Nighttime Fireflies (Licurici) in Parks
          if (isNight && relC >= 0 && relC <= 4 && relR >= 0 && relR <= 4) {
            const flySeed = c * 73 + r * 97;
            for (let f = 0; f < 2; f++) {
              const fSpeed = 1.5 + (f * 0.4);
              const fTime = time * fSpeed + flySeed + f * 17;
              const fx = cx + Math.sin(fTime * 1.8) * 22 + Math.cos(fTime * 0.9) * 10;
              const fy = cy + Math.cos(fTime * 1.4) * 22 + Math.sin(fTime * 0.7) * 10;
              const fPulse = Math.max(0, Math.sin(fTime * 3.2));

              if (fPulse > 0.15) {
                batch.drawRegion(
                  lightHaloUV,
                  fx,
                  fy,
                  9 + fPulse * 7,
                  9 + fPulse * 7,
                  0,
                  0.5,
                  0.5,
                  0.75,
                  1.0,
                  0.3,
                  fPulse * 0.8
                );
              }
            }
          }
        } else if (type === TileType.PARKING) {
          // Parking Lot Night Floodlights on median planter islands
          const relC = (c - 2) % 8;
          const relR = (r - 2) % 8;
          const isParkingLightSpot =
            (relC === 1 && relR === 4) ||
            (relC === 3 && relR === 4) ||
            ((relC === 0 || relC === 4) && (relR === 0 || relR === 4));

          if (isParkingLightSpot && isNight) {
            // Dual high-intensity floodlight pools
            batch.drawRegion(lightHaloUV, cx, cy, 140, 100, 0, 0.5, 0.5, 0.95, 0.95, 0.85, 0.52);
            batch.drawRegion(lightHaloUV, cx, cy, 70, 70, 0, 0.5, 0.5, 1.0, 1.0, 0.95, 0.75);
          }
        }
      }
    }
  }

  // =========================================================================
  // SUB-RENDERER 8: Realistic Multi-Height Buildings, Parapets & Roof Clutter
  // =========================================================================
  private renderBuildings(
    batch: SpriteBatch,
    atlas: TextureAtlas,
    whiteUV: UVCoords,
    lightHaloUV: UVCoords,
    minC: number,
    maxC: number,
    minR: number,
    maxR: number,
    time: number,
    isNight: boolean
  ): void {
    const S = this.tileSize;

    const bldUV = atlas.getUVs('building');
    const coolWhiteUV = atlas.getUVs('roof_cool_white');
    const terracottaUV = atlas.getUVs('roof_terracotta');
    const gravelUV = atlas.getUVs('roof_gravel');
    const metalUV = atlas.getUVs('roof_metal');
    const waterTowerUV = atlas.getUVs('roof_watertower');
    const elevatorPenthouseUV = atlas.getUVs('roof_elevator_penthouse');
    const heliUV = atlas.getUVs('roof_helipad');
    const skyUV = atlas.getUVs('roof_skylight');
    const hvacUV = atlas.getUVs('roof_hvac_industrial');
    const solarUV = atlas.getUVs('roof_solar');
    const fanUV = atlas.getUVs('ac_vent_fan');
    const hospUV = atlas.getUVs('roof_hospital');
    const polUV = atlas.getUVs('roof_police');
    const antennaUV = atlas.getUVs('roof_antenna');
    const acUnitUV = atlas.getUVs('roof_ac_unit');

    // Helper: calculate deterministic building height level (1 to 4 floors)
    const getBuildingHeight = (blockC: number, blockR: number): number => {
      if (this.isHospitalBlock(blockC, blockR) || this.isPoliceBlock(blockC, blockR)) return 3;
      return 1 + Math.abs((blockC * 11 + blockR * 17) % 4);
    };

    // Subpass 8A: Multi-tier dynamic drop shadows based on building height
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (this.getTile(c, r) === TileType.BUILDING) {
          const x = c * S;
          const y = r * S;
          const blockC = Math.floor((c - 2) / 8);
          const blockR = Math.floor((r - 2) / 8);
          const heightLevel = getBuildingHeight(blockC, blockR);

          const isEastEdge = this.getTile(c + 1, r) !== TileType.BUILDING;
          const isSouthEdge = this.getTile(c, r + 1) !== TileType.BUILDING;

          const shadowDepthE = 10 + heightLevel * 6; // 16px to 34px
          const shadowDepthS = 12 + heightLevel * 7; // 19px to 40px

          if (isEastEdge) {
            // Soft outer ambient shadow
            batch.drawRegion(whiteUV, x + S + shadowDepthE * 0.5, y + S / 2 + 5, shadowDepthE, S + 6, 0, 0.5, 0.5, 0, 0, 0, 0.22);
            // Crisp inner shadow
            batch.drawRegion(whiteUV, x + S + shadowDepthE * 0.35, y + S / 2 + 5, shadowDepthE * 0.7, S, 0, 0.5, 0.5, 0, 0, 0, 0.35);
          }
          if (isSouthEdge) {
            // Soft outer ambient shadow
            batch.drawRegion(whiteUV, x + S / 2 + 5, y + S + shadowDepthS * 0.5, S + 6, shadowDepthS, 0, 0.5, 0.5, 0, 0, 0, 0.22);
            // Crisp inner shadow
            batch.drawRegion(whiteUV, x + S / 2 + 5, y + S + shadowDepthS * 0.35, S, shadowDepthS * 0.7, 0, 0.5, 0.5, 0, 0, 0, 0.35);
          }
          if (isEastEdge && isSouthEdge) {
            batch.drawRegion(whiteUV, x + S + shadowDepthE * 0.5, y + S + shadowDepthS * 0.5, shadowDepthE, shadowDepthS, 0, 0.5, 0.5, 0, 0, 0, 0.38);
          }
        }
      }
    }

    // Subpass 8B: Roof Decks, Parapets, Night Window Lighting & Rooftop Clutter
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (this.getTile(c, r) === TileType.BUILDING) {
          const x = c * S;
          const y = r * S;
          const relC = (c - 2) % 8;
          const relR = (r - 2) % 8;
          const blockC = Math.floor((c - 2) / 8);
          const blockR = Math.floor((r - 2) / 8);
          const style = Math.abs((blockC * 7 + blockR * 13) % 4);
          const heightLevel = getBuildingHeight(blockC, blockR);

          // 1. Realistic Roof Deck Slab Material
          let deckUV = bldUV;
          if (this.isHospitalBlock(blockC, blockR) || this.isPoliceBlock(blockC, blockR)) {
            deckUV = bldUV;
          } else if (style === 0) {
            deckUV = coolWhiteUV; // Modern Commercial White Membrane
          } else if (style === 1) {
            deckUV = metalUV; // Modern Standing-Seam Slate/Navy Metal
          } else if (style === 2) {
            deckUV = terracottaUV; // Classical Residential Terracotta
          } else {
            deckUV = gravelUV; // Industrial Pea-Gravel Deck
          }
          batch.drawRegion(deckUV, x + S / 2, y + S / 2, S, S, 0, 0.5, 0.5, 1, 1, 1, 1);

          // 2. Parapet Cornice Edges with Coping Stone Joints
          const isNorthEdge = this.getTile(c, r - 1) !== TileType.BUILDING;
          const isWestEdge = this.getTile(c - 1, r) !== TileType.BUILDING;
          const isSouthEdge = this.getTile(c, r + 1) !== TileType.BUILDING;
          const isEastEdge = this.getTile(c + 1, r) !== TileType.BUILDING;

          if (isNorthEdge) {
            // Sunlit north parapet highlight
            batch.drawRegion(whiteUV, x + S / 2, y + 2, S, 4, 0, 0.5, 0.5, 0.48, 0.58, 0.68, 0.95);
            // Coping stone division joints
            for (let j = 16; j < S; j += 16) {
              batch.drawRegion(whiteUV, x + j, y + 2, 1.5, 4, 0, 0.5, 0.5, 0.15, 0.18, 0.22, 0.8);
            }
            // Inner deck ambient shadow cast south
            batch.drawRegion(whiteUV, x + S / 2, y + 6, S, 4, 0, 0.5, 0.5, 0, 0, 0, 0.35);
          }
          if (isWestEdge) {
            // Sunlit west parapet highlight
            batch.drawRegion(whiteUV, x + 2, y + S / 2, 4, S, 0, 0.5, 0.5, 0.48, 0.58, 0.68, 0.95);
            // Coping stone joints
            for (let j = 16; j < S; j += 16) {
              batch.drawRegion(whiteUV, x + 2, y + j, 4, 1.5, 0, 0.5, 0.5, 0.15, 0.18, 0.22, 0.8);
            }
            // Inner deck shadow cast east
            batch.drawRegion(whiteUV, x + 6, y + S / 2, 4, S, 0, 0.5, 0.5, 0, 0, 0, 0.35);
          }
          if (isSouthEdge) {
            // Shaded south parapet bevel
            batch.drawRegion(whiteUV, x + S / 2, y + S - 2, S, 4, 0, 0.5, 0.5, 0.08, 0.10, 0.13, 0.95);
          }
          if (isEastEdge) {
            // Shaded east parapet bevel
            batch.drawRegion(whiteUV, x + S - 2, y + S / 2, 4, S, 0, 0.5, 0.5, 0.08, 0.10, 0.13, 0.95);
          }

          // 3. Realistic Building Edge Windows & Night Lighting
          // At night, exterior building walls have glowing lit windows spilling light onto sidewalks
          if (isNorthEdge || isSouthEdge || isWestEdge || isEastEdge) {
            const edgeSeed = c * 59 + r * 83;
            const isCommercial = style === 0 || style === 1;
            const windowColor: [number, number, number] = isCommercial
              ? [0.65, 0.9, 1.0] // Fluorescent office cyan
              : [1.0, 0.85, 0.4]; // Cozy warm residential amber

            if (isNorthEdge) {
              for (let w = 10; w <= S - 10; w += 15) {
                const isLit = (edgeSeed + w) % 3 !== 0;
                if (isNight && isLit) {
                  batch.drawRegion(whiteUV, x + w, y - 1, 8, 2.5, 0, 0.5, 0.5, ...windowColor, 0.85);
                  batch.drawRegion(lightHaloUV, x + w, y - 4, 18, 14, 0, 0.5, 0.5, ...windowColor, 0.35);
                }
              }
            }
            if (isSouthEdge) {
              for (let w = 10; w <= S - 10; w += 15) {
                const isLit = (edgeSeed + w * 2) % 3 !== 0;
                if (isNight && isLit) {
                  batch.drawRegion(whiteUV, x + w, y + S + 1, 8, 2.5, 0, 0.5, 0.5, ...windowColor, 0.85);
                  batch.drawRegion(lightHaloUV, x + w, y + S + 4, 18, 14, 0, 0.5, 0.5, ...windowColor, 0.35);
                }
              }
            }
            if (isWestEdge) {
              for (let w = 10; w <= S - 10; w += 15) {
                const isLit = (edgeSeed + w * 3) % 3 !== 0;
                if (isNight && isLit) {
                  batch.drawRegion(whiteUV, x - 1, y + w, 2.5, 8, 0, 0.5, 0.5, ...windowColor, 0.85);
                  batch.drawRegion(lightHaloUV, x - 4, y + w, 14, 18, 0, 0.5, 0.5, ...windowColor, 0.35);
                }
              }
            }
            if (isEastEdge) {
              for (let w = 10; w <= S - 10; w += 15) {
                const isLit = (edgeSeed + w * 4) % 3 !== 0;
                if (isNight && isLit) {
                  batch.drawRegion(whiteUV, x + S + 1, y + w, 2.5, 8, 0, 0.5, 0.5, ...windowColor, 0.85);
                  batch.drawRegion(lightHaloUV, x + S + 4, y + w, 14, 18, 0, 0.5, 0.5, ...windowColor, 0.35);
                }
              }
            }
          }

          // 4. Rooftop Secondary Architectural Structures
          if (!this.isHospitalBlock(blockC, blockR) && !this.isPoliceBlock(blockC, blockR)) {
            if (relC === 1 && relR === 1) {
              // Raised elevator penthouse bulkhead
              batch.drawRegion(elevatorPenthouseUV, x + S / 2, y + S / 2, S, S, 0, 0.5, 0.5, 1, 1, 1, 1);
            } else if (relC === 3 && relR === 1) {
              if (style === 2 || style === 3) {
                // Classic cedar water tower
                batch.drawRegion(waterTowerUV, x + S / 2, y + S / 2, S, S, 0, 0.5, 0.5, 1, 1, 1, 1);
              } else {
                // Commercial AC condenser unit
                batch.drawRegion(acUnitUV, x + S / 2, y + S / 2, S, S, 0, 0.5, 0.5, 1, 1, 1, 1);
              }
            } else if (relC === 1 && relR === 3 && heightLevel >= 3) {
              // Tall communication antenna mast on high-rise buildings
              batch.drawRegion(antennaUV, x + S / 2, y + S / 2, S, S, 0, 0.5, 0.5, 1, 1, 1, 1);
              // Pulsing red obstruction light on mast
              if (isNight) {
                const mastFlash = Math.sin(time * 3.5 + blockC) > 0.2 ? 1.0 : 0.0;
                if (mastFlash > 0) {
                  batch.drawRegion(lightHaloUV, x + S / 2, y + S / 2, 22, 22, 0, 0.5, 0.5, 1.0, 0.1, 0.1, 0.9);
                }
              }
            }
          }

          // 5. Rooftop Centerpiece (Hospital, Police, Helipad, Atrium, HVAC, Solar)
          if (relC === 2 && relR === 2) {
            if (this.isHospitalBlock(blockC, blockR)) {
              batch.drawRegion(hospUV, x + S / 2, y + S / 2, S, S, 0, 0.5, 0.5, 1, 1, 1, 1);
              // Flashing corner red emergency beacons
              const hospFlash = Math.sin(time * 4.0) > 0 ? 1.0 : 0.0;
              if (isNight && hospFlash > 0) {
                batch.drawRegion(lightHaloUV, x + 6, y + 6, 20, 20, 0, 0.5, 0.5, 1.0, 0.15, 0.15, 0.8);
                batch.drawRegion(lightHaloUV, x + S - 6, y + S - 6, 20, 20, 0, 0.5, 0.5, 1.0, 0.15, 0.15, 0.8);
              }
            } else if (this.isPoliceBlock(blockC, blockR)) {
              batch.drawRegion(polUV, x + S / 2, y + S / 2, S, S, 0, 0.5, 0.5, 1, 1, 1, 1);
              // Alternating tactical blue/red strobe beacons
              const copFlash = Math.sin(time * 5.0) > 0;
              if (isNight) {
                const beaconColor = copFlash ? [0.1, 0.5, 1.0] : [1.0, 0.15, 0.15];
                batch.drawRegion(lightHaloUV, x + S / 2, y + S / 2, 40, 40, 0, 0.5, 0.5, beaconColor[0], beaconColor[1], beaconColor[2], 0.7);
              }
            } else {
              if (style === 0) {
                // Glass Skylight Atrium
                batch.drawRegion(skyUV, x + S / 2, y + S / 2, S, S, 0, 0.5, 0.5, 1, 1, 1, 1);
                // Warm ambient illumination from atrium at night
                if (isNight) {
                  batch.drawRegion(lightHaloUV, x + S / 2, y + S / 2, 60, 60, 0, 0.5, 0.5, 0.9, 0.8, 0.4, 0.55);
                }
              } else if (style === 1) {
                // Helipad with corner aviation beacons
                batch.drawRegion(heliUV, x + S / 2, y + S / 2, S, S, 0, 0.5, 0.5, 1, 1, 1, 1);
                if (isNight) {
                  batch.drawRegion(lightHaloUV, x + S / 2, y + S / 2, 44, 44, 0, 0.5, 0.5, 0.9, 0.8, 0.2, 0.35);
                }
              } else if (style === 2) {
                // Rooftop Solar Farm
                batch.drawRegion(solarUV, x + S / 2, y + S / 2, S, S, 0, 0.5, 0.5, 1, 1, 1, 1);
              } else {
                // Heavy Industrial HVAC with animated dual spinning fans
                batch.drawRegion(hvacUV, x + S / 2, y + S / 2, S, S, 0, 0.5, 0.5, 1, 1, 1, 1);
                const fanRot = time * 7.5;
                batch.drawRegion(fanUV, x + 20, y + S / 2, 17, 17, fanRot, 0.5, 0.5, 0.85, 0.85, 0.85, 0.95);
                batch.drawRegion(fanUV, x + 44, y + S / 2, 17, 17, -fanRot, 0.5, 0.5, 0.85, 0.85, 0.85, 0.95);
              }
            }
          }

          // 6. Nighttime Red Aviation Obstruction Warning Beacons for high-rise towers
          if (isNight && heightLevel >= 3 && relC === 3 && relR === 3) {
            const beaconCycle = Math.sin(time * 2.8 + blockC * 3 + blockR * 7);
            if (beaconCycle > 0.4) {
              batch.drawRegion(lightHaloUV, x + S - 6, y + 6, 20, 20, 0, 0.5, 0.5, 1.0, 0.1, 0.1, 0.9);
              batch.drawRegion(whiteUV, x + S - 6, y + 6, 3, 3, 0, 0.5, 0.5, 1.0, 0.9, 0.9, 1.0);
            }
          }
        }
      }
    }
  }

  // =========================================================================
  // SUB-RENDERER 9: Atmospheric Cloud Shadows
  // =========================================================================
  private renderAtmosphere(
    batch: SpriteBatch,
    atlas: TextureAtlas,
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    time: number
  ): void {
    const cloudUV = atlas.getUVs('cloud_shadow');
    const totalW = this.width;
    const totalH = this.height;

    for (let i = 0; i < 4; i++) {
      const cSpeed = 22 + i * 4;
      const cDistX = (time * cSpeed + i * 650) % (totalW + 600) - 300;
      const cDistY = (time * (cSpeed * 0.6) + i * 500) % (totalH + 600) - 300;

      if (
        cDistX >= bounds.minX - 450 &&
        cDistX <= bounds.maxX + 450 &&
        cDistY >= bounds.minY - 450 &&
        cDistY <= bounds.maxY + 450
      ) {
        batch.drawRegion(
          cloudUV,
          cDistX,
          cDistY,
          380 + i * 60,
          260 + i * 40,
          0.2,
          0.5,
          0.5,
          0,
          0,
          0,
          0.14
        );
      }
    }
  }

  private isWater(c: number, r: number): boolean {
    return this.getTile(c, r) === TileType.WATER;
  }

  // Get all solid building boxes within a search radius
  getNearbyObstacles(
    cx: number,
    cy: number,
    radius: number
  ): Array<{ x: number; y: number; width: number; height: number }> {
    const obstacles: Array<{ x: number; y: number; width: number; height: number }> = [];
    const minC = Math.max(0, Math.floor((cx - radius) / this.tileSize));
    const maxC = Math.min(this.cols - 1, Math.ceil((cx + radius) / this.tileSize));
    const minR = Math.max(0, Math.floor((cy - radius) / this.tileSize));
    const maxR = Math.min(this.rows - 1, Math.ceil((cy + radius) / this.tileSize));

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (this.isSolid(c, r) && !this.isRoundaboutCenter(c, r)) {
          obstacles.push({
            x: c * this.tileSize,
            y: r * this.tileSize,
            width: this.tileSize,
            height: this.tileSize
          });
        }
      }
    }
    return obstacles;
  }
}
