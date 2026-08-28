// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    // DAT-97: screens depend on the repository layer, never on storage.
    // Anything under src/app is a route; if one needs data it goes through
    // `@/lib/repositories` (usually via the `useRepositories` hook), so the
    // SQLite engine stays swappable and a future sync engine has one seam to
    // slot into. Enforced here rather than left to review.
    files: ['src/app/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/db', '@/db/*', '**/db/sqlite', '**/db/drivers/*', 'expo-sqlite'],
              message:
                'Screens and components must go through @/lib/repositories (see docs/mobile.md); they never talk to SQLite directly.',
            },
          ],
        },
      ],
    },
  },
]);
