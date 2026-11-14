import { Component, input, output, computed } from '@angular/core';
import { UiWindowComponent, UiWindowTheme } from '../ui-window/ui-window.component';
import { Shop } from '../../engine/world/ShopSystem';

export interface ShopItem {
  type: string;
  cost: number;
  name: string;
  desc: string;
  badge: string;
}

@Component({
  selector: 'app-shop-dialog',
  standalone: true,
  imports: [UiWindowComponent],
  templateUrl: './shop-dialog.component.html',
  styleUrl: './shop-dialog.component.scss'
})
export class ShopDialogComponent {
  readonly shop = input.required<Shop>();
  readonly score = input<number>(0);

  readonly close = output<void>();
  readonly buyItem = output<ShopItem>();

  readonly shopTheme = computed<UiWindowTheme>(() => {
    return this.getShopTheme(this.shop().type);
  });

  readonly shopItems = computed<ShopItem[]>(() => {
    return this.getShopItems(this.shop().type);
  });

  onClose(): void {
    this.close.emit();
  }

  onBuy(item: ShopItem): void {
    this.buyItem.emit(item);
  }

  private getShopTheme(shopType: string): UiWindowTheme {
    switch (shopType) {
      case 'hospital':
      case 'ammu_nation':
        return 'crimson';
      case 'police_station':
      case 'pay_n_spray':
        return 'blue';
      case 'burger_shot':
      case 'gas_station':
      case 'bank':
        return 'amber';
      case 'pharmacy':
        return 'cyan';
      case 'car_dealer':
      case 'donut_shop':
      case 'nightclub':
        return 'purple';
      default:
        return 'cyan';
    }
  }

  private getShopItems(shopType: string): ShopItem[] {
    switch (shopType) {
      case 'ammu_nation':
        return [
          { type: 'pistol_ammo', cost: 50, name: '9MM PISTOL AMMO (+60)', desc: 'Standard 9x19mm parabellum box', badge: 'AMMO' },
          { type: 'uzi_ammo', cost: 100, name: 'UZI 9MM AMMO (+150)', desc: 'High-rate suppressed rounds', badge: 'RAPID' },
          { type: 'shotgun_ammo', cost: 120, name: '12-GAUGE BUCKSHOT (+30)', desc: 'Heavy spread assault shells', badge: 'BURST' },
          { type: 'rocket_ammo', cost: 300, name: 'RPG-7 ROCKETS (+5)', desc: 'High explosive anti-armor warheads', badge: 'HEAVY' },
          { type: 'armor', cost: 150, name: 'KEVLAR BODY ARMOR (100%)', desc: 'Ballistic vest with trauma plates', badge: 'ARMOR' }
        ];
      case 'burger_shot':
        return [
          { type: 'heal', cost: 25, name: 'BURGER VALUE MEAL', desc: '100% full health restore', badge: 'FOOD' },
          { type: 'armor', cost: 50, name: 'MEAT-LOVER COMBO', desc: 'Full health & 100% body armor', badge: 'COMBO' }
        ];
      case 'pay_n_spray':
        return [
          { type: 'respray', cost: 500, name: 'RESPRAY & VEHICLE OVERHAUL', desc: 'Repairs car to 100% & clears Wanted level', badge: 'SERVICE' }
        ];
      case 'bank':
        return [
          { type: 'heist', cost: 0, name: 'ROB VAULT CASH', desc: 'Loot +$50,000 cash (Triggers +2 Police Stars)', badge: 'HEIST' }
        ];
      case 'pharmacy':
        return [
          { type: 'heal', cost: 50, name: 'TRAUMA FIRST AID KIT', desc: 'Emergency medical restore to 100% health', badge: 'HEALTH' },
          { type: 'armor', cost: 100, name: 'TACTICAL COMBAT STIM', desc: 'Instant 100% armor enhancement', badge: 'STIM' }
        ];
      case 'hospital':
        return [
          { type: 'hospital_heal', cost: 75, name: 'EMERGENCY SURGERY & RECOVERY', desc: 'Full restoration: 100% health and 100% body armor', badge: 'SURGERY' },
          { type: 'armor', cost: 100, name: 'MEDEVAC COMBAT PLATES', desc: 'High-durability ballistic chest protection (100% armor)', badge: 'DEFENSE' }
        ];
      case 'police_station':
        return [
          { type: 'police_bribe', cost: 300, name: 'BRIBE PRECINCT CAPTAIN', desc: 'Dismiss all charges and instantly clear all Wanted stars', badge: 'BRIBE' },
          { type: 'police_kevlar', cost: 200, name: 'SWAT TACTICAL KEVLAR', desc: 'Heavy police assault body armor (100% armor)', badge: 'ARMOR' },
          { type: 'police_impound', cost: 450, name: 'RELEASE POLICE CRUISER', desc: 'Requisition an official police pursuit cruiser parked outside', badge: 'VEHICLE' }
        ];
      case 'gas_station':
        return [
          { type: 'gas_nitro', cost: 120, name: 'OCTANE-99 NITRO BOOST TUNE', desc: 'Repairs current vehicle to 100% and injects nitro propulsion', badge: 'NITRO' },
          { type: 'respray', cost: 70, name: 'SERVICE BAY REPAIR & WASH', desc: 'Complete engine overhaul and exterior restoration', badge: 'REPAIR' }
        ];
      case 'car_dealer':
        return [
          { type: 'car_viper', cost: 2000, name: 'VIPER GT TWIN-TURBO', desc: '550 KM/H yellow supercar delivered parked outside showroom', badge: 'SUPERCAR' },
          { type: 'car_stallion', cost: 1500, name: 'STALLION V8 MUSCLE', desc: 'High-torque supercharged muscle car delivered outside', badge: 'MUSCLE' }
        ];
      case 'donut_shop':
        return [
          { type: 'donut_glazed', cost: 15, name: 'BOX OF HOT GLAZED DONUTS', desc: 'Fresh sugary treats restoring +50 Health instantly', badge: 'DONUT' },
          { type: 'donut_combo', cost: 35, name: 'COFFEE & DONUT COP PACIFIER', desc: '100% Health restore and pacifies police (clears 1 Wanted star)', badge: 'PACIFY' }
        ];
      case 'nightclub':
        return [
          { type: 'club_drinks', cost: 500, name: 'VIP SYNDICATE LOUNGE ENTRY', desc: 'Underworld connection payout: collect +$2,500 syndicate cash', badge: 'PAYOUT' }
        ];
      default:
        return [];
    }
  }
}
