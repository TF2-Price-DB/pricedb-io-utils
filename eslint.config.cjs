/**
 * PriceDB.io JavaScript Project - ESLint Configuration
 * Optimized for Node.js and browser JavaScript development
 * Compatible with Prettier, SonarQube, and VS Code extensions
 */

const js = require('@eslint/js');
const prettier = require('eslint-config-prettier');
const eslintPluginNode = require('eslint-plugin-n');
const eslintPluginImport = require('eslint-plugin-import');
const eslintPluginPromise = require('eslint-plugin-promise');
const eslintPluginSecurity = require('eslint-plugin-security');

module.exports = [
  js.configs.recommended,
  prettier,
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.github/workflows/*',
      '*.min.js'
    ],
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        module: 'writable',
        require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        fetch: 'readonly',
        Buffer: 'readonly',
        global: 'writable',
      },
    },
    plugins: {
      node: eslintPluginNode,
      import: eslintPluginImport,
      promise: eslintPluginPromise,
      security: eslintPluginSecurity,
    },
    rules: {
      // Core JavaScript quality rules
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-unused-private-class-members': 'error',
      'no-console': 'off', // Allow console for server-side logging
      'eqeqeq': 'error',
      'curly': 'error',
      'no-var': 'error',
      'prefer-const': 'warn',
      'no-duplicate-imports': 'error',

      // Node.js specific rules
      'node/no-unsupported-features/es-syntax': 'error',
      'node/no-missing-import': 'error',
      'node/no-extraneous-import': 'error',
      'node/no-unsupported-features/node-builtins': 'error',

      // Import/Export rules
      'import/no-unresolved': 'error',
      'import/export': 'error',
      'import/no-duplicates': 'error',
      'import/order': ['warn', {
        'groups': [
          'builtin',
          'external', 
          'internal',
          'parent',
          'sibling',
          'index'
        ],
        'newlines-between': 'always-and-inside-groups'
      }],

      // Promise handling
      'promise/always-return': 'warn',
      'promise/no-nesting': 'warn',
      'promise/no-promise-in-callback': 'warn',
      'promise/no-return-wrap': 'warn',

      // Security rules (minimal to avoid false positives)
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-unsafe-regex': 'error',
    },
  },
  
  // Browser-specific configuration for frontend files
  {
    files: ['public/**/*.js', 'client/**/*.js', 'frontend/**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'script',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
      },
    },
    rules: {
      // Disable Node.js specific rules for browser files
      'node/no-unsupported-features/es-syntax': 'off',
      'node/no-unsupported-features/node-builtins': 'off',
      'node/no-missing-import': 'off',
      'node/no-extraneous-import': 'off',
    },
  },
  
  // Test files configuration
  {
    files: ['**/*.test.js', '**/*.spec.js', 'test/**/*.js', 'tests/**/*.js'],
    rules: {
      'no-console': 'off',
      'node/no-unpublished-import': 'off',
    },
  },
];