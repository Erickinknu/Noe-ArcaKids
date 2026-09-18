import {
  appPlayStoreUrl,
  appWebSearchUrl,
  categoryForPackage,
  friendlyAppName,
} from '@/features/activity/utils/app-links';

describe('appPlayStoreUrl', () => {
  it('construye la URL de Google Play para un paquete', () => {
    expect(appPlayStoreUrl('com.instagram.android')).toBe(
      'https://play.google.com/store/apps/details?id=com.instagram.android'
    );
    expect(appPlayStoreUrl('el oscuro nombre')).toContain('el%20oscuro%20nombre');
  });
});

describe('appWebSearchUrl', () => {
  it('construye una búsqueda web con la etiqueta de la app', () => {
    const url = appWebSearchUrl('Chrome');
    expect(url).toBe('https://www.google.com/search?q=Chrome%20app');
  });
});

describe('categoryForPackage', () => {
  it('clasifica paquetes conocidos por categoría', () => {
    expect(categoryForPackage('com.instagram.android')?.key).toBe('social');
    expect(categoryForPackage('com.android.chrome')?.key).toBe('web');
    expect(categoryForPackage('com.roblox.client')?.key).toBe('games');
    expect(categoryForPackage('com.duolingo')?.key).toBe('education');
  });

  it('devuelve null para paquetes desconocidos', () => {
    expect(categoryForPackage('com.desconocida.app')).toBeNull();
  });
});

describe('friendlyAppName', () => {
  it('prefiere la etiqueta almacenada', () => {
    expect(friendlyAppName('com.android.chrome', 'Chrome Beta')).toBe('Chrome Beta');
  });

  it('reconoce paquetes populares sin etiqueta', () => {
    expect(friendlyAppName('com.google.android.youtube', null)).toBe('YouTube');
  });

  it('falla al último segmento del paquete', () => {
    expect(friendlyAppName('com.app.secret', null)).toBe('secret');
  });
});