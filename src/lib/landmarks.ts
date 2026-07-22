/**
 * Summer Town — landmark registry.
 * World coordinate space: 2400 x 1680 (canvas extended +80 at the northern sea edge).
 * Anchors + zoom factors from home.md §2.2; copy from home.md §5.
 */

export type FilterId = 'all' | 'culture' | 'food' | 'stay' | 'magic' | 'isle';

export interface LandmarkFact {
  icon: string; // lucide icon key rendered by the detail card
  text: string;
}

export interface Landmark {
  id: string;
  name: string;
  chip: string;
  filter: Exclude<FilterId, 'all'>;
  accent: string;
  whisper: string;
  tagline: string;
  lore: string;
  facts: LandmarkFact[];
  img: string; // map cutout in /public
  scene: string; // detail scene in /public
  anchor: { x: number; y: number };
  zoom: number;
  /** world-px display width of the cutout */
  w: number;
}

export const WORLD = { w: 2400, h: 1680 } as const;

export const LANDMARKS: Landmark[] = [
  {
    id: 'town-hall',
    name: 'Town Hall & Central Garden',
    chip: 'Heart of Town',
    filter: 'culture',
    accent: '#FFB37E',
    whisper: 'the heart goes tick-tock',
    tagline: 'Where every summer officially begins.',
    lore: 'The clock on the tower runs ten minutes slow on purpose, so nobody in Summer Town is ever truly late. Below it, the Central Garden faces the ocean — every path in town secretly leads back to its fountain.',
    facts: [
      { icon: 'clock', text: 'Clock strikes 13 on the first day of summer' },
      { icon: 'flower', text: 'Gardenkeeper: Mrs. Marigold' },
      { icon: 'sparkles', text: 'Wish coins fund the fireworks' },
    ],
    img: '/b-townhall.png',
    scene: '/scene-townhall.png',
    anchor: { x: 1650, y: 418 },
    zoom: 3.0,
    w: 330,
  },
  {
    id: 'theater',
    name: 'The Seashell Theater',
    chip: 'Culture',
    filter: 'culture',
    accent: '#FF9B9B',
    whisper: 'tonight: the moon plays itself',
    tagline: 'Plays performed inside a shell.',
    lore: "An amphitheater carved into a giant scallop; at dusk the shell hums the audience's applause back to the sea. Friday plays are free if you bring your own cushion.",
    facts: [
      { icon: 'theater', text: 'Season: May–September' },
      { icon: 'waves', text: 'Acoustics by the tide itself' },
      { icon: 'ticket', text: 'Usher: a very serious seagull' },
    ],
    img: '/b-theater.png',
    scene: '/scene-theater.png',
    anchor: { x: 1080, y: 640 },
    zoom: 3.4,
    w: 300,
  },
  {
    id: 'livehouse',
    name: 'The Gullwing Livehouse',
    chip: 'Culture · Night',
    filter: 'culture',
    accent: '#FF8FAB',
    whisper: 'the floor is already dancing',
    tagline: 'Loud heart, soft walls.',
    lore: 'A round little venue with a vinyl roof; bands play until the candles give up. Legend says the bassist of The Sandpipers once played a note so low the tide came in early.',
    facts: [
      { icon: 'guitar', text: 'Open mic: every tide-turn (Thursdays)' },
      { icon: 'flame', text: 'Capacity: 88 cozy souls' },
      { icon: 'cup', text: 'House drink: fizzy rose lemonade' },
    ],
    img: '/b-livehouse.png',
    scene: '/scene-livehouse.png',
    anchor: { x: 2230, y: 780 },
    zoom: 3.4,
    w: 280,
  },
  {
    id: 'store',
    name: 'Nook & Cranny General Store',
    chip: 'Food & Goods',
    filter: 'food',
    accent: '#8FD3A8',
    whisper: 'we have exactly that',
    tagline: "If we don't have it, you don't need it.",
    lore: 'Sells fishing nets, watermelon, kite string, spare buttons and exactly one mysterious key nobody has identified. Biscuit the cat supervises from the warmest crate.',
    facts: [
      { icon: 'cat', text: 'Manager: Biscuit (cat)' },
      { icon: 'apple', text: 'Watermelon day: Sunday' },
      { icon: 'key', text: 'The key is not for sale.' },
    ],
    img: '/b-store.png',
    scene: '/scene-store.png',
    anchor: { x: 1100, y: 450 },
    zoom: 3.4,
    w: 310,
  },
  {
    id: 'gallery',
    name: 'The Pearl Gallery',
    chip: 'Culture',
    filter: 'culture',
    accent: '#FFC3D0',
    whisper: 'please touch the art gently with your eyes',
    tagline: 'Small rooms, enormous feelings.',
    lore: 'Three stacked pink cubes showing whatever the sea inspired this month — driftwood mobiles, cloud studies, the annual Paintings of Paintings of the Pier exhibition.',
    facts: [
      { icon: 'image', text: 'Free entry, always' },
      { icon: 'palette', text: 'Roof sketching at golden hour' },
      { icon: 'trophy', text: "Winner of 'Most Photogenic Staircase'" },
    ],
    img: '/b-gallery.png',
    scene: '/scene-gallery.png',
    anchor: { x: 1885, y: 660 },
    zoom: 3.4,
    w: 290,
  },
  {
    id: 'coffee',
    name: 'Café Seabreeze',
    chip: 'Food',
    filter: 'food',
    accent: '#D9A066',
    whisper: 'the foam today is excellent',
    tagline: 'Sea-salt lattes, cloud-soft chairs.',
    lore: 'The shop is shaped like a cup because the founder lost a bet — and won a legend. The terrace umbrellas tilt themselves toward the best view, allegedly unassisted.',
    facts: [
      { icon: 'coffee', text: 'Signature: sea-salt latte' },
      { icon: 'croissant', text: 'Croissants land at 7:04 sharp' },
      { icon: 'book', text: 'Borrow-a-book shelf: take one, leave one' },
    ],
    img: '/b-coffee.png',
    scene: '/scene-coffee.png',
    anchor: { x: 1070, y: 1120 },
    zoom: 3.4,
    w: 300,
  },
  {
    id: 'radio',
    name: 'Summer FM 105.5',
    chip: 'On Air',
    filter: 'culture',
    accent: '#F4B942',
    whisper: "you're listening right now",
    tagline: 'The station the gulls tune in to.',
    lore: 'Broadcasts from a butter-yellow hut under a candy-striped tower: tide reports, birthday shout-outs, and the 6pm Golden Hour Mix. If the beacon glows, a request is playing.',
    facts: [
      { icon: 'mic', text: 'DJ: Summer' },
      { icon: 'radio', text: 'Frequency: 105.5' },
      { icon: 'sunset', text: '6pm mix: requests welcome' },
    ],
    img: '/b-radio.png',
    scene: '/scene-radio.png',
    anchor: { x: 1400, y: 310 },
    zoom: 3.2,
    w: 300,
  },
  {
    id: 'library',
    name: 'The Tidepool Library',
    chip: 'Culture',
    filter: 'culture',
    accent: '#7EC8E3',
    whisper: 'shhh, the books are napping',
    tagline: 'Stories stacked to the weather vane.',
    lore: 'A tower built like a pile of giant books; the top floor only lends books about the moon. Overdue fees are paid in seashells, one per week, pretty ones preferred.',
    facts: [
      { icon: 'book', text: 'Open till the stars clock in' },
      { icon: 'shell', text: 'Late fee: 1 shell' },
      { icon: 'moon', text: 'Moon section: top floor, ladder provided' },
    ],
    img: '/b-library.png',
    scene: '/scene-library.png',
    anchor: { x: 1385, y: 180 },
    zoom: 3.4,
    w: 290,
  },
  {
    id: 'design-lab',
    name: 'Paper Boat Design Lab',
    chip: 'Make',
    filter: 'culture',
    accent: '#5EC2BC',
    whisper: 'prototype #47 floats!',
    tagline: "Where the town's kites, posters & boats are born.",
    lore: 'A glass studio smelling of pencil shavings and salt. Every June they launch a fleet of experimental paper boats from the pier; the record holder sailed to Windbell Isle twice.',
    facts: [
      { icon: 'pencil', text: 'Drop-in sketch nights: Wednesdays' },
      { icon: 'sailboat', text: 'Fleet launch: June 1st' },
      { icon: 'medal', text: 'Motto: "Fold, float, repeat."' },
    ],
    img: '/b-designlab.png',
    scene: '/scene-designlab.png',
    anchor: { x: 2120, y: 560 },
    zoom: 3.4,
    w: 290,
  },
  {
    id: 'apple-cottage',
    name: 'The Apple Cottage',
    chip: 'Food · Home',
    filter: 'food',
    accent: '#FF7B6B',
    whisper: "someone's baking pie!",
    tagline: 'An apple a house.',
    lore: "Yes, it is shaped like an apple. No, the oven is not in the core — it's in the kitchen, thank you. Granny Pip bakes one pie per day; the smell is the town's unofficial 4 o'clock bell.",
    facts: [
      { icon: 'pie', text: "Pie o'clock: 4pm" },
      { icon: 'apple', text: 'Orchard: help yourself to one' },
      { icon: 'leaf', text: 'The leaf on the roof is real, somehow' },
    ],
    img: '/b-apple.png',
    scene: '/scene-apple.png',
    anchor: { x: 2050, y: 430 },
    zoom: 3.6,
    w: 260,
  },
  {
    id: 'magic-house',
    name: 'The Magic House',
    chip: 'Magic',
    filter: 'magic',
    accent: '#9B8CE8',
    whisper: 'the stairs decide where you go',
    tagline: 'Stairs to nowhere, doors to somewhere.',
    lore: 'A tilted tower of mismatched rooms held together by habit and mild sorcery. The floating front door opens onto a different floor each visit; the resident witch, Mistral, insists this is a feature.',
    facts: [
      { icon: 'sparkles', text: 'Tours: whenever the door agrees' },
      { icon: 'cat', text: 'Deputy: Umbra the cat' },
      { icon: 'wand', text: 'Do not lick the sparkles' },
    ],
    img: '/b-magic.png',
    scene: '/scene-magic.png',
    anchor: { x: 2230, y: 930 },
    zoom: 3.6,
    w: 280,
  },
  {
    id: 'hotel',
    name: 'Hotel Horizon',
    chip: 'Stay',
    filter: 'stay',
    accent: '#FFC9A3',
    whisper: 'every balcony faces the sunset',
    tagline: 'Sleep where the sky does.',
    lore: 'A tiered peach confection of a hotel with a star-shaped pool and a lobby scented with sunscreen and jasmine. Every balcony was argued into facing the horizon; the architect retired undefeated.',
    facts: [
      { icon: 'bell', text: '24 rooms, 24 sunsets' },
      { icon: 'star', text: 'Star pool: heated by enthusiasm' },
      { icon: 'luggage', text: 'Bellhop: retired pelican named Gus' },
    ],
    img: '/b-hotel.png',
    scene: '/scene-hotel.png',
    anchor: { x: 1806, y: 890 },
    zoom: 3.0,
    w: 340,
  },
  {
    id: 'villas',
    name: 'The Three Villas',
    chip: 'Stay',
    filter: 'stay',
    accent: '#BDEBD2',
    whisper: 'bunting is load-bearing',
    tagline: 'Mint, Lilac & Butter — pick your flavor.',
    lore: 'Three sister villas sharing one garden, one lemon tree, and an eternal croquet rivalry. Rent one, or rent all three and invent a family.',
    facts: [
      { icon: 'lemon', text: 'The lemon tree is communal' },
      { icon: 'trophy', text: 'Croquet: Sundays, fiercely' },
      { icon: 'home', text: 'Bookings via the General Store (of course)' },
    ],
    img: '/b-villas.png',
    scene: '/scene-villas.png',
    anchor: { x: 2310, y: 660 },
    zoom: 3.2,
    w: 300,
  },
  {
    id: 'windbell-isle',
    name: 'Windbell Isle',
    chip: 'Isle',
    filter: 'isle',
    accent: '#FFDD94',
    whisper: 'listen…',
    tagline: "The town's quieter half.",
    lore: 'Past the Long Pier, an isle of white lilies of the valley. The windbell pavilion plays the weather, Sunset Point applauds the sun, and the lighthouse keeps one glowing eye on it all.',
    facts: [
      { icon: 'bell', text: 'The bells ring themselves' },
      { icon: 'sunset', text: 'Sunset applause: nightly, bring hands' },
      { icon: 'lighthouse', text: 'The light has never missed a night' },
    ],
    img: '/i-pavilion.png',
    scene: '/scene-isle.png',
    anchor: { x: 430, y: 900 },
    zoom: 2.2,
    w: 560,
  },
];

export const PIER = {
  id: 'long-pier',
  name: 'The Long Pier',
  whisper: '312 planks, 1 secret',
  line: 'Locals race the tide to the isle. The record is 44 seconds; the crab holds it.',
  anchor: { x: 820, y: 930 },
};

export const FILTERS: { id: FilterId; label: string; accent: string }[] = [
  { id: 'all', label: 'All', accent: '#7EC8E3' },
  { id: 'culture', label: 'Culture', accent: '#FF9B9B' },
  { id: 'food', label: 'Food', accent: '#8FD3A8' },
  { id: 'stay', label: 'Stay', accent: '#FFC9A3' },
  { id: 'magic', label: 'Magic', accent: '#9B8CE8' },
  { id: 'isle', label: 'Isle', accent: '#FFDD94' },
];

export const byId = (id: string | null | undefined) =>
  LANDMARKS.find((l) => l.id === id);
