import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		// Ignore everything except tests and scripts
		ignores: [
			'src/**',
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
		// Lint tests and scripts only — src/ targets Lua via TSTL and uses
		// WC3 engine globals that ESLint cannot resolve.
		files: ['tests/**/*.ts', 'scripts/**/*.ts'],
		extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
			],
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-require-imports': 'off',
			eqeqeq: ['error', 'always'],
			'no-constant-condition': 'error',
		},
	},
);
