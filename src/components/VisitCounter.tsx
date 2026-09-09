import { useEffect, useState } from 'react';
import { Footprints } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

interface SiteStats {
  totalPv: number;
  totalUv: number;
  todayPv: number;
  todayUv: number;
}

/**
 * Self-hosted visit counter backed by the town Worker.
 *
 * Two calls on mount:
 *  - POST /api/visit  records this page view (fire-and-forget)
 *  - GET /api/stats/site  reads the running total
 *
 * Static builds (GitHub Pages) have no /api at all: both requests fail,
 * `total` stays null and the component renders nothing — so the footer
 * looks exactly like it did before the counter existed.
 */
export default function VisitCounter() {
  const { t } = useLanguage();
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;

    const path = `${window.location.pathname}${window.location.search}`;

    // keepalive lets the beacon survive an immediate navigation away
    void fetch(`/api/visit?path=${encodeURIComponent(path)}`, {
      method: 'POST',
      keepalive: true,
    }).catch(() => undefined);

    void fetch('/api/stats/site')
      .then((r) => (r.ok ? (r.json() as Promise<SiteStats>) : null))
      .then((data) => {
        if (alive && data && typeof data.totalPv === 'number') setTotal(data.totalPv);
      })
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, []);

  if (total == null) return null;

  return (
    <span className="inline-flex items-center gap-1.5">
      <Footprints className="h-3.5 w-3.5" aria-hidden />
      {t('footer.visitCount', { count: total })}
    </span>
  );
}
