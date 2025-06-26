// region-to-cords.js

function extractCenter(input) {
	// Capture four numbers in order: left, right, bottom, top
	const m = input.match(/Rect\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/);
	if (!m) return null;

	const left = parseFloat(m[1]);
	const right = parseFloat(m[2]);
	const bottom = parseFloat(m[3]);
	const top = parseFloat(m[4]);

	return {
		x: (left + right) / 2,
		y: (bottom + top) / 2,
	};
}

function processLines(templateStrings, ...values) {
	// assemble the full text block from the tagged template
	const text = templateStrings
		.map((s, i) => s + (values[i] || ''))
		.join('')
		.trim();
	for (let line of text.split('\n')) {
		line = line.trim();
		if (!line) continue;

		const center = extractCenter(line);
		if (!center) {
			console.error('Invalid format:', line);
		} else {
			console.log(`{ x: ${center.x}, y: ${center.y} },`);
		}
	}
}

// ─── Example usage: ────────────────────────────────────
processLines`
    Rect(-7456.0, -7392, 7136.0, 7200.0)
    Rect(-32.0, 32.0, 7136.0, 7200.0)
    Rect(7392.0, 7456.0, 7136.0, 7200.0)
    Rect(-7456.0, -7392.0, 480.0, 544.0)
    Rect(-32.0, 32.0, 480.0, 544.0)
    Rect(7392.0, 7456.0, 480.0, 544.0)
    Rect(-7456.0, -7392.0, -6176.0, -6112.0)
    Rect(-32.0, 32.0, -6176.0, -6112.0)
    Rect(7392.0, 7456.0, -6176.0, -6112.0)
  `;
