import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

function findSourceFiles(dir: string): string[] {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	const files: string[] = [];

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...findSourceFiles(fullPath));
		} else if (entry.isFile() && fullPath.endsWith('.ts')) {
			files.push(path.normalize(fullPath));
		}
	}

	return files;
}

function hasRuntimeImport(importClause: ts.ImportClause | undefined): boolean {
	if (!importClause) return true;
	if (importClause.isTypeOnly) return false;
	if (importClause.name) return true;
	if (!importClause.namedBindings) return false;
	if (ts.isNamespaceImport(importClause.namedBindings)) return true;

	return importClause.namedBindings.elements.some((element) => !element.isTypeOnly);
}

function resolveSourceImport(sourceFile: string, specifier: string, rootDir: string, sourceFiles: Set<string>): string | undefined {
	const candidates: string[] = [];

	if (specifier.startsWith('.')) {
		const base = path.resolve(path.dirname(sourceFile), specifier);
		candidates.push(`${base}.ts`, path.join(base, 'index.ts'));
	} else if (specifier.startsWith('src/')) {
		const base = path.join(rootDir, specifier);
		candidates.push(`${base}.ts`, path.join(base, 'index.ts'));
	}

	return candidates.map((candidate) => path.normalize(candidate)).find((candidate) => sourceFiles.has(candidate));
}

function buildRuntimeImportGraph(rootDir: string): Map<string, string[]> {
	const srcDir = path.join(rootDir, 'src');
	const sourceFiles = new Set(findSourceFiles(srcDir));
	const graph = new Map<string, string[]>();

	for (const file of sourceFiles) {
		const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
		const imports: string[] = [];

		for (const statement of source.statements) {
			if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
			if (!hasRuntimeImport(statement.importClause)) continue;

			const resolved = resolveSourceImport(file, statement.moduleSpecifier.text, rootDir, sourceFiles);
			if (resolved) imports.push(resolved);
		}

		graph.set(file, imports);
	}

	return graph;
}

function findStronglyConnectedComponents(graph: Map<string, string[]>): string[][] {
	let index = 0;
	const indices = new Map<string, number>();
	const lowlinks = new Map<string, number>();
	const stack: string[] = [];
	const onStack = new Set<string>();
	const components: string[][] = [];

	function visit(node: string): void {
		indices.set(node, index);
		lowlinks.set(node, index);
		index++;
		stack.push(node);
		onStack.add(node);

		for (const dependency of graph.get(node) ?? []) {
			if (!indices.has(dependency)) {
				visit(dependency);
				lowlinks.set(node, Math.min(lowlinks.get(node)!, lowlinks.get(dependency)!));
			} else if (onStack.has(dependency)) {
				lowlinks.set(node, Math.min(lowlinks.get(node)!, indices.get(dependency)!));
			}
		}

		if (lowlinks.get(node) !== indices.get(node)) return;

		const component: string[] = [];
		let current: string | undefined;
		do {
			current = stack.pop();
			if (!current) break;
			onStack.delete(current);
			component.push(current);
		} while (current !== node);

		components.push(component);
	}

	for (const node of graph.keys()) {
		if (!indices.has(node)) visit(node);
	}

	return components;
}

describe('runtime import cycles', () => {
	it('keeps the frame scoreboard outside runtime import cycles', () => {
		const rootDir = path.resolve(__dirname, '..');
		const graph = buildRuntimeImportGraph(rootDir);
		const target = path.normalize(path.join(rootDir, 'src/app/scoreboard/frame-scoreboard.ts'));
		const component = findStronglyConnectedComponents(graph).find((items) => items.includes(target));

		expect(component?.map((file) => path.relative(rootDir, file).replace(/\\/g, '/')).sort()).toEqual([
			'src/app/scoreboard/frame-scoreboard.ts',
		]);
	});
});
