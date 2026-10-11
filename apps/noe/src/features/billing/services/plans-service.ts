import { PLAN_CATALOG, type PlanCatalogEntry, type PlanId } from '../plans';
import { plansRepository } from '../repositories/plans-repository';

function formatPrice(cents: number): string {
  if (cents === 0) return '$0';
  const value = cents / 100;
  return `$${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
}

function intervalToPeriod(interval: 'month' | 'year'): string {
  return interval === 'year' ? '/a\u00f1o' : '/mes';
}

export const plansService = {
  /**
   * Cat\u00e1logo de planes le\u00eddo desde la tabla `plans` (fuente \u00fanica de verdad).
   * Si la red falla, cae al cat\u00e1logo local para no dejar la pantalla vac\u00eda.
   */
  async getCatalog(): Promise<PlanCatalogEntry[]> {
    try {
      const rows = await plansRepository.listActive();
      if (!rows.length) return PLAN_CATALOG;
      return rows.map((row) => {
        const fallback = PLAN_CATALOG.find((p) => p.id === row.slug);
        return {
          id: row.slug as PlanId,
          name: row.name,
          price: formatPrice(row.price_cents),
          priceCents: row.price_cents,
          period: row.price_cents === 0 ? 'para siempre' : intervalToPeriod(row.interval),
          features: fallback?.features ?? [],
          maxChildren: row.max_children,
          maxBlockedApps: fallback?.maxBlockedApps ?? null,
        };
      });
    } catch {
      return PLAN_CATALOG;
    }
  },
};
