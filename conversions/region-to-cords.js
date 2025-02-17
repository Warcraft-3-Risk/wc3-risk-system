function extractCoords(inputString) {
    const matches = inputString.match(/\((\-?\d+(\.\d+)?), (\-?\d+(\.\d+)?), (\-?\d+(\.\d+)?), (\-?\d+(\.\d+)?)\)/);
    if (!matches) {
        return null;
    }

    const x1 = parseFloat(matches[1]);
    const y1 = parseFloat(matches[3]);
    const x2 = parseFloat(matches[5]);
    const y2 = parseFloat(matches[7]);

    const x = (x1 + x2) / 2;
    const y = (y1 + y2) / 2;

    return { x, y };
}

function extractName(inputString) {
    const matches = inputString.match(/^gg_[a-zA-Z]+_(\w+)/);
    if (!matches) {
        return null;
    }
    return matches[1].replace(/_/g, ' ');
}

function processInput(inputString) {
    const name = extractName(inputString);
    const coords = extractCoords(inputString);

    if (!name || !coords) {
        console.error("Invalid input format");
        return;
    }

    const output = `
    name: '${name}',
    spawnerData: {
        unitData: { x: ${coords.x}, y: ${coords.y} },
    },`;
    
    console.log(output);
}

function processInputs(strings, ...values) {
    const combinedStrings = strings.reduce((result, string, i) => {
        return result + string + (values[i] || "");
    }, "");

    const inputs = combinedStrings.trim().split("\n");
    for (let input of inputs) {
        processInput(input.trim());
    }
}

//Example of how to do inputs
processInputs`
    gg_rct_Region_000 = Rect(-1984.0, -8640.0, -1728.0, -8384.0)
`;

