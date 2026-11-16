import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'node:url';

const tsconfigRootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/coverage/**',
    '**/test-results/**',
    '**/playwright-report/**',
    '**/playwright/.cache/**',
    '**/.artifact-work/**',
    '.npm-cache/**',
    'video/**',
  ]),
  { linterOptions: { reportUnusedDisableDirectives: 'error' } },
  {
    name: 'node-scripts-and-configs',
    files: ['**/*.{js,cjs,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    name: 'typescript-common',
    files: ['backend/**/*.ts', 'frontend/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
  {
    name: 'backend-typescript-and-tests',
    files: ['backend/**/*.ts'],
    languageOptions: {
      globals: globals.node,
      parserOptions: { project: ['./backend/tsconfig.spec.json'], tsconfigRootDir },
    },
    // Decorator metadata needs value imports for Nest dependency injection.
    rules: { '@typescript-eslint/consistent-type-imports': 'off' },
  },
  {
    name: 'frontend-typescript-projects',
    files: ['frontend/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: ['./frontend/tsconfig.json', './frontend/tsconfig.test.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    name: 'react-browser',
    files: ['frontend/src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
  },
  {
    name: 'frontend-tooling-and-tests',
    files: ['frontend/*.ts', 'frontend/test/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
);
