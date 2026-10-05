import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.{js,ts,jsx,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // Custom rules can be added here
    },
  },
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.next/**', '**/build/**'],
  },
];