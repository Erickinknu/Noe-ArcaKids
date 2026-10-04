declare const __dirname: string;
declare function require(id: string): unknown;

type FsModule = {
  readdirSync: (dir: string) => string[];
  readFileSync: (file: string, encoding: 'utf8') => string;
  statSync: (file: string) => { isDirectory: () => boolean };
};
type PathModule = {
  join: (...parts: string[]) => string;
  relative: (from: string, to: string) => string;
  sep: string;
};

const fs = require('node:fs') as FsModule;
const path = require('node:path') as PathModule;

const APP_DIR = path.join(__dirname, '..', '..', 'app');

function collectTsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      out.push(...collectTsxFiles(full));
    } else if (full.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

describe('Animated + Pressable safety (regression: tab Hijos crashea la app)', () => {
  const files = collectTsxFiles(APP_DIR);

  it('encuentra pantallas en app/ para poder analizarlas', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((f) => [path.relative(APP_DIR, f).split(path.sep).join('/'), f]))(
    '%s no envuelve Pressable en un componente animado',
    (_name: string, file: string) => {
      const source = fs.readFileSync(file, 'utf8');

      // El crash nativo viene de crear un componente compuesto animado sobre
      // Pressable y montar un estilo de worklet sobre el. El patron seguro es
      // Animated.View por fuera + Pressable plano por dentro (ver ui/button).
      expect(source).not.toMatch(/createAnimatedComponent\(\s*Pressable\s*\)/);
      expect(source).not.toMatch(/Animated\.createAnimatedComponent\(/);
    }
  );
});