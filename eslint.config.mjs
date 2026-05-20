import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: [
      'out/**',
      'releases/**',
      'node_modules/**',
      'scripts/**',
      'src/renderer/template/dist/**',
      'src/renderer/template/src/core/**'
    ]
  },

  // TypeScript: parser, plugin, and recommended rules for TS/TSX files
  ...tsPlugin.configs['flat/recommended'],

  // React recommended rules
  reactPlugin.configs.flat.recommended,

  // React Hooks recommended rules
  reactHooksPlugin.configs.flat['recommended-latest'],

  // Global settings
  {
    settings: {
      react: { version: 'detect' }
    }
  },

  // Project overrides
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    rules: {
      // `any` is used deliberately for strict-mode workarounds in this codebase
      '@typescript-eslint/no-explicit-any': 'off',
      // Lazy require() is used for dynamic loading (prism languages, mermaid, etc.)
      '@typescript-eslint/no-require-imports': 'off',
      // tsconfig noUnusedLocals covers this; ESLint's version conflicts with TS's handling
      '@typescript-eslint/no-unused-vars': 'off',
      // `{}` is the idiomatic way to express "no props/state" in React class components
      '@typescript-eslint/no-empty-object-type': 'off',
      // `Function` type usage is consistent with the broader `any` policy in this codebase
      '@typescript-eslint/no-unsafe-function-type': 'off',
      // Ambient module declarations in types.ts use the `module` keyword deliberately
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/prefer-namespace-keyword': 'off',
      // Class components use legacy lifecycle methods — not being refactored in this pass
      'react/no-deprecated': 'off',
      // findDOMNode is used in class components that aren't being refactored in this pass
      'react/no-find-dom-node': 'off',
      // Arrow-function components don't have display names
      'react/display-name': 'off',
      // TypeScript handles prop type checking
      'react/prop-types': 'off',
      // Files that use JSX import React explicitly (`import * as React from 'react'`)
      'react/react-in-jsx-scope': 'off'
    }
  }
];
