/**
 * Front doors — the little rooms you can push into from a landmark's detail
 * card. The Magic House has one floating front door with a dial on its
 * lintel: each room is a floor behind it, echoing its lore that the door
 * opens onto a different floor each time.
 *
 * To add a room: drop its screenshot into /public, add one entry below (the
 * order is the floor order, bottom first) and translate its copy keys in
 * src/i18n/*. The door picks it up as a new floor automatically.
 */

/** which glyph sits on the door plate, beside the coordinate */
export type RoomIcon = 'wand' | 'orb' | 'card';
/** which ornament is inlaid in the middle of each leaf */
export type RoomMotif = 'flower' | 'moon' | 'star';

export interface Room {
  id: string;
  /** landmark id whose detail card hosts this door */
  landmarkId: string;
  href: string;
  /** real screenshot of the room, shown inside the door */
  shot: string;
  /** tint behind the screenshot while it loads (matches the room's palette) */
  accent: string;
  Icon: RoomIcon;
  motif: RoomMotif;
  titleKey: string;
  /** the name on the floor buttons and the dial, when it differs from the title */
  floorKey?: string;
  descKey: string;
  /** folds into the minute tick stamped on the door plate each day */
  coordSeed: number;
}

export const ROOMS: Room[] = [
  {
    id: 'magic-room',
    landmarkId: 'magic-house',
    href: 'https://magic-room.summercommences.com/',
    shot: '/room-magic-shot.jpg',
    accent: '#e6e8f4',
    Icon: 'wand',
    motif: 'flower',
    titleKey: 'rooms.magicRoom.title',
    descKey: 'rooms.magicRoom.desc',
    coordSeed: 3,
  },
  {
    id: 'tower-study',
    landmarkId: 'magic-house',
    href: 'https://tower-study.summercommences.com/',
    shot: '/room-tower-shot.jpg',
    accent: '#f6eedb',
    Icon: 'orb',
    motif: 'moon',
    titleKey: 'rooms.towerStudy.title',
    descKey: 'rooms.towerStudy.desc',
    coordSeed: 7,
  },
  {
    id: 'oracle-inn',
    landmarkId: 'magic-house',
    href: 'https://oracle-inn.summercommences.com/',
    shot: '/room-oracle-shot.jpg',
    accent: '#2b1f33',
    Icon: 'card',
    motif: 'star',
    titleKey: 'rooms.oracleInn.title',
    floorKey: 'rooms.oracleInn.floor',
    descKey: 'rooms.oracleInn.desc',
    coordSeed: 11,
  },
];

export const roomsFor = (landmarkId: string): Room[] =>
  ROOMS.filter((r) => r.landmarkId === landmarkId);

/** floor numerals, ground floor first */
export const FLOOR_NUMERALS = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ'];

const mod = (a: number, b: number) => ((a % b) + b) % b;
const utcDay = () => Math.floor(Date.now() / 86_400_000);

/**
 * Which floor the front door stops at today: the same for everyone on the
 * same day, and folded out of the date so the floors look scattered rather
 * than taking turns in order.
 */
export const floorToday = (floors: number): number => mod(utcDay() * 7 + 3, Math.max(1, floors));

/** the minute tick on the door plate (the °…′ after the floor), also daily */
export const tickToday = (seed: number): string =>
  String(mod(utcDay() * 31 + seed * 17, 60)).padStart(2, '0');
