declare const __dirname: string;
declare function require(id: string): unknown;

type FsModule = {
  readFileSync: (file: string, encoding: 'utf8') => string;
};
type PathModule = {
  join: (...parts: string[]) => string;
};

const fs = require('node:fs') as FsModule;
const path = require('node:path') as PathModule;

const MOTION_FILE = path.join(
  __dirname,
  '..',
  'features',
  'children',
  'motion',
  'children-motion.ts'
);
const SKELETON_FILE = path.join(__dirname, '..', 'components', 'ui', 'skeleton.tsx');

describe('helpers de animacion usados en worklets (regression: tab Hijos crashea la app)', () => {
  it('skeletonPulse esta marcada como worklet para poder correr en el hilo de UI', () => {
    const source = fs.readFileSync(MOTION_FILE, 'utf8');

    // `skeleton.tsx` invoca `skeletonPulse` dentro de `useAnimatedStyle`. Si la
    // funcion no es worklet, Reanimated lanza en el hilo de UI y la app se cierra.
    expect(source).toMatch(/function skeletonPulse\([\s\S]*?\{\s*['"]worklet['"];/);
  });

  it('skeleton.tsx sigue invocando skeletonPulse desde un worklet (motivo del guard)', () => {
    const source = fs.readFileSync(SKELETON_FILE, 'utf8');

    expect(source).toMatch(/useAnimatedStyle\([\s\S]*?skeletonPulse\(/);
  });
});
