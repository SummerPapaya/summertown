/**
 * Permanent exhibitions — the standing collection of web projects shown on
 * a landmark's detail card (the Pearl Gallery curates them today).
 *
 * To exhibit a new project: drop its poster screenshot into /public,
 * add one entry below, and translate the three copy keys in src/i18n/*.
 * The detail card picks it up automatically — no component edits.
 */
import { Moon, type LucideIcon } from 'lucide-react';

export interface Exhibition {
  id: string;
  /** landmark id whose detail card hosts this exhibition */
  landmarkId: string;
  href: string;
  /** hand-drawn cover shown on the card — matches the town's illustration style */
  poster: string;
  /**
   * Real screenshot of the project, revealed on hover behind a curtain wipe.
   * Optional: without it the card simply shows the illustration.
   */
  shot?: string;
  /** tint behind the poster while it loads (matches the project's palette) */
  accent: string;
  Icon: LucideIcon;
  titleKey: string;
  descKey: string;
  /** tiny corner tag, e.g. 诗乐 · 互动 */
  tagKey: string;
}

export const EXHIBITIONS: Exhibition[] = [
  {
    id: 'moon',
    landmarkId: 'gallery',
    href: 'https://moon.summercommences.com/',
    poster: '/exhibition-moon-cover.jpg',
    /* Actual first screen of the site, pulled down like a curtain on hover. */
    shot: '/exhibition-moon-shot.jpg',
    accent: '#332e74',
    Icon: Moon,
    titleKey: 'exhibitions.moon.title',
    descKey: 'exhibitions.moon.desc',
    tagKey: 'exhibitions.moon.tag',
  },
];

export const exhibitionsFor = (landmarkId: string): Exhibition[] =>
  EXHIBITIONS.filter((e) => e.landmarkId === landmarkId);
