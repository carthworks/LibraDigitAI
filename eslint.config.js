import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import unusedImports from 'eslint-plugin-unused-imports'

export default [
  { ignores: ['dist/**', 'node_modules/**', 'backend/**', 'release/**'] },
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: '18.2' } },
    plugins: { react, 'react-hooks': reactHooks, 'unused-imports': unusedImports },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': ['error', {
        varsIgnorePattern: '^(_|React$)', args: 'none', caughtErrors: 'none', ignoreRestSiblings: true,
      }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['electron/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: { ...globals.node } },
    rules: { ...js.configs.recommended.rules },
  },
  {
    files: ['*.config.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.node } },
    rules: { ...js.configs.recommended.rules },
  },
]
