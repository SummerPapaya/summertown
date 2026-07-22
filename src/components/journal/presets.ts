/* ---------- signature easings (design.md §5) ---------- */
export const EASE_SQUASH = [0.22, 1.2, 0.36, 1] as [number, number, number, number];
export const EASE_BACK_17 = [0.34, 1.7, 0.64, 1] as [number, number, number, number];
export const EASE_BACK_2 = [0.34, 2, 0.64, 1] as [number, number, number, number];
export const EASE_BACK_156 = [0.34, 1.56, 0.64, 1] as [number, number, number, number];

/* ---------- doodle select ids (postcard dialog) ---------- */
export type DoodleId = 'shell' | 'lighthouse' | 'apple' | 'windbell';

export const DOODLES: { id: DoodleId; label: string }[] = [
  { id: 'shell', label: 'Seashell' },
  { id: 'lighthouse', label: 'Lighthouse' },
  { id: 'apple', label: 'Apple' },
  { id: 'windbell', label: 'Windbell' },
];
