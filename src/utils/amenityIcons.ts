// src/utils/amenityIcons.ts
import {
  Sparkles,
  Wifi,
  Car,
  Coffee,
  Utensils,
  Armchair,
  Layers,
  Droplets,
  ShowerHead,
  Warehouse,
  Wind,
  Users,
  ShoppingBag,
  Bath,
  Sun,
  Moon,
  Zap,
  Lock,
  ShieldCheck,
  Home,
  Building,
  Umbrella,
  Dumbbell,
  GraduationCap,
  Lightbulb,
  TreePalm,
  DoorOpen,
  Grid3x3,
  Trophy,
  Snowflake,
  type LucideIcon,
} from 'lucide-react';

/**
 * Curated list of icons the admin can pick from when creating/editing
 * an amenity. Keep this focused — 2000 Lucide icons is too many for a
 * dropdown.
 */
export const LUCIDE_ICON_OPTIONS: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: 'Sparkles',      label: 'Sparkles (default)',  Icon: Sparkles },
  { value: 'Layers',        label: 'Layers / Surface',    Icon: Layers },
  { value: 'Grid3x3',       label: 'Grid / Court',        Icon: Grid3x3 },
  { value: 'Warehouse',     label: 'Indoor / Warehouse',  Icon: Warehouse },
  { value: 'Home',          label: 'Covered / Home',      Icon: Home },
  { value: 'Building',      label: 'Building',            Icon: Building },
  { value: 'Umbrella',      label: 'Shaded / Umbrella',   Icon: Umbrella },
  { value: 'Sun',           label: 'Outdoor / Sun',       Icon: Sun },
  { value: 'Moon',          label: 'Night Play',          Icon: Moon },
  { value: 'Zap',           label: 'Lighting / Power',    Icon: Zap },
  { value: 'Lightbulb',     label: 'Lightbulb',           Icon: Lightbulb },
  { value: 'Wind',          label: 'Air Conditioned',     Icon: Wind },
  { value: 'Snowflake',     label: 'Cooling',             Icon: Snowflake },
  { value: 'Wifi',          label: 'Wi-Fi / Internet',    Icon: Wifi },
  { value: 'Bath',          label: 'Restroom / Bath',     Icon: Bath },
  { value: 'ShowerHead',    label: 'Showers',             Icon: ShowerHead },
  { value: 'Droplets',      label: 'Water Station',       Icon: Droplets },
  { value: 'DoorOpen',      label: 'Comfort Room',        Icon: DoorOpen },
  { value: 'Lock',          label: 'Lockers',             Icon: Lock },
  { value: 'ShieldCheck',   label: 'Security / CCTV',     Icon: ShieldCheck },
  { value: 'Car',           label: 'Parking',             Icon: Car },
  { value: 'Armchair',      label: 'Seating / Waiting',   Icon: Armchair },
  { value: 'Coffee',        label: 'Café / Drinks',       Icon: Coffee },
  { value: 'Utensils',      label: 'Food',                Icon: Utensils },
  { value: 'ShoppingBag',   label: 'Pro Shop',            Icon: ShoppingBag },
  { value: 'Dumbbell',      label: 'Equipment Rental',    Icon: Dumbbell },
  { value: 'GraduationCap', label: 'Coaching',            Icon: GraduationCap },
  { value: 'Users',         label: 'Open Play / Group',   Icon: Users },
  { value: 'Trophy',        label: 'Tournament',          Icon: Trophy },
  { value: 'TreePalm',      label: 'Outdoor / Nature',    Icon: TreePalm },
];

/**
 * Lookup map for rendering. Given an amenity's `icon` string, returns
 * the Lucide component.
 */
export const LUCIDE_ICONS: Record<string, LucideIcon> =
  Object.fromEntries(LUCIDE_ICON_OPTIONS.map((o) => [o.value, o.Icon]));

/**
 * Legacy fallback: given an amenity NAME, guess an icon.
 * Used only when an amenity has no explicit icon stored.
 */
const NAME_FALLBACK_MAP: Record<string, LucideIcon> = {
  wifi: Wifi,
  internet: Wifi,
  'piso wi-fi': Wifi,
  'piso wifi': Wifi,
  parking: Car,
  'free parking': Car,
  'own parking': Car,
  cafe: Coffee,
  'in-house cafe': Coffee,
  refreshments: Coffee,
  drinks: Coffee,
  food: Utensils,
  'waiting area': Armchair,
  'shaded waiting area': Armchair,
  'spectator seating': Armchair,
  seating: Armchair,
  benches: Armchair,
  indoor: Warehouse,
  outdoor: Sun,
  covered: Home,
  'silica sand court': Layers,
  'silica court': Layers,
  'silica sand finish': Layers,
  'premium court': Sparkles,
  'table tennis': Sparkles,
  'air conditioned': Wind,
  'air conditioning': Wind,
  ac: Wind,
  fan: Wind,
  showers: ShowerHead,
  shower: ShowerHead,
  'water station': Droplets,
  drinking: Droplets,
  restroom: Bath,
  cr: Bath,
  'comfort room': Bath,
  'comfort rooms': Bath,
  bathroom: Bath,
  lighted: Zap,
  lighting: Zap,
  'well-lit': Zap,
  'night play': Moon,
  'pro shop': ShoppingBag,
  shop: ShoppingBag,
  'paddle rental': Sparkles,
  rental: Sparkles,
  'paddle club': Users,
  lockers: Lock,
  locker: Lock,
  security: ShieldCheck,
  cctv: ShieldCheck,
  'open play': Users,
  'group play': Users,
};

export function getAmenityIcon(name: string): LucideIcon {
  const key = name.trim().toLowerCase();
  return NAME_FALLBACK_MAP[key] ?? Sparkles;
}

/**
 * Preferred accessor: given an AmenityItem, render the stored icon if
 * present, otherwise fall back to the name-based lookup.
 */
export function getAmenityIconForItem(item: { name: string; icon?: string }): LucideIcon {
  if (item.icon && LUCIDE_ICONS[item.icon]) return LUCIDE_ICONS[item.icon];
  return getAmenityIcon(item.name);
}