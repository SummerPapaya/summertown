/* ---------- signature easings (design.md §5) ---------- */
export const EASE_SQUASH = [0.22, 1.2, 0.36, 1] as [number, number, number, number];
export const EASE_BACK_17 = [0.34, 1.7, 0.64, 1] as [number, number, number, number];
export const EASE_BACK_2 = [0.34, 2, 0.64, 1] as [number, number, number, number];
export const EASE_BACK_156 = [0.34, 1.56, 0.64, 1] as [number, number, number, number];

/* ---------- doodle select ids (postcard dialog) ---------- */
export type DoodleId =
  | 'shell'
  | 'lighthouse'
  | 'apple'
  | 'windbell'
  | 'cat'
  | 'dog'
  | 'lily'
  | 'wave';

export const DOODLES: { id: DoodleId; labelKey: string }[] = [
  { id: 'shell', labelKey: 'journal.postcards.dialog.doodles.0' },
  { id: 'lighthouse', labelKey: 'journal.postcards.dialog.doodles.1' },
  { id: 'apple', labelKey: 'journal.postcards.dialog.doodles.2' },
  { id: 'windbell', labelKey: 'journal.postcards.dialog.doodles.3' },
  { id: 'cat', labelKey: 'journal.postcards.dialog.doodles.4' },
  { id: 'dog', labelKey: 'journal.postcards.dialog.doodles.5' },
  { id: 'lily', labelKey: 'journal.postcards.dialog.doodles.6' },
  { id: 'wave', labelKey: 'journal.postcards.dialog.doodles.7' },
];
