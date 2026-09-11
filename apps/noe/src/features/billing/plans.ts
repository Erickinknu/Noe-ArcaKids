export type PlanId = 'free' | 'family' | 'family_annual';

export interface PlanCatalogEntry {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  features: string[];
  maxChildren: number | null; // null = unlimited
  maxBlockedApps: number | null; // null = unlimited
}

export const PLAN_CATALOG: PlanCatalogEntry[] = [
  {
    id: 'free',
    name: 'Gratuito',
    price: '$0',
    period: 'para siempre',
    features: ['1 hijo', 'Control básico de tiempo', '5 apps bloqueadas', 'Reportes semanales'],
    maxChildren: 1,
    maxBlockedApps: 5,
  },
  {
    id: 'family',
    name: 'Familia',
    price: '$4.99',
    period: '/mes',
    features: [
      'Hijos ilimitados',
      'Control avanzado',
      'Apps ilimitadas',
      'Reportes diarios',
      'Zonas seguras',
      'Modo estudio',
    ],
    maxChildren: null,
    maxBlockedApps: null,
  },
  {
    id: 'family_annual',
    name: 'Familia Anual',
    price: '$39.99',
    period: '/año',
    features: ['Todo de Familia', 'Ahorra 33%', 'Soporte prioritario', 'Nuevas funciones primero'],
    maxChildren: null,
    maxBlockedApps: null,
  },
];

export const DEFAULT_PLAN: PlanId = 'free';

export interface SubscriptionStatus {
  plan: PlanId;
  status: string;
  currentPeriodEnd: string | null;
  provider: string;
  productId: string;
}

export const FREE_MAX_CHILDREN = 1;
export const FREE_MAX_BLOCKED_APPS = 5;