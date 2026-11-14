export enum TileType {
  GRASS = 0,
  ROAD_HORIZONTAL = 1,
  ROAD_VERTICAL = 2,
  ROAD_INTERSECTION = 3,
  SIDEWALK = 4,
  BUILDING = 5,
  WATER = 6,
  ROUNDABOUT = 9,
  PARKING = 10
}

export interface SkidMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
  width: number;
}
