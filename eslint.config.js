import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import unicorn from 'eslint-plugin-unicorn'
import sonarjs from 'eslint-plugin-sonarjs'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import oxlint from 'eslint-plugin-oxlint'

/*
(1.) Replaces the unusable eslint-config-hardcore@49 (ESLint-8 / legacy .eslintrc format,
     missing peer plugins) with an ESLint-9-native strict flat config that achieves the same
     intent: typescript-eslint strictTypeChecked + stylisticTypeChecked supply the type-aware
     strictness, eslint-plugin-unicorn and eslint-plugin-sonarjs supply the high-signal code
     quality rules hardcore itself wrapped, and react-hooks guards hook correctness.
(2.) eslint-plugin-oxlint is spread LAST so it disables every ESLint rule that oxlint already
     enforces, preventing duplicate reports across the two linters that run in this project.
(3.) Type-aware linting is enabled via `projectService`, which resolves each file to its
     owning tsconfig (the app, the node tooling, or convex) automatically, so rules that need
     type information work across the whole repository without per-folder parser wiring.
(4.) A small override block reconciles the rule sets with this project's deliberate decisions:
     `null` is permitted because the data model uses explicit null over undefined,
     PascalCase component filenames are allowed, and abbreviation-expansion is left off so
     descriptive-but-conventional names (ctx, props) are not rewritten.

This configuration is the strict ESLint layer of a two-linter setup (oxlint runs first for
speed and breadth; ESLint runs the type-aware and quality rules here). It is intentionally
built from individually maintained, ESLint-9-compatible plugins rather than a meta-bundle, so
the toolchain stays upgradeable and no rule depends on an abandoned ESLint-8-only plugin.
Existing violations across the legacy codebase are expected and will be resolved
incrementally; the goal of this file is to make the strict rules run everywhere first.
*/

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'node_modules',
      'convex/_generated',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      ecmaVersion: 2024,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      unicorn,
      sonarjs,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...unicorn.configs.recommended.rules,
      ...sonarjs.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'unicorn/no-null': 'off',
      'unicorn/filename-case': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  ...oxlint.configs['flat/recommended'],
)
