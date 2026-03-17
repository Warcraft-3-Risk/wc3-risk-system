import { AdjacencyMap } from 'src/configs/adjacency/adjacency-types';
import { debugPrint } from 'src/app/utils/debug-print';
import { DC } from 'src/configs/game-settings';

export class AdjacencyGraph {
	private map: AdjacencyMap | null;

	constructor(adjacencyMap: AdjacencyMap | null) {
		this.map = adjacencyMap;

		if (!adjacencyMap) {
			debugPrint('[AdjacencyGraph] No adjacency data provided', DC.bot);
			return;
		}

		const countryCount = Object.keys(adjacencyMap).length;

		// Validate symmetry: if A→B exists, B→A must also exist
		for (const [country, data] of Object.entries(adjacencyMap)) {
			for (const neighbor of data.land) {
				const neighborData = adjacencyMap[neighbor];
				if (!neighborData) {
					debugPrint(`[AdjacencyGraph] WARNING: neighbor '${neighbor}' of '${country}' not found in map`, DC.bot);
				} else if (!neighborData.land.includes(country)) {
					debugPrint(`[AdjacencyGraph] WARNING: asymmetric adjacency: ${country} → ${neighbor}`, DC.bot);
				}
			}
		}

		debugPrint(`[AdjacencyGraph] Loaded with ${countryCount} countries`, DC.bot);
	}

	public hasData(): boolean {
		return this.map !== null;
	}

	public getNeighbors(country: string): string[] {
		if (!this.map) return [];
		const data = this.map[country];
		return data ? data.land : [];
	}

	public areAdjacent(a: string, b: string): boolean {
		return this.getNeighbors(a).includes(b);
	}
}
