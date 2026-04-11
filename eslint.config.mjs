import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		ignores: [
			'dist/**',
			'node_modules/**',
			'conversions/**',
			'extra/**',
			'maps/**',
			'assets/**',
			'docs/**',
		],
	},
	{
		// Full lint for tests and scripts
		files: ['tests/**/*.ts', 'scripts/**/*.ts'],
		extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
			],
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-require-imports': 'off',
			eqeqeq: ['error', 'always'],
			'no-constant-condition': 'error',
		},
	},
	{
		// TSTL caveat rules for game source code.
		// We don't extend recommended configs here because src/ uses WC3 engine
		// globals that ESLint cannot resolve. Instead we enforce only the rules
		// that prevent TSTL-specific bugs (see https://typescripttolua.github.io/docs/caveats/).
		files: ['src/**/*.ts'],
		languageOptions: {
			parser: tseslint.parser,
		},
		rules: {
			// Lua has no `null` — both `null` and `undefined` transpile to `nil`.
			// Prefer `undefined` to accurately represent the Lua runtime.
			'no-restricted-syntax': [
				'error',
				{
					selector: 'Literal[raw="null"]',
					message: 'Use `undefined` instead of `null`. TSTL transpiles both to Lua `nil`, but `undefined` is idiomatic for TSTL codebases.',
				},
			],
			// TSTL treats == and === identically (Lua only has ==).
			// Enforce === to keep code explicit.
			eqeqeq: ['error', 'always'],
		},
	},
);
