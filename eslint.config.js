const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/**', '.expo/**'] },
  {
    files: ['scripts/**/*.mjs', 'tests/**/*.mjs'],
    languageOptions: { globals: { Buffer: 'readonly', process: 'readonly', console: 'readonly', URL: 'readonly', fetch: 'readonly' } },
  },
  // Logotip generatori ixtiyoriy paketni ishlatadi: npm i --no-save @resvg/resvg-js
  { files: ['scripts/brand.mjs'], rules: { 'import/no-unresolved': 'off' } },
]);
