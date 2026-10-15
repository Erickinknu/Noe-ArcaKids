const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  { ignores: ['.expo/**', 'android/**', 'ios/**', 'dist/**', 'web-build/**'] },
  expoConfig,
  prettierConfig,
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
]);
