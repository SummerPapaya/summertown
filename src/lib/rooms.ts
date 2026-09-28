/**
 * Front doors — the little rooms you can push into from a landmark's detail
 * card. The Magic House hangs two of them side by side, echoing its lore:
 * the floating front door opens onto a different floor each time.
 *
 * To add a room: drop its screenshot into /public, add one entry below and
 * translate its copy keys in src/i18n/*. The detail card picks it up
 * automatically.
 */

/** which glyph sits on the door plate, beside the coordinate */
export type RoomIcon = 'wand' | 'orb';
/** which ornament is inlaid in the middle of each leaf */
export type RoomMotif = 'flower' | 'moon';

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
  descKey: string;
  /** folds into the magic coordinate stamped on the door each day */
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
];

export const roomsFor = (landmarkId: string): Room[] =>
  ROOMS.filter((r) => r.landmarkId === landmarkId);

const LAYERS = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ'];

/**
 * The door carries a different magic coordinate every day — but the same one
 * for everyone on the same day, so it stays consistent per visit. Two parts:
 * a layer (whatever the roman numeral means is the door's business) and a
 * minute tick, both folded out of the date so they look scattered rather than
 * counting up in order.
 */
export const coordToday = (seed: number): { layer: string; tick: string } => {
  const day = Math.floor(Date.now() / 86_400_000);
  return {
    layer: LAYERS[(day * 7 + seed * 13) % LAYERS.length],
    tick: String((day * 31 + seed * 17) % 60).padStart(2, '0'),
  };
};
