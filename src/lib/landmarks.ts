/**
 * Summer Town — landmark registry.
 * World coordinate space: 2400 x 1680 (canvas extended +80 at the northern sea edge).
 * Anchors + zoom factors from home.md §2.2; copy from home.md §5.
 *
 * Display strings live in src/i18n/* — every copy field here is a dot-path key
 * resolved through useLanguage().t() at render time.
 */

export type FilterId = 'all' | 'culture' | 'food' | 'stay' | 'magic' | 'isle';

export interface LandmarkFact {
  icon: string; // lucide icon key rendered by the detail card
  textKey: string; // e.g. 'landmarks.townHall.facts.0'
}

export interface Landmark {
  id: string;
  nameKey: string;
  chipKey: string;
  filter: Exclude<FilterId, 'all'>;
  accent: string;
  whisperKey: string;
  taglineKey: string;
  loreKey: string;
  facts: LandmarkFact[];
  img: string; // map cutout in /public
  scene: string; // detail scene in /public
  anchor: { x: number; y: number };
  zoom: number;
  /** world-px display width of the cutout */
  w: number;
}

export const WORLD = { w: 2400, h: 1680 } as const;

const lm = (
  key: string,
  {
    factIcons,
    ...rest
  }: Omit<Landmark, 'nameKey' | 'chipKey' | 'whisperKey' | 'taglineKey' | 'loreKey' | 'facts'> & {
    factIcons: string[];
  },
): Landmark => ({
  ...rest,
  nameKey: `landmarks.${key}.name`,
  chipKey: `landmarks.${key}.chip`,
  whisperKey: `landmarks.${key}.whisper`,
  taglineKey: `landmarks.${key}.tagline`,
  loreKey: `landmarks.${key}.lore`,
  facts: factIcons.map((icon, i) => ({ icon, textKey: `landmarks.${key}.facts.${i}` })),
});

export const LANDMARKS: Landmark[] = [
  lm('townHall', {
    id: 'town-hall',
    filter: 'culture',
    accent: '#FFB37E',
    factIcons: ['clock', 'flower', 'sparkles'],
    img: '/b-townhall.png',
    scene: '/scene-townhall.png',
    anchor: { x: 1650, y: 418 },
    zoom: 3.0,
    w: 330,
  }),
  lm('theater', {
    id: 'theater',
    filter: 'culture',
    accent: '#FF9B9B',
    factIcons: ['theater', 'waves', 'ticket'],
    img: '/b-theater.png',
    scene: '/scene-theater.png',
    anchor: { x: 1080, y: 640 },
    zoom: 3.4,
    w: 300,
  }),
  lm('livehouse', {
    id: 'livehouse',
    filter: 'culture',
    accent: '#FF8FAB',
    factIcons: ['guitar', 'flame', 'cup'],
    img: '/b-livehouse.png',
    scene: '/scene-livehouse.png',
    anchor: { x: 2230, y: 780 },
    zoom: 3.4,
    w: 280,
  }),
  lm('store', {
    id: 'store',
    filter: 'food',
    accent: '#8FD3A8',
    factIcons: ['cat', 'apple', 'key'],
    img: '/b-store.png',
    scene: '/scene-store.png',
    anchor: { x: 1100, y: 450 },
    zoom: 3.4,
    w: 310,
  }),
  lm('gallery', {
    id: 'gallery',
    filter: 'culture',
    accent: '#FFC3D0',
    factIcons: ['image', 'palette', 'trophy'],
    img: '/b-gallery.png',
    scene: '/scene-gallery.png',
    anchor: { x: 1885, y: 660 },
    zoom: 3.4,
    w: 290,
  }),
  lm('coffee', {
    id: 'coffee',
    filter: 'food',
    accent: '#D9A066',
    factIcons: ['coffee', 'croissant', 'book'],
    img: '/b-coffee.png',
    scene: '/scene-coffee.png',
    anchor: { x: 1070, y: 1120 },
    zoom: 3.4,
    w: 300,
  }),
  lm('radio', {
    id: 'radio',
    filter: 'culture',
    accent: '#F4B942',
    factIcons: ['mic', 'radio', 'sunset'],
    img: '/b-radio.png',
    scene: '/scene-radio.png',
    anchor: { x: 1400, y: 310 },
    zoom: 3.2,
    w: 300,
  }),
  lm('library', {
    id: 'library',
    filter: 'culture',
    accent: '#7EC8E3',
    factIcons: ['book', 'shell', 'moon'],
    img: '/b-library.png',
    scene: '/scene-library.png',
    anchor: { x: 1385, y: 180 },
    zoom: 3.4,
    w: 290,
  }),
  lm('designLab', {
    id: 'design-lab',
    filter: 'culture',
    accent: '#5EC2BC',
    factIcons: ['pencil', 'sailboat', 'medal'],
    img: '/b-designlab.png',
    scene: '/scene-designlab.png',
    anchor: { x: 2120, y: 560 },
    zoom: 3.4,
    w: 290,
  }),
  lm('appleCottage', {
    id: 'apple-cottage',
    filter: 'food',
    accent: '#FF7B6B',
    factIcons: ['pie', 'apple', 'leaf'],
    img: '/b-apple.png',
    scene: '/scene-apple.png',
    anchor: { x: 2050, y: 430 },
    zoom: 3.6,
    w: 260,
  }),
  lm('magicHouse', {
    id: 'magic-house',
    filter: 'magic',
    accent: '#9B8CE8',
    factIcons: ['sparkles', 'cat', 'wand'],
    img: '/b-magic.png',
    scene: '/scene-magic.png',
    anchor: { x: 2230, y: 930 },
    zoom: 3.6,
    w: 280,
  }),
  lm('hotel', {
    id: 'hotel',
    filter: 'stay',
    accent: '#FFC9A3',
    factIcons: ['bell', 'star', 'luggage'],
    img: '/b-hotel.png',
    scene: '/scene-hotel.png',
    anchor: { x: 1806, y: 890 },
    zoom: 3.0,
    w: 340,
  }),
  lm('villas', {
    id: 'villas',
    filter: 'stay',
    accent: '#BDEBD2',
    factIcons: ['lemon', 'trophy', 'home'],
    img: '/b-villas.png',
    scene: '/scene-villas.png',
    anchor: { x: 2310, y: 660 },
    zoom: 3.2,
    w: 300,
  }),
  lm('windbellIsle', {
    id: 'windbell-isle',
    filter: 'isle',
    accent: '#FFDD94',
    factIcons: ['bell', 'sunset', 'lighthouse'],
    img: '/i-pavilion.png',
    scene: '/scene-isle.png',
    anchor: { x: 430, y: 900 },
    zoom: 2.2,
    w: 560,
  }),
];

export const PIER = {
  id: 'long-pier',
  nameKey: 'map.pier.name',
  whisperKey: 'map.pier.whisper',
  lineKey: 'map.pier.line',
  anchor: { x: 820, y: 930 },
};

export const FILTERS: { id: FilterId; labelKey: string; accent: string }[] = [
  { id: 'all', labelKey: 'filters.all', accent: '#7EC8E3' },
  { id: 'culture', labelKey: 'filters.culture', accent: '#FF9B9B' },
  { id: 'food', labelKey: 'filters.food', accent: '#8FD3A8' },
  { id: 'stay', labelKey: 'filters.stay', accent: '#FFC9A3' },
  { id: 'magic', labelKey: 'filters.magic', accent: '#9B8CE8' },
  { id: 'isle', labelKey: 'filters.isle', accent: '#FFDD94' },
];

export const byId = (id: string | null | undefined) =>
  LANDMARKS.find((l) => l.id === id);
