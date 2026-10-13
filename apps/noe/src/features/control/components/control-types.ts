/** App mínima que devuelve el servicio de control (packageName + appLabel). */
export interface ControlApp {
  packageName: string;
  appLabel: string;
}

export interface TopFreeTimeApp extends ControlApp {
  minutes: number;
}

export interface CategoryLists {
  tiempoLibre: ControlApp[];
  siempre: ControlApp[];
  noPermitidas: ControlApp[];
  sinClasificar: ControlApp[];
}

export interface TopFreeTime {
  top: TopFreeTimeApp[];
  restCount: number;
  usedMinutes: number;
  totalLimit: number | null;
}

export interface ChildHeader {
  battery: number | null;
  ringerMode: 'normal' | 'vibrate' | 'silent' | null;
  currentApp: string | null;
  lastSeen: string | null;
  online: boolean;
}

/**
 * Categorías de control tal como se guardan en BD (verificado en
 * control-service.getCategoryLists: el switch clasifica por estos literales;
 * 'free' es el pozo técnico "sin clasificar" de sync_child_apps).
 * Se pasan tal cual al setCategory existente de app-category-service
 * (su tipo AppCategory es más estrecho; el RPC acepta el literal).
 */
export type ControlCategory = 'tiempo_libre' | 'siempre' | 'no_permitida';
