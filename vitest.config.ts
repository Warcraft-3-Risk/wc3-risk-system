import { defineConfig } from 'vitest/config';
import * as path from 'path';

export default defineConfig({
	test: {
		include: ['tests/**/*.test.ts'],
	},
	resolve: {
		alias: {
			src: path.resolve(__dirname, 'src'),
		},
	},
});
