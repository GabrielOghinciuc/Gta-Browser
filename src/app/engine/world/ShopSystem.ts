import { SpriteBatch } from '../graphics/SpriteBatch';
import { TextureAtlas } from '../graphics/TextureAtlas';
import { CityMap } from './CityMap';
import { TileType } from '../types';

export type ShopType =
  | 'ammu_nation'
  | 'burger_shot'
  | 'pay_n_spray'
  | 'bank'
  | 'pharmacy'
  | 'hospital'
  | 'police_station'
  | 'gas_station'
  | 'car_dealer'
  | 'donut_shop'
  | 'nightclub'
  | 'fire_station'
  | 'school'
  | 'bar';

export interface Shop {
  id: number;
  type: ShopType;
  name: string;
  tagline: string;
  tileC: number;
  tileR: number;
  doorX: number;
  doorY: number;
  color: [number, number, number];
  doorSide: 'north' | 'south' | 'east' | 'west';
}

export class ShopSystem {
  readonly shops: Shop[] = [];

  constructor(map: CityMap) {
    this.generateShops(map);
  }

  private generateShops(map: CityMap): void {
    const S = map.tileSize;
    let shopId = 1;

    // 1. Explicit Hospitals (4 City Districts)
    const hospitals = [
      { blockC: 1, blockR: 1, name: 'CENTRAL CITY GENERAL HOSPITAL', tagline: 'Emergency Trauma Ward & Recovery' },
      { blockC: 11, blockR: 2, name: 'SAINT JUDE MEDICAL PAVILION', tagline: 'Trauma ICU & Advanced Surgery' },
      { blockC: 3, blockR: 11, name: 'SOUTH BAY MEMORIAL HOSPITAL', tagline: 'County Health Clinic & Care' },
      { blockC: 12, blockR: 12, name: 'BIO-TECH RESEARCH CLINIC', tagline: 'Experimental Meds & Stims' }
    ];

    for (const hosp of hospitals) {
      const c = hosp.blockC * 8 + 4; // South-facing door
      const r = hosp.blockR * 8 + 6;
      this.shops.push({
        id: shopId++,
        type: 'hospital',
        name: hosp.name,
        tagline: hosp.tagline,
        tileC: c,
        tileR: r,
        doorX: c * S + S / 2,
        doorY: (r + 1) * S + S / 2,
        color: [1.0, 0.22, 0.32],
        doorSide: 'south'
      });
    }

    // 2. Explicit Police Stations (4 City Districts)
    const policeStations = [
      { blockC: 4, blockR: 2, name: 'DOWNTOWN 1ST PRECINCT HQ', tagline: 'Bail Bonds, SWAT Kevlar & Wanted Cleared' },
      { blockC: 13, blockR: 4, name: 'FINANCIAL DISTRICT PRECINCT 4', tagline: 'Metro Patrol & Tactical Equipment' },
      { blockC: 2, blockR: 13, name: 'SOUTHSIDE METRO PRECINCT 7', tagline: 'Precinct Station & Armory' },
      { blockC: 10, blockR: 13, name: 'HARBOR INDUSTRIAL PRECINCT 9', tagline: 'Port Security & Police Cruisers' }
    ];

    for (const pol of policeStations) {
      const c = pol.blockC * 8 + 4;
      const r = pol.blockR * 8 + 6;
      this.shops.push({
        id: shopId++,
        type: 'police_station',
        name: pol.name,
        tagline: pol.tagline,
        tileC: c,
        tileR: r,
        doorX: c * S + S / 2,
        doorY: (r + 1) * S + S / 2,
        color: [0.15, 0.45, 1.0],
        doorSide: 'south'
      });
    }

    // 3. Explicit Fire Stations (3 City Districts)
    const fireStations = [
      { blockC: 6, blockR: 2, name: 'METRO FIRE DEPT - STATION 6', tagline: 'Hazard Gear, Fire Trucks & Extinguishers' },
      { blockC: 9, blockR: 11, name: 'INDUSTRIAL HARBOR FIRE HQ', tagline: 'Heavy Rescue & High-Pressure Foam' },
      { blockC: 2, blockR: 6, name: 'WESTSIDE FIRE BRIGADE 2', tagline: 'Firefighting Equipment & Thermal Suits' }
    ];

    for (const fire of fireStations) {
      const c = fire.blockC * 8 + 4;
      const r = fire.blockR * 8 + 6;
      this.shops.push({
        id: shopId++,
        type: 'fire_station',
        name: fire.name,
        tagline: fire.tagline,
        tileC: c,
        tileR: r,
        doorX: c * S + S / 2,
        doorY: (r + 1) * S + S / 2,
        color: [1.0, 0.28, 0.1],
        doorSide: 'south'
      });
    }

    // 4. Explicit Schools & Academies (3 City Districts)
    const schools = [
      { blockC: 3, blockR: 5, name: 'SAINT MARK PREPARATORY ACADEMY', tagline: 'Athletics, Sprint Coaching & Academic Grants' },
      { blockC: 11, blockR: 8, name: 'METRO CENTRAL HIGH SCHOOL', tagline: 'Gym Training, First Aid & Student Funds' },
      { blockC: 8, blockR: 2, name: 'EASTSIDE POLYTECHNIC INSTITUTE', tagline: 'Engineering Courses & Stamina Boosts' }
    ];

    for (const school of schools) {
      const c = school.blockC * 8 + 4;
      const r = school.blockR * 8 + 6;
      this.shops.push({
        id: shopId++,
        type: 'school',
        name: school.name,
        tagline: school.tagline,
        tileC: c,
        tileR: r,
        doorX: c * S + S / 2,
        doorY: (r + 1) * S + S / 2,
        color: [0.2, 0.8, 0.45],
        doorSide: 'south'
      });
    }

    // 5. Explicit Gas Stations (4 City Districts)
    const gasStations = [
      { blockC: 7, blockR: 5, name: 'OCTANE 99 HIGHWAY TRUCK STOP', tagline: 'Nitro Boost Injection & Fuel Tankers' },
      { blockC: 1, blockR: 9, name: 'RED STAR DIESEL & TANKERS', tagline: 'Commercial Heavy Fuel & Service Bay' },
      { blockC: 12, blockR: 6, name: 'TURBO CHARGE REPAIR & NOS DEPOT', tagline: 'Performance Tuning & Overhaul' },
      { blockC: 5, blockR: 12, name: 'SUNOCO EXPRESS GAS & MINI-MART', tagline: '24/7 Snacks, Repair & Refuel' }
    ];

    for (const gas of gasStations) {
      const c = gas.blockC * 8 + 4;
      const r = gas.blockR * 8 + 6;
      this.shops.push({
        id: shopId++,
        type: 'gas_station',
        name: gas.name,
        tagline: gas.tagline,
        tileC: c,
        tileR: r,
        doorX: c * S + S / 2,
        doorY: (r + 1) * S + S / 2,
        color: [1.0, 0.65, 0.0],
        doorSide: 'south'
      });
    }

    // 6. Explicit Nightclubs (3 City Districts)
    const nightclubs = [
      { blockC: 5, blockR: 9, name: 'NEON PARADISE ULTRA-CLUB', tagline: 'VIP Lounge, Syndicate Cash & Limos' },
      { blockC: 13, blockR: 8, name: 'CLUB ELYSIUM VIP LOUNGE', tagline: 'Exclusive Penthouse & Inferno Hotrods' },
      { blockC: 9, blockR: 4, name: 'THE VELVET ROPE LOUNGE', tagline: 'Underground Syndicate Deals & Luxury Cars' }
    ];

    for (const club of nightclubs) {
      const c = club.blockC * 8 + 4;
      const r = club.blockR * 8 + 6;
      this.shops.push({
        id: shopId++,
        type: 'nightclub',
        name: club.name,
        tagline: club.tagline,
        tileC: c,
        tileR: r,
        doorX: c * S + S / 2,
        doorY: (r + 1) * S + S / 2,
        color: [0.95, 0.1, 0.85],
        doorSide: 'south'
      });
    }

    // 7. Explicit Bars & Pubs (3 City Districts)
    const bars = [
      { blockC: 2, blockR: 8, name: 'THE RUSTY ANCHOR PUB', tagline: 'Cold Draught Beer, Whiskey & Street Rumors' },
      { blockC: 8, blockR: 12, name: 'SHAMROCK IRISH TAVERN', tagline: 'Irish Stout, Bourbon & Brawlers Pit' },
      { blockC: 12, blockR: 10, name: 'OUTLAW BIKER SALOON', tagline: 'Tough Drinks, Brass Knuckles & Jukebox' }
    ];

    for (const bar of bars) {
      const c = bar.blockC * 8 + 4;
      const r = bar.blockR * 8 + 6;
      this.shops.push({
        id: shopId++,
        type: 'bar',
        name: bar.name,
        tagline: bar.tagline,
        tileC: c,
        tileR: r,
        doorX: c * S + S / 2,
        doorY: (r + 1) * S + S / 2,
        color: [0.9, 0.5, 0.1],
        doorSide: 'south'
      });
    }

    // 8. Diverse Commercial Retail Stores & Services
    const retailDefinitions: Array<{ type: ShopType; name: string; tagline: string; color: [number, number, number] }> = [
      { type: 'ammu_nation', name: 'AMMU-NATION', tagline: 'Guns & Ammo Supply', color: [1.0, 0.25, 0.25] },
      { type: 'burger_shot', name: 'BURGER SHOT', tagline: 'Fast Food +100 HP', color: [1.0, 0.7, 0.15] },
      { type: 'pay_n_spray', name: 'PAY N SPRAY', tagline: 'Auto Repair & Clear Wanted', color: [0.2, 0.6, 1.0] },
      { type: 'gas_station', name: 'OCTANE 99 GAS & TUNE', tagline: 'Nitro Boost Injection & Overhaul', color: [1.0, 0.6, 0.0] },
      { type: 'bank', name: 'FIRST CITY BANK', tagline: 'Heist +$50,000 Cash', color: [1.0, 0.85, 0.2] },
      { type: 'pharmacy', name: 'CITY PHARMACY', tagline: 'Medical Clinic +100 HP', color: [0.2, 0.95, 0.8] },
      { type: 'car_dealer', name: 'LUXURY MOTOR IMPORTS', tagline: 'Exotic Supercars Showroom', color: [0.65, 0.2, 0.95] },
      { type: 'donut_shop', name: "RUSTY'S DONUTS & COFFEE", tagline: 'Fresh Glazed Donuts & Cop Pacifier', color: [0.95, 0.4, 0.7] },
      { type: 'bar', name: 'LOCAL WATERHOLE TAVERN', tagline: 'Draught Beer & Whiskey', color: [0.9, 0.5, 0.1] }
    ];

    // Scan for solid buildings that border a sidewalk to distribute retail shops across the city
    for (let r = 3; r < map.rows - 3; r += 3) {
      for (let c = 3; c < map.cols - 3; c += 3) {
        if (map.getTile(c, r) === TileType.BUILDING) {
          // Avoid placing retail on designated POI blocks
          const blockC = Math.floor((c - 2) / 8);
          const blockR = Math.floor((r - 2) / 8);
          if (
            map.isHospitalBlock(blockC, blockR) ||
            map.isPoliceBlock(blockC, blockR) ||
            map.isFireStationBlock(blockC, blockR) ||
            map.isSchoolBlock(blockC, blockR) ||
            map.isGasStationBlock(blockC, blockR) ||
            map.isNightclubBlock(blockC, blockR) ||
            map.isBarBlock(blockC, blockR)
          ) continue;

          // Check if spot already occupied
          const alreadyOccupied = this.shops.some(s => Math.hypot(s.doorX - (c * S + S / 2), s.doorY - (r * S + S / 2)) < S * 2);
          if (alreadyOccupied) continue;

          let doorSide: Shop['doorSide'] | null = null;
          let doorX = 0;
          let doorY = 0;

          if (map.getTile(c, r + 1) === TileType.SIDEWALK) {
            doorSide = 'south';
            doorX = c * S + S / 2;
            doorY = (r + 1) * S + S / 2;
          } else if (map.getTile(c, r - 1) === TileType.SIDEWALK) {
            doorSide = 'north';
            doorX = c * S + S / 2;
            doorY = (r - 1) * S + S / 2;
          } else if (map.getTile(c + 1, r) === TileType.SIDEWALK) {
            doorSide = 'east';
            doorX = (c + 1) * S + S / 2;
            doorY = r * S + S / 2;
          } else if (map.getTile(c - 1, r) === TileType.SIDEWALK) {
            doorSide = 'west';
            doorX = (c - 1) * S + S / 2;
            doorY = r * S + S / 2;
          }

          if (doorSide) {
            const def = retailDefinitions[(shopId - 1) % retailDefinitions.length];
            this.shops.push({
              id: shopId++,
              type: def.type,
              name: def.name,
              tagline: def.tagline,
              tileC: c,
              tileR: r,
              doorX,
              doorY,
              color: def.color,
              doorSide
            });

            if (this.shops.length >= 52) return;
          }
        }
      }
    }
  }

  getNearestShop(x: number, y: number, maxDist = 48): Shop | null {
    let nearest: Shop | null = null;
    let minDist = maxDist;

    for (const s of this.shops) {
      const d = Math.hypot(s.doorX - x, s.doorY - y);
      if (d < minDist) {
        minDist = d;
        nearest = s;
      }
    }

    return nearest;
  }

  render(batch: SpriteBatch, atlas: TextureAtlas, time = 0, isNight = false): void {
    const whiteUV = atlas.getUVs('white');
    const haloUV = atlas.getUVs('light_halo');
    const S = 64;

    for (const shop of this.shops) {
      const [r, g, b] = shop.color;
      const bldgCenterX = shop.tileC * S + S / 2;
      const bldgCenterY = shop.tileR * S + S / 2;

      // 1. Entrance Glow Mat / Ring on Sidewalk
      const pulse = 0.65 + 0.35 * Math.sin(time * 4.0 + shop.id);
      batch.drawRegion(
        haloUV,
        shop.doorX,
        shop.doorY,
        42,
        42,
        0,
        0.5,
        0.5,
        r,
        g,
        b,
        0.55 * pulse
      );

      // Entrance welcome line / threshold
      batch.drawRegion(
        whiteUV,
        shop.doorX,
        shop.doorY,
        22,
        6,
        shop.doorSide === 'east' || shop.doorSide === 'west' ? Math.PI / 2 : 0,
        0.5,
        0.5,
        r,
        g,
        b,
        0.9
      );

      // 2. Storefront Canopy / Awning on Building Edge
      let awningX = bldgCenterX;
      let awningY = bldgCenterY;
      let awningW = 48;
      let awningH = 14;

      if (shop.doorSide === 'south') {
        awningY = bldgCenterY + S / 2 - 6;
      } else if (shop.doorSide === 'north') {
        awningY = bldgCenterY - S / 2 + 6;
      } else if (shop.doorSide === 'east') {
        awningX = bldgCenterX + S / 2 - 6;
        awningW = 14;
        awningH = 48;
      } else if (shop.doorSide === 'west') {
        awningX = bldgCenterX - S / 2 + 6;
        awningW = 14;
        awningH = 48;
      }

      // Awning base
      batch.drawRegion(
        whiteUV,
        awningX,
        awningY,
        awningW,
        awningH,
        0,
        0.5,
        0.5,
        r * 0.85,
        g * 0.85,
        b * 0.85,
        1.0
      );

      // Neon sign glow (stronger at night)
      if (isNight) {
        batch.drawRegion(
          haloUV,
          awningX,
          awningY,
          awningW * 2.2,
          awningH * 2.8,
          0,
          0.5,
          0.5,
          r,
          g,
          b,
          0.7
        );
      }
    }
  }
}
